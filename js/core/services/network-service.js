/**
 * ============================================================
 * FILE: core/services/network-service.js – Netzwerk & WebSocket
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - WebSocket-Verbindung zum Server aufbauen & verwalten
 * - Automatischer Reconnect-Loop bei Verbindungsabbruch (alle 5s)
 * - Automatischer Session-Check / Handshake nach Verbindungsaufbau
 * - Routing von Server-Paketen an die zuständigen Services (Chat, Leaderboard, Cloud, Auth)
 * ============================================================
 */

export class NetworkService {
  /**
   * @param {import('../state/manager.js').StateManager} stateManager
   * @param {import('../events/bus.js').default} eventBus
   * @param {import('./chat-service.js').ChatService|function():import('./chat-service.js').ChatService} [chatService]
   * @param {import('./leaderboard-service.js').LeaderboardService|function():import('./leaderboard-service.js').LeaderboardService} [leaderboardService]
   * @param {import('../persistence/cloud-manager.js').CloudManager|function():import('../persistence/cloud-manager.js').CloudManager} [cloudManager]
   * @param {import('./auth-service.js').AuthService|function():import('./auth-service.js').AuthService} [authService]
   */
  constructor(stateManager, eventBus, chatService = null, leaderboardService = null, cloudManager = null, authService = null) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._ws = null;
    this._connected = false;
    this._reconnectTimer = null;
    this._reconnectInterval = 5000;
    this._maxReconnectInterval = 60000;
    this._reconnectAttempts = 0;
    this._maxConsecutiveLogs = 2;
    this._userId = this._getUserId();

    // Live Server-URL oder lokaler WebSocket Backend Port 8080 bei Entwicklungs-Server
    this._serverUrl = this._getServerUrl();

    // Registrierte Services
    this._chatService = chatService;
    this._leaderboardService = leaderboardService;
    this._cloudManager = cloudManager;
    this._authService = authService;
    this._connectTimeout = null;

    // Verbindung beim Start aufbauen
    this.connect();
  }

  _getService(service) {
    if (typeof service === 'function') {
      return service();
    }
    return service;
  }

  _getAuthService() {
    return this._getService(this._authService);
  }

  _getServerUrl() {
    // 1. Manuelle Überschreibung durch Einstellungen/localStorage
    const customUrl = localStorage.getItem('archiv_server_url');
    if (customUrl) return customUrl;

    // 2. Nur im aktiven Vite-Entwicklungsmodus (npm run dev) auf localhost ausweichen
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || '';
      const isViteDev = typeof import.meta !== 'undefined' && import.meta['env'] && import.meta['env'].DEV;
      const isLocalHost = (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') && window.location.port !== '';

      if (isViteDev && isLocalHost) {
        return 'ws://localhost:8080';
      }
    }

    // 3. Standard für alle Produktiv-Builds (Tauri Release, GitHub Pages, Executable):
    return 'wss://grimoireinteractive.duckdns.org';
  }

  /**
   * Ändert die Server-URL zur Laufzeit (z. B. zwischen Produktiv und Test-Server)
   */
  setServerUrl(url) {
    if (!url) {
      localStorage.removeItem('archiv_server_url');
    } else {
      localStorage.setItem('archiv_server_url', url);
    }
    this._serverUrl = this._getServerUrl();
    if (this._ws) {
      try { this._ws.close(); } catch {}
    }
    this.connect();
  }

  _getUserId() {
    let id = localStorage.getItem('archiv_user_id');
    if (!id) {
      id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      localStorage.setItem('archiv_user_id', id);
    }
    return id;
  }

  setServices(chatService, leaderboardService, cloudManager, authService = null) {
    this._chatService = chatService;
    this._leaderboardService = leaderboardService;
    this._cloudManager = cloudManager;
    this._authService = authService;
    this._connectTimeout = null;
  }

  _clearConnectTimeout() {
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }
  }

  /**
   * Baut die WebSocket-Verbindung auf.
   */
  connect() {
    if (this._ws && (this._ws.readyState === WebSocket.CONNECTING || this._ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this._clearConnectTimeout();

    if (this._reconnectAttempts <= this._maxConsecutiveLogs) {
      console.log(`[Network] Verbinde mit Multiplayer-Server unter ${this._serverUrl}...`);
    }

    try {
      this._ws = new WebSocket(this._serverUrl);
    } catch (e) {
      this._triggerReconnect();
      return;
    }

    // Setze Verbindungs-Timeout (6000ms) für langsame Handshakes / offline Server
    this._connectTimeout = setTimeout(() => {
      if (this._ws && this._ws.readyState !== WebSocket.OPEN) {
        if (this._reconnectAttempts <= this._maxConsecutiveLogs) {
          console.warn('[Network] Verbindungsaufbau fehlgeschlagen (Timeout). Starte Reconnect...');
        }
        try { this._ws.close(); } catch {}
        this._ws = null;
        this._connected = false;
        this._triggerReconnect();
      }
    }, 6000);

    this._ws.onopen = () => {
      this._clearConnectTimeout();
      this._connected = true;
      this._reconnectAttempts = 0;
      console.log('[Network] Verbindung hergestellt! Starte Handshake...');
      this._startReconnectTimer();
      this._authenticate();
      this._eventBus.publish('network:connected', { url: this._serverUrl });
    };

    this._ws.onmessage = (event) => {
      this._handleMessage(event.data);
    };

    this._ws.onclose = () => {
      this._clearConnectTimeout();
      if (this._connected) {
        this._connected = false;
        console.log('[Network] Verbindung zum Server verloren.');
        this._eventBus.publish('network:disconnected', {});
      }
      this._triggerReconnect();
    };

    this._ws.onerror = (err) => {
      this._clearConnectTimeout();
      if (this._reconnectAttempts <= this._maxConsecutiveLogs) {
        console.warn('[Network] Multiplayer-Server offline oder nicht erreichbar.');
      }
    };
  }

  /**
   * Authentifiziert den Client beim Server.
   */
  _authenticate() {
    const authService = this._getAuthService();
    if (authService) {
      const user = authService.getCurrentUser();
      const token = authService.getToken();
      if (user && !user.isGuest && token) {
        this.send('auth:verifyToken', { userId: user.id, token });
        return;
      }
    }

    const state = this._stateManager ? this._stateManager.getState() : null;
    const username = state && state.hero ? state.hero.name : 'Gast-Hüter';
    const guildId = state && state.guild ? state.guild.id : null;

    this.send('auth', {
      userId: this._getUserId(),
      username: username,
      guildId: guildId
    });
  }

  /**
   * Sendet eine JSON-Nachricht an den Server.
   */
  send(type, payload = {}) {
    if (!this._connected || !this._ws || this._ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this._ws.send(JSON.stringify({ type, payload }));
      return true;
    } catch (err) {
      console.error('[Network] Fehler beim Senden:', err);
      return false;
    }
  }

  /**
   * Verarbeitet eintreffende Server-Nachrichten und leitet sie an Services weiter.
   */
  _handleMessage(rawData) {
    try {
      const { type, payload } = JSON.parse(rawData);

      switch (type) {
        // --- AUTH RESPONSES ---
        case 'auth:success':
          console.log(`[Network] Handshake erfolgreich! Registriert als '${payload.username}'`);
          this._eventBus.publish('network:auth:success', payload);
          break;

        case 'auth:error':
          console.error('[Network] Handshake fehlgeschlagen:', payload.message);
          this._eventBus.publish('ui:showToast', { message: `⚠️ Server-Auth: ${payload.message}`, type: 'error' });
          break;

        case 'auth:register:success':
        case 'auth:register:error':
        case 'auth:login:success':
        case 'auth:login:error':
        case 'auth:verifyToken:success':
        case 'auth:verifyToken:error':
        case 'auth:convertGuest:success':
        case 'auth:convertGuest:error':
          {
            const authService = this._getAuthService();
            if (authService && typeof authService.handleServerAuthResponse === 'function') {
              authService.handleServerAuthResponse(type, payload);
            }
          }
          this._eventBus.publish(`network:${type}`, payload);
          break;

        // --- CHAT RESPONSES ---
        case 'chat:globalMessage':
          {
            const chatService = this._getService(this._chatService);
            if (chatService) {
              chatService.addReceivedGlobalMessage(payload);
            }
          }
          break;

        case 'chat:guildMessage':
          {
            const chatService = this._getService(this._chatService);
            if (chatService) {
              chatService.addReceivedGuildMessage(payload);
            }
          }
          break;

        // --- LEADERBOARD RESPONSES ---
        case 'leaderboard:update':
          {
            const leaderboardService = this._getService(this._leaderboardService);
            if (leaderboardService) {
              leaderboardService.addReceivedGlobalEntries(payload);
            }
          }
          break;

        // --- CLOUD SAVE RESPONSES ---
        case 'cloud:save:success':
          {
            const cloudManager = this._getService(this._cloudManager);
            if (cloudManager) {
              cloudManager.onCloudSaveSuccess(payload.timestamp);
            }
          }
          break;

        case 'cloud:save:error':
          {
            const cloudManager = this._getService(this._cloudManager);
            if (cloudManager) {
              cloudManager.onCloudSaveError(payload.error);
            }
          }
          break;

        case 'cloud:load:success':
          {
            const cloudManager = this._getService(this._cloudManager);
            if (cloudManager) {
              cloudManager.onCloudLoadSuccess(payload);
            }
          }
          break;

        case 'cloud:load:error':
          {
            const cloudManager = this._getService(this._cloudManager);
            if (cloudManager) {
              cloudManager.onCloudLoadError(payload.error);
            }
          }
          break;

        default:
          console.warn(`[Network] Unbekannter Server-Pakettyp: ${type}`);
      }
    } catch (err) {
      console.error('[Network] Fehler beim Parsen der Server-Nachricht:', err);
    }
  }

  isConnected() {
    return this._connected;
  }

  _triggerReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectAttempts++;

    const nextInterval = Math.min(
      this._reconnectInterval * Math.pow(1.5, Math.min(this._reconnectAttempts, 8) - 1),
      this._maxReconnectInterval
    );

    if (this._reconnectAttempts <= this._maxConsecutiveLogs) {
      console.log(`[Network] Offline - Naechster Verbindungsversuch in ${Math.round(nextInterval / 1000)}s...`);
    }

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, nextInterval);
  }

  _startReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  destroy() {
    this._clearConnectTimeout();
    this._startReconnectTimer();
    if (this._ws) {
      this._ws.onclose = null;
      this._ws.onerror = null;
      this._ws.onmessage = null;
      this._ws.onopen = null;
      this._ws.close();
      this._ws = null;
    }
    this._connected = false;
  }
}

export default NetworkService;
