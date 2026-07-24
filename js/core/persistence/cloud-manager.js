/**
 * ============================================================
 * FILE: core/persistence/cloud-manager.js – Cloud-Synchronisation
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Cloud-Sync aktivieren/deaktivieren
 * - Spielstände in localStorage (als Cloud-Ersatz) speichern
 * - Automatische Synchronisation im Intervall
 * - Sync-Status verwalten
 * ============================================================
 */

import { sanitizeString, sanitizeNumber } from '../../utils/sanitizer.js';
import { SaveManager } from './save-manager.js';
import { APP_VERSION } from '../../utils/version.js';

/** @typedef {import('../events/bus.js').default} EventBus */

export class CloudManager {
  /**
   * @param {EventBus} eventBus
   * @param {import('../services/network-service.js').NetworkService} [networkService]
   */
  constructor(eventBus, networkService = null) {
    this._eventBus = eventBus;
    this._networkService = networkService;
    this._STORAGE_KEY = 'archiv_cloud_save';
    this._ENABLED_KEY = 'archiv_cloud_enabled';
    this._USER_ID_KEY = 'archiv_user_id';

    this._isEnabled = localStorage.getItem(this._ENABLED_KEY) === 'true';
    this._autoSync = true;
    this._syncInterval = 60000;
    this._lastSync = null;
    this._isSynced = false;
    this._userId = this._getUserId();
    this._syncTimer = null;

    this._pendingSaveResolve = null;
    this._saveTimeout = null;
    this._pendingLoadResolve = null;
    this._loadTimeout = null;

    if (this._eventBus) {
      this._eventBus.subscribe('auth:stateChanged', (data) => {
        if (data && data.user) {
          this._userId = data.user.id;
          localStorage.setItem(this._USER_ID_KEY, this._userId);
          if (data.isLoggedIn) {
            this.setEnabled(true);
            this.loadFromCloud();
          } else if (this._isEnabled) {
            this.sync();
          }
        }
      });
    }

    if (this._isEnabled && this._autoSync) {
      this._startAutoSync();
    }
  }

  _getUserId() {
    let id = localStorage.getItem(this._USER_ID_KEY);
    if (!id) {
      id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
      localStorage.setItem(this._USER_ID_KEY, id);
    }
    return id;
  }

  /**
   * Gibt zurück, ob Cloud-Sync aktiviert ist.
   */
  isEnabled() {
    return this._isEnabled;
  }

  /**
   * Aktiviert oder deaktiviert den Cloud-Sync.
   */
  setEnabled(enabled) {
    this._isEnabled = !!enabled;
    localStorage.setItem(this._ENABLED_KEY, String(this._isEnabled));
    if (this._isEnabled) {
      this._startAutoSync();
      this.sync();
    } else {
      this._stopAutoSync();
    }
    this._eventBus.publish('cloud:stateChanged', { enabled: this._isEnabled });
    return this._isEnabled;
  }

  /**
   * Startet die automatische Synchronisation.
   */
  _startAutoSync() {
    this._stopAutoSync();
    if (!this._isEnabled) return;
    this._syncTimer = setInterval(() => {
      this.sync();
    }, this._syncInterval);
  }

  /**
   * Stoppt die automatische Synchronisation.
   */
  _stopAutoSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
  }

  /**
   * Führt eine manuelle Synchronisation durch.
   * @param {Object} saveData – Optional: Daten, die gespeichert werden sollen
   * @returns {Promise<boolean>} – Erfolg
   */
  async sync(saveData = null) {
    if (!this._isEnabled) return false;

    try {
      let data = saveData;
      if (!data) {
        try {
          data = await SaveManager.load();
          if (!data) data = { timestamp: Date.now(), version: APP_VERSION };
        } catch (e) {
          console.warn('[CloudManager] SaveManager nicht verfügbar, verwende leeres Objekt:', e);
          data = { timestamp: Date.now(), version: APP_VERSION };
        }
      }

      const cloudData = {
        userId: this._userId,
        timestamp: Date.now(),
        saveData: data,
        version: data.version || APP_VERSION,
        device: navigator.userAgent || 'unknown'
      };

      // Lokales Backup (immer sichern)
      localStorage.setItem(this._STORAGE_KEY, JSON.stringify(cloudData));

      // Falls Netzwerk verbunden, senden wir echtes WebSocket-Paket
      if (this._networkService && this._networkService.isConnected()) {
        return new Promise((resolve) => {
          this._pendingSaveResolve = resolve;
          // Timeout nach 4s
          this._saveTimeout = setTimeout(() => {
            if (this._pendingSaveResolve === resolve) {
              console.warn('[CloudManager] Cloud-Sichern Zeitüberschreitung, nutze lokales Backup.');
              this._pendingSaveResolve = null;
              this._lastSync = Date.now();
              this._isSynced = true;
              this._eventBus.publish('cloud:synced', {
                timestamp: this._lastSync,
                userId: this._userId
              });
              resolve(true);
            }
          }, 4000);

          this._networkService.send('cloud:save', { saveData: data });
        });
      }

      this._lastSync = Date.now();
      this._isSynced = true;

      this._eventBus.publish('cloud:synced', {
        timestamp: this._lastSync,
        userId: this._userId
      });

      return true;
    } catch (error) {
      console.error('[CloudManager] Sync fehlgeschlagen:', error);
      this._eventBus.publish('cloud:syncFailed', { error: error.message });
      return false;
    }
  }

  async loadFromCloud() {
    if (!this._isEnabled) return null;

    if (this._networkService && this._networkService.isConnected()) {
      return new Promise((resolve) => {
        this._pendingLoadResolve = resolve;
        // Timeout nach 4s
        this._loadTimeout = setTimeout(() => {
          if (this._pendingLoadResolve === resolve) {
            console.warn('[CloudManager] Cloud-Laden Zeitüberschreitung, lade lokales Backup.');
            this._pendingLoadResolve = null;
            resolve(this._loadFromLocal());
          }
        }, 4000);

        this._networkService.send('cloud:load');
      });
    }

    return this._loadFromLocal();
  }

  _loadFromLocal() {
    try {
      const raw = localStorage.getItem(this._STORAGE_KEY);
      if (!raw) return null;
      const cloudData = JSON.parse(raw);
      return cloudData.saveData || null;
    } catch (error) {
      console.error('[CloudManager] Laden aus lokalem Backup fehlgeschlagen:', error);
      return null;
    }
  }

  /**
   * Gibt Informationen über den letzten Sync zurück.
   */
  getCloudInfo() {
    try {
      const raw = localStorage.getItem(this._STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        userId: data.userId,
        timestamp: data.timestamp,
        version: data.version,
        device: data.device
      };
    } catch {
      return null;
    }
  }

  /**
   * Löscht alle Cloud-Daten.
   */
  clearCloudData() {
    localStorage.removeItem(this._STORAGE_KEY);
    this._isSynced = false;
    this._lastSync = null;
    this._eventBus.publish('cloud:cleared', {});
  }

  /**
   * Gibt den aktuellen Zustand zurück.
   */
  getState() {
    return {
      isEnabled: this._isEnabled,
      autoSync: this._autoSync,
      syncInterval: this._syncInterval,
      lastSync: this._lastSync,
      isSynced: this._isSynced,
      userId: this._userId
    };
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    this._isEnabled = data.isEnabled !== undefined ? data.isEnabled : this._isEnabled;
    this._autoSync = data.autoSync !== undefined ? data.autoSync : this._autoSync;
    this._syncInterval = data.syncInterval || this._syncInterval;
    this._lastSync = data.lastSync || null;
    this._isSynced = data.isSynced || false;
    this._userId = data.userId || this._getUserId();

    localStorage.setItem(this._ENABLED_KEY, String(this._isEnabled));

    if (this._isEnabled && this._autoSync) {
      this._startAutoSync();
    }
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    return this.getState();
  }

  /**
   * Callbacks von NetworkService bei erfolgreichen Serverantworten
   */
  onCloudSaveSuccess(timestamp) {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._lastSync = timestamp || Date.now();
    this._isSynced = true;
    console.log('[CloudManager] Spielstand erfolgreich online gesichert!');
    
    this._eventBus.publish('cloud:synced', {
      timestamp: this._lastSync,
      userId: this._userId
    });

    if (this._pendingSaveResolve) {
      const resolve = this._pendingSaveResolve;
      this._pendingSaveResolve = null;
      resolve(true);
    }
  }

  onCloudSaveError(error) {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    console.error('[CloudManager] Online-Sichern fehlgeschlagen:', error);
    this._eventBus.publish('cloud:syncFailed', { error });

    if (this._pendingSaveResolve) {
      const resolve = this._pendingSaveResolve;
      this._pendingSaveResolve = null;
      resolve(false);
    }
  }

  onCloudLoadSuccess(payload) {
    if (this._loadTimeout) clearTimeout(this._loadTimeout);
    console.log('[CloudManager] Spielstand erfolgreich online geladen!');

    if (payload && payload.saveData) {
      const cloudData = {
        userId: this._userId,
        timestamp: payload.timestamp || Date.now(),
        saveData: payload.saveData,
        version: payload.version || APP_VERSION,
        device: 'cloud-server'
      };
      localStorage.setItem(this._STORAGE_KEY, JSON.stringify(cloudData));

      if (this._eventBus) {
        this._eventBus.publish('cloud:loaded', { saveData: payload.saveData, timestamp: payload.timestamp });
      }
    }

    if (this._pendingLoadResolve) {
      const resolve = this._pendingLoadResolve;
      this._pendingLoadResolve = null;
      resolve(payload ? payload.saveData : null);
    }
  }

  onCloudLoadError(error) {
    if (this._loadTimeout) clearTimeout(this._loadTimeout);
    console.error('[CloudManager] Online-Laden fehlgeschlagen:', error);

    if (this._pendingLoadResolve) {
      const resolve = this._pendingLoadResolve;
      this._pendingLoadResolve = null;
      resolve(this._loadFromLocal());
    }
  }

  /**
   * Zerstört den Service.
   */
  destroy() {
    this._stopAutoSync();
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    if (this._loadTimeout) clearTimeout(this._loadTimeout);
    this._eventBus = null;
  }
}

export default CloudManager;