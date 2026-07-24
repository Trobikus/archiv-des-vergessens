/**
 * ============================================================
 * FILE: core/services/auth-service.js – Authentication Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Verwaltung von Benutzer-Registrierung, Login, Logout & Session-Tokens
 * - Server-Synchronisation über NetworkService mit offline-fähiger Speicherung
 * - Gast-Konto Generierung & Migration in permanente SQLite-Server-Konten
 * - Verknüpfung mit EventBus & CloudManager für Fortschritts-Sync
 * ============================================================
 */

export class AuthService {
  /**
   * @param {import('../events/bus.js').default} eventBus
   * @param {import('../settings.js').default} [settingsManager]
   * @param {import('./network-service.js').NetworkService} [networkService]
   * @param {import('../persistence/cloud-manager.js').CloudManager} [cloudManager]
   */
  constructor(eventBus, settingsManager = null, networkService = null, cloudManager = null) {
    this._eventBus = eventBus;
    this._settingsManager = settingsManager;
    this._networkService = networkService;
    this._cloudManager = cloudManager;

    this._STORAGE_ACCOUNTS_KEY = 'archiv_auth_accounts';
    this._STORAGE_SESSION_KEY = 'archiv_auth_session';

    this._currentUser = null;
    this._sessionToken = null;
    this._pendingAuthResolves = {};

    this._initSession();
  }

  setNetworkService(networkService) {
    this._networkService = networkService;
  }

  setCloudManager(cloudManager) {
    this._cloudManager = cloudManager;
  }

  /**
   * Initialisiert die bestehende Session aus dem Speicher.
   */
  _initSession() {
    try {
      const rawSession = localStorage.getItem(this._STORAGE_SESSION_KEY);
      if (rawSession) {
        const sessionData = JSON.parse(rawSession);
        if (sessionData && sessionData.user && sessionData.token) {
          if (!sessionData.expiresAt || new Date(sessionData.expiresAt) > new Date()) {
            this._currentUser = sessionData.user;
            this._sessionToken = sessionData.token;
          } else {
            this.logout();
          }
        }
      }
    } catch (e) {
      console.error('[AuthService] Fehler beim Laden der Session:', e);
      this._currentUser = null;
      this._sessionToken = null;
    }

    if (!this._currentUser) {
      this.loginAsGuest();
    }
  }

  /**
   * Empfängt Server-Auth-Antworten vom NetworkService
   */
  handleServerAuthResponse(type, payload) {
    if (type === 'auth:verifyToken:success') {
      if (payload && payload.user) {
        this._currentUser = payload.user;
        this._sessionToken = payload.token || this._sessionToken;
        this._persistSession();
        if (this._eventBus) {
          this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
        }
      }
    } else if (type === 'auth:verifyToken:error') {
      console.warn('[AuthService] Token ungültig laut Server. Versuche lokalen Fallback...');
      const accounts = this._getAccounts();
      if (this._currentUser && !this._currentUser.isGuest && accounts[this._currentUser.id]) {
        console.log('[AuthService] Lokales Konto vorhanden. Behalte Session bei und registriere im Hintergrund neu...');
        if (this._networkService && this._networkService.isConnected()) {
          this._networkService.send('auth:register', {
            username: this._currentUser.username,
            email: this._currentUser.email || `${this._currentUser.username}@local.archiv`,
            password: 'restored_session_' + (this._sessionToken || 'token')
          });
        }
      } else {
        this.logout();
      }
    }

    if (this._pendingAuthResolves[type]) {
      const resolvers = this._pendingAuthResolves[type];
      delete this._pendingAuthResolves[type];
      for (const resolve of resolvers) {
        resolve(payload);
      }
    }
  }

  /**
   * Erwartet eine bestimmte Server-Antwort als Promise mit Timeout
   */
  _awaitServerResponse(successType, errorType, timeoutMs = 5000) {
    return new Promise((resolve) => {
      let timer = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (this._pendingAuthResolves[successType]) {
          this._pendingAuthResolves[successType] = this._pendingAuthResolves[successType].filter(h => h !== handler);
        }
        if (this._pendingAuthResolves[errorType]) {
          this._pendingAuthResolves[errorType] = this._pendingAuthResolves[errorType].filter(h => h !== handler);
        }
      };

      const handler = (payload) => {
        cleanup();
        resolve(payload);
      };

      if (!this._pendingAuthResolves[successType]) this._pendingAuthResolves[successType] = [];
      if (!this._pendingAuthResolves[errorType]) this._pendingAuthResolves[errorType] = [];

      this._pendingAuthResolves[successType].push(handler);
      this._pendingAuthResolves[errorType].push(handler);

      timer = setTimeout(() => {
        cleanup();
        resolve({ timeout: true });
      }, timeoutMs);
    });
  }

  async _hashPassword(password, salt) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt + 'archiv_salt_v1');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('[AuthService] Fallback für Hashing genutzt:', e);
      }
    }
    let hash = 0;
    const str = password + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }

  _generateSalt() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  _generateToken() {
    return 'token_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
  }

  _getAccounts() {
    try {
      const raw = localStorage.getItem(this._STORAGE_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _saveAccounts(accounts) {
    localStorage.setItem(this._STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  isLoggedIn() {
    return !!this._currentUser && !this._currentUser.isGuest;
  }

  getCurrentUser() {
    return this._currentUser;
  }

  getToken() {
    return this._sessionToken;
  }

  loginAsGuest() {
    let guestId = localStorage.getItem('archiv_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      localStorage.setItem('archiv_guest_id', guestId);
    }

    this._currentUser = {
      id: guestId,
      username: 'Gast-Hüter',
      email: null,
      isGuest: true,
      avatar: '🔮',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    this._sessionToken = this._generateToken();
    this._persistSession();

    if (this._eventBus) {
      this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: false });
    }

    return { success: true, user: this._currentUser };
  }

  /**
   * Registriert ein neues Konto auf dem Server (mit lokalem Offline-Fallback)
   */
  async register(username, email, password) {
    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'auth.error.username_short' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'auth.error.email_invalid' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'auth.error.password_short' };
    }

    // Wenn Server verbunden, versuche Registrierung über WebSocket
    if (this._networkService && this._networkService.isConnected()) {
      const pendingPromise = this._awaitServerResponse('auth:register:success', 'auth:register:error');
      
      const sent = this._networkService.send('auth:register', {
        username: cleanUsername,
        email: cleanEmail,
        password: password
      });

      if (sent) {
        const res = await pendingPromise;
        if (!res.timeout && res) {
          if (res.user && res.token) {
            this._currentUser = res.user;
            this._sessionToken = res.token;
            this._persistSession();

            // Auch lokal cachen für Offline-Fallback
            const salt = this._generateSalt();
            const passwordHash = await this._hashPassword(password, salt);
            const accounts = this._getAccounts();
            accounts[res.user.id] = { ...res.user, email: cleanEmail, salt, passwordHash };
            this._saveAccounts(accounts);

            if (this._eventBus) {
              this._eventBus.publish('auth:registered', { user: this._currentUser });
              this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
            }

            if (this._cloudManager) {
              this._cloudManager.sync();
            }

            return { success: true, user: this._currentUser };
          } else if (res.error) {
            if (res.error === 'auth.error.username_taken' || res.error === 'auth.error.email_taken') {
              return { success: false, error: res.error };
            }
          }
        }
      }
    }

    // Offline Fallback Registrierung
    const accounts = this._getAccounts();
    for (const key in accounts) {
      const acc = accounts[key];
      if (acc.username && acc.username.toLowerCase() === cleanUsername.toLowerCase()) {
        return { success: false, error: 'auth.error.username_taken' };
      }
      if (acc.email && acc.email.toLowerCase() === cleanEmail) {
        return { success: false, error: 'auth.error.email_taken' };
      }
    }

    const userId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const salt = this._generateSalt();
    const passwordHash = await this._hashPassword(password, salt);

    const newUser = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      isGuest: false,
      avatar: '🛡️',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    accounts[userId] = {
      ...newUser,
      salt,
      passwordHash
    };

    this._saveAccounts(accounts);

    this._currentUser = newUser;
    this._sessionToken = this._generateToken();
    this._persistSession();

    if (this._eventBus) {
      this._eventBus.publish('auth:registered', { user: this._currentUser });
      this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
    }

    return { success: true, user: this._currentUser };
  }

  /**
   * Anmelden mit Benutzername/E-Mail und Passwort (mit Server-Anbindung)
   */
  async login(usernameOrEmail, password) {
    const query = (usernameOrEmail || '').trim().toLowerCase();
    if (!query || !password) {
      return { success: false, error: 'auth.error.missing_fields' };
    }

    // Wenn Server verbunden, versuche Login über WebSocket
    if (this._networkService && this._networkService.isConnected()) {
      const pendingPromise = this._awaitServerResponse('auth:login:success', 'auth:login:error');

      const sent = this._networkService.send('auth:login', {
        usernameOrEmail: query,
        password: password
      });

      if (sent) {
        const res = await pendingPromise;
        if (!res.timeout && res) {
          if (res.user && res.token) {
            this._currentUser = res.user;
            this._sessionToken = res.token;
            this._persistSession();

            // Lokal cachen für Offline-Fallback
            const salt = this._generateSalt();
            const passwordHash = await this._hashPassword(password, salt);
            const accounts = this._getAccounts();
            accounts[res.user.id] = { ...res.user, salt, passwordHash };
            this._saveAccounts(accounts);

            if (this._eventBus) {
              this._eventBus.publish('auth:login', { user: this._currentUser });
              this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
            }

            if (this._cloudManager) {
              this._cloudManager.loadFromCloud();
            }

            return { success: true, user: this._currentUser };
          } else if (res.error === 'auth.error.wrong_password') {
            return { success: false, error: res.error };
          }
        }
      }
    }

    // Offline Fallback Login
    const accounts = this._getAccounts();
    let targetAcc = null;

    for (const key in accounts) {
      const acc = accounts[key];
      if ((acc.username && acc.username.toLowerCase() === query) || (acc.email && acc.email.toLowerCase() === query)) {
        targetAcc = acc;
        break;
      }
    }

    if (!targetAcc) {
      return { success: false, error: 'auth.error.user_not_found' };
    }

    if (!targetAcc.passwordHash || !targetAcc.salt) {
      return { success: false, error: 'auth.error.wrong_password' };
    }

    const hash = await this._hashPassword(password, targetAcc.salt);
    if (hash !== targetAcc.passwordHash) {
      return { success: false, error: 'auth.error.wrong_password' };
    }

    targetAcc.lastLogin = new Date().toISOString();
    accounts[targetAcc.id] = targetAcc;
    this._saveAccounts(accounts);

    this._currentUser = {
      id: targetAcc.id,
      username: targetAcc.username,
      email: targetAcc.email,
      isGuest: false,
      avatar: targetAcc.avatar || '🛡️',
      createdAt: targetAcc.createdAt,
      lastLogin: targetAcc.lastLogin
    };

    this._sessionToken = targetAcc.sessionToken || this._generateToken();
    this._persistSession();

    // Falls jetzt Server verbunden ist, registriere das bisher nur lokal existierende Konto auf dem Server nach
    if (this._networkService && this._networkService.isConnected()) {
      this._networkService.send('auth:register', {
        username: targetAcc.username,
        email: targetAcc.email || `${targetAcc.username}@local.archiv`,
        password: password
      });
    }

    if (this._eventBus) {
      this._eventBus.publish('auth:login', { user: this._currentUser });
      this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
    }

    return { success: true, user: this._currentUser };
  }

  /**
   * Wandelt ein Gast-Konto in ein permanentes Konto um (mit Server-Anbindung)
   */
  async convertGuestToAccount(username, email, password) {
    if (!this._currentUser || !this._currentUser.isGuest) {
      return { success: false, error: 'auth.error.not_guest' };
    }

    const guestId = this._currentUser.id;

    if (this._networkService && this._networkService.isConnected()) {
      const pendingPromise = this._awaitServerResponse('auth:convertGuest:success', 'auth:convertGuest:error');

      const sent = this._networkService.send('auth:convertGuest', {
        guestId,
        username,
        email,
        password
      });

      if (sent) {
        const res = await pendingPromise;
        if (!res.timeout) {
          if (res.user && res.token) {
            this._currentUser = res.user;
            this._sessionToken = res.token;
            this._persistSession();

            const salt = this._generateSalt();
            const passwordHash = await this._hashPassword(password, salt);
            const accounts = this._getAccounts();
            accounts[res.user.id] = { ...res.user, email, salt, passwordHash };
            this._saveAccounts(accounts);

            if (this._eventBus) {
              this._eventBus.publish('auth:guestConverted', { user: this._currentUser });
              this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
            }

            if (this._cloudManager) {
              this._cloudManager.sync();
            }

            return { success: true, user: this._currentUser };
          } else if (res.error) {
            return { success: false, error: res.error };
          }
        } else {
          return { success: false, error: 'auth.error.server_timeout' };
        }
      }
    }

    const result = await this.register(username, email, password);
    if (result.success) {
      if (this._eventBus) {
        this._eventBus.publish('auth:guestConverted', { user: result.user });
      }
    }
    return result;
  }

  logout() {
    this._currentUser = null;
    this._sessionToken = null;
    localStorage.removeItem(this._STORAGE_SESSION_KEY);

    if (this._eventBus) {
      this._eventBus.publish('auth:logout');
    }

    return this.loginAsGuest();
  }

  _persistSession() {
    if (!this._currentUser) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const data = {
      user: this._currentUser,
      token: this._sessionToken,
      expiresAt: expiresAt.toISOString()
    };
    localStorage.setItem(this._STORAGE_SESSION_KEY, JSON.stringify(data));
  }
}

export default AuthService;
