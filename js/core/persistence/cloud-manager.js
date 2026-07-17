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

import { sanitizeString, sanitizeNumber } from '../utils/sanitizer.js';

export class CloudManager {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
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
        // Falls keine Daten übergeben, versuche SaveManager zu laden
        try {
          const { default: SaveManager } = await import('./save-manager.js');
          data = await SaveManager.load();
          if (!data) data = { timestamp: Date.now(), version: '1.6' };
        } catch (e) {
          console.warn('[CloudManager] SaveManager nicht verfügbar, verwende leeres Objekt:', e);
          data = { timestamp: Date.now(), version: '1.6' };
        }
      }

      const cloudData = {
        userId: this._userId,
        timestamp: Date.now(),
        saveData: data,
        version: data.version || '1.6',
        device: navigator.userAgent || 'unknown'
      };

      localStorage.setItem(this._STORAGE_KEY, JSON.stringify(cloudData));
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

  /**
   * Lädt den letzten Cloud-Spielstand.
   * @returns {Promise<Object|null>} – Spielstand oder null
   */
  async loadFromCloud() {
    if (!this._isEnabled) return null;

    try {
      const raw = localStorage.getItem(this._STORAGE_KEY);
      if (!raw) return null;
      const cloudData = JSON.parse(raw);
      return cloudData.saveData || null;
    } catch (error) {
      console.error('[CloudManager] Laden aus Cloud fehlgeschlagen:', error);
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
   * Zerstört den Service.
   */
  destroy() {
    this._stopAutoSync();
    this._eventBus = null;
  }
}

export default CloudManager;