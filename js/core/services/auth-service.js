/**
 * ============================================================
 * FILE: core/services/auth-service.js – Authentication Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Verwaltung von Benutzer-Registrierung, Login, Logout & Session-Tokens
 * - Passwort-Salting & Kryptografisches Hashing (Web Crypto API)
 * - Gast-Konto Generierung & Migration in permanente Konten
 * - Verknüpfung mit EventBus & Persistenz
 * - Bereitstellung von Schnittstellen für REST-Backends (Release-Ready)
 * ============================================================
 */

export class AuthService {
  /**
   * @param {import('../events/bus.js').default} eventBus
   * @param {import('../settings.js').default} [settingsManager]
   */
  constructor(eventBus, settingsManager = null) {
    this._eventBus = eventBus;
    this._settingsManager = settingsManager;

    this._STORAGE_ACCOUNTS_KEY = 'archiv_auth_accounts';
    this._STORAGE_SESSION_KEY = 'archiv_auth_session';

    this._currentUser = null;
    this._sessionToken = null;

    this._initSession();
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
          // Prüfe Ablaufdatum der Session (30 Tage Gültigkeit)
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

    // Wenn keine Session existiert, automatisch im Gast-Modus starten
    if (!this._currentUser) {
      this.loginAsGuest();
    }
  }

  /**
   * Hilfsmethode: Erzeugt einen kryptografischen Hash für Passwörter.
   * @param {string} password
   * @param {string} salt
   * @returns {Promise<string>}
   */
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
    // Fallback Hash
    let hash = 0;
    const str = password + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }

  /**
   * Erzeugt einen eindeutigen Salt.
   */
  _generateSalt() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Erzeugt einen Session-Token.
   */
  _generateToken() {
    return 'token_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
  }

  /**
   * Lädt alle lokal gespeicherten Konten.
   * @returns {Record<string, any>}
   */
  _getAccounts() {
    try {
      const raw = localStorage.getItem(this._STORAGE_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Speichert die Konten-Datenbank.
   * @param {Record<string, any>} accounts
   */
  _saveAccounts(accounts) {
    localStorage.setItem(this._STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  /**
   * Prüft ob ein Benutzer angemeldet ist.
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this._currentUser && !this._currentUser.isGuest;
  }

  /**
   * Gibt den aktuell angemeldeten Benutzer zurück.
   * @returns {object|null}
   */
  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Gibt den aktuellen Session-Token zurück.
   * @returns {string|null}
   */
  getToken() {
    return this._sessionToken;
  }

  /**
   * Meldet den Spieler im Gast-Modus an.
   */
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
   * Registriert ein neues Konto.
   * @param {string} username
   * @param {string} email
   * @param {string} password
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

    const accounts = this._getAccounts();

    // Prüfe ob Benutzername oder E-Mail existiert
    for (const key in accounts) {
      const acc = accounts[key];
      if (acc.username.toLowerCase() === cleanUsername.toLowerCase()) {
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

    // Automatisch anmelden
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
   * Anmelden mit Benutzername/E-Mail und Passwort.
   * @param {string} usernameOrEmail
   * @param {string} password
   */
  async login(usernameOrEmail, password) {
    const query = (usernameOrEmail || '').trim().toLowerCase();
    if (!query || !password) {
      return { success: false, error: 'auth.error.missing_fields' };
    }

    const accounts = this._getAccounts();
    let targetAcc = null;

    for (const key in accounts) {
      const acc = accounts[key];
      if (acc.username.toLowerCase() === query || (acc.email && acc.email.toLowerCase() === query)) {
        targetAcc = acc;
        break;
      }
    }

    if (!targetAcc) {
      return { success: false, error: 'auth.error.user_not_found' };
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

    this._sessionToken = this._generateToken();
    this._persistSession();

    if (this._eventBus) {
      this._eventBus.publish('auth:login', { user: this._currentUser });
      this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
    }

    return { success: true, user: this._currentUser };
  }

  /**
   * Wandelt ein Gast-Konto in ein permanentes Konto um.
   * @param {string} username
   * @param {string} email
   * @param {string} password
   */
  async convertGuestToAccount(username, email, password) {
    if (!this._currentUser || !this._currentUser.isGuest) {
      return { success: false, error: 'auth.error.not_guest' };
    }

    const result = await this.register(username, email, password);
    if (result.success) {
      if (this._eventBus) {
        this._eventBus.publish('auth:guestConverted', { user: result.user });
      }
    }
    return result;
  }

  /**
   * Meldet den aktuellen Benutzer ab und schaltet in den Gast-Modus zurück.
   */
  logout() {
    this._currentUser = null;
    this._sessionToken = null;
    localStorage.removeItem(this._STORAGE_SESSION_KEY);

    if (this._eventBus) {
      this._eventBus.publish('auth:logout');
    }

    return this.loginAsGuest();
  }

  /**
   * Speichert die Session im LocalStorage.
   */
  _persistSession() {
    if (!this._currentUser) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 Tage gültig

    const data = {
      user: this._currentUser,
      token: this._sessionToken,
      expiresAt: expiresAt.toISOString()
    };
    localStorage.setItem(this._STORAGE_SESSION_KEY, JSON.stringify(data));
  }
}

export default AuthService;
