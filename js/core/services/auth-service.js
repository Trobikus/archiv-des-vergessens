/**
 * ============================================================
 * FILE: core/services/auth-service.js – Authentication Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Verwaltung von Benutzer-Registrierung, Login, Logout & Session-Tokens
 * - Server-Synchronisation über NetworkService mit lokalem Cache bestätigter Konten
 * - Gast-Konto Generierung & Migration in permanente SQLite-Server-Konten
 * - Verknüpfung mit EventBus & CloudManager für Fortschritts-Sync
 * ============================================================
 */

import { logger } from '../logger.js';

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
    this._isAuthenticating = false;

    this._initSession();
  }

  get isAuthenticating() {
    return this._isAuthenticating;
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
      logger.error('[AuthService] Fehler beim Laden der Session:', e);
      this._currentUser = null;
      this._sessionToken = null;
    }

    if (!this._currentUser) {
      this.loginAsGuest();
    }
  }

  /**
   * Reagiert auf eingehende Server-Nachrichten bezüglich Auth
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
      logger.warn('[AuthService] Token ungültig oder abgelaufen laut Server.');
      const accounts = this._getAccounts();
      if (this._currentUser && !this._currentUser.isGuest && accounts[this._currentUser.id]?.isServerAccount) {
        logger.info('[AuthService] Lokales Konto vorhanden, behalte Offline-Session bei.');
      } else {
        this._sessionToken = null;
        if (this._eventBus) {
          this._eventBus.publish('auth:sessionExpired', { user: this._currentUser });
        }
      }
    }

    if (this._pendingAuthResolves[type]) {
      const resolvers = [...this._pendingAuthResolves[type]];
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
          if (this._pendingAuthResolves[successType].length === 0) {
            delete this._pendingAuthResolves[successType];
          }
        }
        if (this._pendingAuthResolves[errorType]) {
          this._pendingAuthResolves[errorType] = this._pendingAuthResolves[errorType].filter(h => h !== handler);
          if (this._pendingAuthResolves[errorType].length === 0) {
            delete this._pendingAuthResolves[errorType];
          }
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
        logger.warn('[AuthService] Fallback für Hashing genutzt:', e);
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

  _secureRandomHex(bytes) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(bytes);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Secure random generation is not supported in this environment.');
  }

  _generateSalt() {
    return this._secureRandomHex(16);
  }

  _generateToken() {
    return 'token_' + Date.now().toString(36) + '_' + this._secureRandomHex(4);
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
      guestId = 'guest_' + Date.now().toString(36) + '_' + this._secureRandomHex(2);
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
   * Registriert ein neues Konto ausschließlich nach Server-Bestätigung.
   */
  async register(username, email, password) {
    if (this._isAuthenticating) {
      return { success: false, error: 'auth.error.in_progress' };
    }
    this._isAuthenticating = true;
    try {
      const cleanUsername = (username || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      // ========== ERWEITERTE VALIDIERUNG ==========

      // Username-Länge
      if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 25) {
        return { 
          success: false, 
          error: 'auth.error.username_short',
          message: 'Username muss 3-25 Zeichen lang sein.'
        };
      }

      // Username-Zeichen
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return {
          success: false,
          error: 'auth.error.username_invalid_chars',
          message: 'Nur Buchstaben, Zahlen und Unterstriche erlaubt.'
        };
      }

      // Email-Format (RFC-konform)
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail) || cleanEmail.length > 254) {
        return { 
          success: false, 
          error: 'auth.error.email_invalid',
          message: 'Ungültige E-Mail-Adresse.'
        };
      }

      // Passwort-Stärke
      if (!password || password.length < 6) {
        return { 
          success: false, 
          error: 'auth.error.password_short',
          message: 'Passwort muss mindestens 6 Zeichen haben.'
        };
      }

      if (password.length > 128) {
        return {
          success: false,
          error: 'auth.error.password_too_long'
        };
      }

      // Lokale Duplikat-Prüfung VOR Server-Request
      const accounts = this._getAccounts();
      const normalizedUsername = cleanUsername.toLowerCase();

      for (const key in accounts) {
        const acc = accounts[key];
        if (acc.username?.toLowerCase() === normalizedUsername) {
          return { success: false, error: 'auth.error.username_taken' };
        }
        if (acc.email?.toLowerCase() === cleanEmail) {
          return { success: false, error: 'auth.error.email_taken' };
        }
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
              const freshAccounts = this._getAccounts();
              freshAccounts[res.user.id] = { ...res.user, email: cleanEmail, salt, passwordHash, isServerAccount: true };
              this._saveAccounts(freshAccounts);

              if (this._eventBus) {
                this._eventBus.publish('auth:registered', { user: this._currentUser });
                this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
              }

              if (this._cloudManager) {
                this._cloudManager.sync();
              }

              return { success: true, user: this._currentUser };
            } else if (res.error) {
              return { success: false, error: res.error };
            }
          }
        }
      }

      return {
        success: false,
        error: 'auth.error.server_unavailable',
        message: 'Konto konnte nicht erstellt werden: Der Server ist nicht erreichbar.'
      };
    } finally {
      this._isAuthenticating = false;
    }
  }

  /**
   * Meldet sich online an oder offline mit einem zuvor serverbestätigten lokalen Cache an.
   */
  async login(usernameOrEmail, password) {
    if (this._isAuthenticating) {
      return { success: false, error: 'auth.error.in_progress' };
    }
    this._isAuthenticating = true;
    try {
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
              accounts[res.user.id] = { ...res.user, salt, passwordHash, isServerAccount: true };
              this._saveAccounts(accounts);

              if (this._eventBus) {
                this._eventBus.publish('auth:login', { user: this._currentUser });
                this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
              }

              return { success: true, user: this._currentUser };
            } else if (res.error) {
              return { success: false, error: res.error };
            }
          }
        }
      }

      // Offline-Login ist ausschließlich für zuvor serverbestätigte Konten zulässig.
      const accounts = this._getAccounts();
      let targetAcc = null;

      for (const key in accounts) {
        const acc = accounts[key];
        if ((acc.username && acc.username.toLowerCase() === query) || (acc.email && acc.email.toLowerCase() === query)) {
          targetAcc = acc;
          break;
        }
      }

      if (!targetAcc || !targetAcc.isServerAccount) {
        return { success: false, error: 'auth.error.server_unavailable' };
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

      if (this._eventBus) {
        this._eventBus.publish('auth:login', { user: this._currentUser });
        this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
      }

      return { success: true, user: this._currentUser };
    } finally {
      this._isAuthenticating = false;
    }
  }

  /**
   * Wandelt ein Gast-Konto in ein permanentes Konto um (mit Server-Anbindung)
   */
  async convertGuestToAccount(username, email, password) {
    if (!this._currentUser || !this._currentUser.isGuest) {
      return { success: false, error: 'auth.error.not_guest' };
    }
    
    const guestId = this._currentUser.id;
    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // ========== LOKALE VALIDIERUNG ==========
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 25) {
      return { success: false, error: 'auth.error.username_short' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return { success: false, error: 'auth.error.username_invalid_chars' };
    }
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'auth.error.email_invalid' };
    }
    
    if (!password || password.length < 6 || password.length > 128) {
      return { success: false, error: 'auth.error.password_short' };
    }
    
    // ========== SERVER-REQUEST ==========
    if (this._networkService && this._networkService.isConnected()) {
      const pendingPromise = this._awaitServerResponse('auth:convertGuest:success', 'auth:convertGuest:error');
      
      const sent = this._networkService.send('auth:convertGuest', {
        guestId,
        username: cleanUsername,
        email: cleanEmail,
        password: password
      });
      
      if (sent) {
        const res = await pendingPromise;
        if (!res.timeout) {
          if (res.user && res.token) {
            // Account erfolgreich erstellt
            this._currentUser = res.user;
            this._sessionToken = res.token;
            this._persistSession();
            
            // Lokal cachen
            const salt = this._generateSalt();
            const passwordHash = await this._hashPassword(password, salt);
            const accounts = this._getAccounts();
            accounts[res.user.id] = { ...res.user, email: cleanEmail, salt, passwordHash, isServerAccount: true };
            this._saveAccounts(accounts);
            
            // Gast-ID aus LocalStorage entfernen
            localStorage.removeItem('archiv_guest_id');
            
            if (this._eventBus) {
              this._eventBus.publish('auth:guestConverted', { 
                user: this._currentUser,
                migrated: res.migrated || {}
              });
              this._eventBus.publish('auth:stateChanged', { 
                user: this._currentUser, 
                isLoggedIn: true 
              });
            }
            
            if (this._cloudManager) {
              this._cloudManager.sync();
            }
            
            return { 
              success: true, 
              user: this._currentUser,
              migrated: res.migrated || {}
            };
          } else if (res.error) {
            return { 
              success: false, 
              error: res.error,
              similarTo: res.similarTo,
              retryAfter: res.retryAfter
            };
          }
        } else {
          return { success: false, error: 'auth.error.server_timeout' };
        }
      }
    }
    
    // ========== OFFLINE FALLBACK ==========
    // Wenn kein Server, nutze die normale register() Methode
    const result = await this.register(cleanUsername, cleanEmail, password);
    
    if (result.success) {
      // Gast-ID entfernen
      localStorage.removeItem('archiv_guest_id');
      
      if (this._eventBus) {
        this._eventBus.publish('auth:guestConverted', { 
          user: result.user,
          migrated: { save: false, leaderboard: false }
        });
      }
    }
    
    return result;
  }

  logout() {
    this._currentUser = null;
    this._sessionToken = null;
    this._pendingAuthResolves = {};
    this._isAuthenticating = false;
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
