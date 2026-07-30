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

import { logger } from '../logger.js';
import { SecureStorage } from '../persistence/secure-storage.js';

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
      const sessionData = SecureStorage.getItemSync(this._STORAGE_SESSION_KEY);
      if (sessionData && sessionData.user && sessionData.token) {
        if (!sessionData.expiresAt || new Date(sessionData.expiresAt) > new Date()) {
          this._currentUser = sessionData.user;
          this._sessionToken = sessionData.token;
        } else {
          this.logout();
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
      this._sessionToken = null;
      if (this._eventBus) {
        this._eventBus.publish('auth:sessionExpired', { user: this._currentUser });
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

  _secureRandomHex(bytes) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(bytes);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Secure random generation is not supported in this environment.');
  }

  _generateToken() {
    return 'token_' + Date.now().toString(36) + '_' + this._secureRandomHex(4);
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
    let guestId = SecureStorage.getItemSync('archiv_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Date.now().toString(36) + '_' + this._secureRandomHex(2);
      SecureStorage.setItemSync('archiv_guest_id', guestId);
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

      if (!this._networkService || !this._networkService.isConnected()) {
        return { success: false, error: 'auth.error.server_offline' };
      }

      const pendingPromise = this._awaitServerResponse('auth:register:success', 'auth:register:error');

      const sent = this._networkService.send('auth:register', {
        username: cleanUsername,
        email: cleanEmail,
        password: password
      });

      if (!sent) {
        return { success: false, error: 'auth.error.server_offline' };
      }

      const res = await pendingPromise;
      
      if (res.timeout) {
        return { success: false, error: 'auth.error.server_timeout' };
      }

      if (res.user && res.token) {
        this._currentUser = res.user;
        this._sessionToken = res.token;
        this._persistSession();

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
      
      return { success: false, error: 'auth.error.server_error' };
    } finally {
      this._isAuthenticating = false;
    }
  }

  /**
   * Anmelden mit Benutzername/E-Mail und Passwort (mit Server-Anbindung)
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

      if (!this._networkService || !this._networkService.isConnected()) {
        return { success: false, error: 'auth.error.server_offline' };
      }

      const pendingPromise = this._awaitServerResponse('auth:login:success', 'auth:login:error');

      const sent = this._networkService.send('auth:login', {
        usernameOrEmail: query,
        password: password
      });

      if (!sent) {
        return { success: false, error: 'auth.error.server_offline' };
      }

      const res = await pendingPromise;
      
      if (res.timeout) {
        return { success: false, error: 'auth.error.server_timeout' };
      }

      if (res.user && res.token) {
        this._currentUser = res.user;
        this._sessionToken = res.token;
        this._persistSession();

        if (this._eventBus) {
          this._eventBus.publish('auth:login', { user: this._currentUser });
          this._eventBus.publish('auth:stateChanged', { user: this._currentUser, isLoggedIn: true });
        }

        return { success: true, user: this._currentUser };
      } else if (res.error) {
        return { success: false, error: res.error };
      }
      
      return { success: false, error: 'auth.error.server_error' };
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
    if (!this._networkService || !this._networkService.isConnected()) {
      return { success: false, error: 'auth.error.server_offline' };
    }

    const pendingPromise = this._awaitServerResponse('auth:convertGuest:success', 'auth:convertGuest:error');
    
    const sent = this._networkService.send('auth:convertGuest', {
      guestId,
      username: cleanUsername,
      email: cleanEmail,
      password: password
    });
    
    if (!sent) {
      return { success: false, error: 'auth.error.server_offline' };
    }

    const res = await pendingPromise;
    if (res.timeout) {
      return { success: false, error: 'auth.error.server_timeout' };
    }

    if (res.user && res.token) {
      // Account erfolgreich erstellt
      this._currentUser = res.user;
      this._sessionToken = res.token;
      this._persistSession();
      
      // Gast-ID aus LocalStorage entfernen
      SecureStorage.removeItem('archiv_guest_id');
      
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

    return { success: false, error: 'auth.error.server_error' };
  }

  logout() {
    this._currentUser = null;
    this._sessionToken = null;
    this._pendingAuthResolves = {};
    this._isAuthenticating = false;
    SecureStorage.removeItem(this._STORAGE_SESSION_KEY);

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
    SecureStorage.setItemSync(this._STORAGE_SESSION_KEY, data);
  }
}

export default AuthService;
