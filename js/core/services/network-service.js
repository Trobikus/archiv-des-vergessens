/**
 * ============================================================
 * FILE: core/services/network-service.js – Netzwerk & WebSocket
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - WebSocket-Verbindung zum Server aufbauen & verwalten
 * - Automatischer Reconnect-Loop bei Verbindungsabbruch (alle 5s)
 * - Automatische Authentifizierung (Handshake) nach Verbindungsaufbau
 * - Routing von Server-Paketen an die zuständigen Services
 * ============================================================
 */

export class NetworkService {
  /**
   * @param {import('../state/manager.js').StateManager} stateManager
   * @param {import('../events/bus.js').default} eventBus
   */
  constructor(stateManager, eventBus) {
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

    // Live Server-URL auf deiner Google Cloud VM
    this._serverUrl = 'wss://grimoireinteractive.duckdns.org';

    // Registrierte Services, an die Nachrichten weitergeleitet werden
    this._chatService = null;
    this._leaderboardService = null;
    this._cloudManager = null;

    // Verbindung beim Start aufbauen
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

  setServices(chatService, leaderboardService, cloudManager) {
    this._chatService = chatService;
    this._leaderboardService = leaderboardService;
    this._cloudManager = cloudManager;
  }

  /**
   * Baut die WebSocket-Verbindung auf.
   */
  connect() {
    if (this._ws && (this._ws.readyState === WebSocket.CONNECTING || this._ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this._reconnectAttempts <= this._maxConsecutiveLogs) {
      console.log(`[Network] Verbinde mit Multiplayer-Server unter ${this._serverUrl}...`);
    }

    try {
      this._ws = new WebSocket(this._serverUrl);
    } catch (e) {
      this._triggerReconnect();
      return;
    }

    this._ws.onopen = () => {
      this._connected = true;
      this._reconnectAttempts = 0;
      console.log('[Network] Verbindung hergestellt! Starte Handshake...');
      this._startReconnectTimer(); // Falls vorher einer lief, aufräumen
      this._authenticate();
      this._eventBus.publish('network:connected', { url: this._serverUrl });
    };

    this._ws.onmessage = (event) => {
      this._handleMessage(event.data);
    };

    this._ws.onclose = () => {
      if (this._connected) {
        this._connected = false;
        console.log('[Network] Verbindung zum Server verloren.');
        this._eventBus.publish('network:disconnected', {});
      }
      this._triggerReconnect();
    };

    this._ws.onerror = (err) => {
      if (this._reconnectAttempts <= this._maxConsecutiveLogs) {
        console.warn('[Network] Multiplayer-Server offline oder nicht erreichbar.');
      }
    };
  }

  /**
   * Authentifiziert den Client beim Server.
   */
  _authenticate() {
    const state = this._stateManager.getState();
    const username = state && state.hero ? state.hero.name : 'Unbekannter Held';
    const guildId = state && state.guild ? state.guild.id : null;

    this.send('auth', {
      userId: this._userId,
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
        case 'auth:success':
          console.log(`[Network] Handshake erfolgreich! Registriert als '${payload.username}'`);
          this._eventBus.publish('network:auth:success', payload);
          break;

        case 'auth:error':
          console.error('[Network] Handshake fehlgeschlagen:', payload.message);
          this._eventBus.publish('ui:showToast', { message: `⚠️ Server-Auth: ${payload.message}`, type: 'error' });
          break;

        case 'chat:globalMessage':
          if (this._chatService) {
            this._chatService.addReceivedGlobalMessage(payload);
          }
          break;

        case 'chat:guildMessage':
          if (this._chatService) {
            this._chatService.addReceivedGuildMessage(payload);
          }
          break;

        case 'leaderboard:update':
          if (this._leaderboardService) {
            this._leaderboardService.addReceivedGlobalEntries(payload);
          }
          break;

        case 'cloud:save:success':
          if (this._cloudManager) {
            this._cloudManager.onCloudSaveSuccess(payload.timestamp);
          }
          break;

        case 'cloud:save:error':
          if (this._cloudManager) {
            this._cloudManager.onCloudSaveError(payload.error);
          }
          break;

        case 'cloud:load:success':
          if (this._cloudManager) {
            this._cloudManager.onCloudLoadSuccess(payload);
          }
          break;

        case 'cloud:load:error':
          if (this._cloudManager) {
            this._cloudManager.onCloudLoadError(payload.error);
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
