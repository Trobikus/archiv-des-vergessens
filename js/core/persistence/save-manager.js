/**
 * ============================================================
 * FILE: core/persistence/save-manager.js – Speichern & Laden (v2.0 Multi-Slot)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - IndexedDB für persistente Speicherung mit Multi-Slot Support (max 5 Slots pro User)
 * - Prüfsumme zur Korruptionserkennung (mit Fehlertoleranz)
 * - Queue für parallele Save/Load-Operationen
 * - Integration mit dem Security-Worker
 * ============================================================
 */

import { Checksum } from '../security.js';
import RNG from '../../utils/rng.js';
import { APP_VERSION } from '../../utils/version.js';

const DB_NAME = 'ArchivDB';
const STORE_NAME = 'saves';
const SAVE_KEY = 'main_save';
const LATEST_VERSION = APP_VERSION;

export class SaveManager {
  static _db = null;
  static _saveLock = false;
  static _saveQueue = [];
  static _loadLock = false;
  static _loadQueue = [];
  static _workerManager = null;
  static _services = {};
  static _dbReady = false;
  static _activeSlotId = 1;

  static setWorkerManager(workerManager) {
    this._workerManager = workerManager;
  }

  static setServices(services) {
    this._services = services;
  }

  static setActiveSlot(slotId) {
    if (slotId >= 1 && slotId <= 5) {
      this._activeSlotId = slotId;
    }
  }

  static getActiveSlot() {
    return this._activeSlotId;
  }

  static _isRegisteredUser(userId = null) {
    if (userId) return true;
    if (this._services?.authService) {
      const u = this._services.authService.getCurrentUser();
      return !!(u && !u.isGuest);
    }
    return true;
  }

  static async clearGuestSaves() {
    try {
      const db = await this._getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (let i = 1; i <= 5; i++) {
        store.delete(`slot_guest_${i}`);
      }
      store.delete('vault_guest');
    } catch (e) {
      console.warn('[SaveManager] Fehler beim Bereinigen der Gast-Sicherungen:', e);
    }
  }

  static _getSlotKey(slotId = this._activeSlotId, userId = null) {
    let uId = userId;
    if (!uId && this._services?.authService) {
      const u = this._services.authService.getCurrentUser();
      if (u && !u.isGuest) uId = u.id || u.username;
    }
    return uId ? `slot_u${uId}_${slotId}` : `slot_guest_${slotId}`;
  }

  static async _getDB() {
    if (this._db && this._dbReady) return this._db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        console.log('[SaveManager] Datenbank aktualisiert');
      };
      
      request.onsuccess = () => {
        this._db = request.result;
        this._dbReady = true;
        this._db.onerror = (event) => {
          console.error('[SaveManager] Datenbank-Fehler:', event.target.error);
        };
        resolve(this._db);
      };
      
      request.onerror = () => {
        console.error('[SaveManager] Datenbank-Öffnen fehlgeschlagen:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Listet alle 5 Slots mit Meta-Informationen auf.
   */
  static async listSlots(userId = null) {
    if (!this._isRegisteredUser(userId)) {
      return Array.from({ length: 5 }, (_, i) => ({
        slotId: i + 1,
        hasSave: false
      }));
    }

    const db = await this._getDB();
    const slots = [];

    for (let i = 1; i <= 5; i++) {
      const key = this._getSlotKey(i, userId);
      
      let storedData = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      // Legacy Migration for Slot 1 if empty
      if (!storedData && i === 1) {
        storedData = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(SAVE_KEY);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
      }

      if (storedData && storedData.state) {
        const st = storedData.state;
        slots.push({
          slotId: i,
          hasSave: true,
          name: st.hero?.name || st.character?.name || 'Hüter',
          level: st.hero?.level || 1,
          avatar: st.hero?.avatar || '🛡️',
          classTitle: st.hero?.title || 'Schatten-Hüter',
          timestamp: storedData.timestamp || Date.now()
        });
      } else {
        slots.push({
          slotId: i,
          hasSave: false
        });
      }
    }

    return slots;
  }

  /**
   * Speichert den State in den aktiven Slot.
   */
  static async save(state, slotId = this._activeSlotId) {
    if (!this._isRegisteredUser()) {
      console.log('[SaveManager] Speichern übersprungen: Gast-Accounts sind nur temporär für die aktuelle Sitzung.');
      return false;
    }

    if (this._saveLock) {
      return new Promise((resolve) => this._saveQueue.push(resolve));
    }
    this._saveLock = true;
    this.setActiveSlot(slotId);

    try {
      const db = await this._getDB();
      const saveTime = Date.now();
      const slotKey = this._getSlotKey(slotId);

      const stateToSave = {
        ...state,
        system: {
          ...state.system,
          lastSave: saveTime,
          isSaving: false
        }
      };

      const saveData = {
        timestamp: saveTime,
        version: LATEST_VERSION,
        rngSeed: RNG.getSeed(),
        state: stateToSave
      };

      let checksum;
      if (this._workerManager && this._workerManager.isAvailable()) {
        try {
          checksum = await this._workerManager.execute('checksum:calculate', saveData);
        } catch (e) {
          checksum = Checksum.calculate(saveData);
        }
      } else {
        checksum = Checksum.calculate(saveData);
      }
      saveData._checksum = checksum;

      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(saveData, slotKey);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });

      // Synchronisiere auch Legacy SAVE_KEY bei Slot 1
      if (slotId === 1) {
        try {
          const tx2 = db.transaction(STORE_NAME, 'readwrite');
          tx2.objectStore(STORE_NAME).put(saveData, SAVE_KEY);
        } catch (e) {}
      }

      if (this._services?.stateManager) {
        this._services.stateManager.dispatch((s) => ({
          ...s,
          system: {
            ...s.system,
            lastSave: saveTime,
            isSaving: false
          }
        }), 'setSavingStatus');
      }

      const queue = [...this._saveQueue];
      this._saveQueue = [];
      for (const resolve of queue) resolve(true);

      return true;

    } catch (error) {
      console.error('[SaveManager] Save fehlgeschlagen:', error);
      this._saveQueue = [];
      return false;
    } finally {
      this._saveLock = false;
    }
  }

  /**
   * Lädt den State aus einem Slot.
   */
  static async load(slotId = this._activeSlotId) {
    if (!this._isRegisteredUser()) {
      console.log('[SaveManager] Laden übersprungen: Gast-Accounts besitzen keine dauerhaften Speicherstände.');
      return null;
    }

    if (this._loadLock) {
      return new Promise((resolve) => this._loadQueue.push(resolve));
    }
    this._loadLock = true;
    this.setActiveSlot(slotId);

    try {
      const db = await this._getDB();
      const slotKey = this._getSlotKey(slotId);

      let storedData = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(slotKey);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Legacy Fallback for Slot 1
      if (!storedData && slotId === 1) {
        storedData = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(SAVE_KEY);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
      }

      if (!storedData) {
        this._loadQueue = [];
        return null;
      }

      if (storedData._checksum) {
        const expectedChecksum = storedData._checksum;
        delete storedData._checksum;

        let valid = false;
        if (this._workerManager && this._workerManager.isAvailable()) {
          try {
            const calculated = await this._workerManager.execute('checksum:calculate', storedData);
            valid = calculated === expectedChecksum;
          } catch (e) {
            valid = Checksum.calculate(storedData) === expectedChecksum;
          }
        } else {
          valid = Checksum.calculate(storedData) === expectedChecksum;
        }

        if (!valid && this._services?.eventBus) {
          this._services.eventBus.publish('ui:showToast', {
            message: '⚠️ Spielstand-Checksumme fehlerhaft – wurde trotzdem geladen.',
            type: 'warning',
            duration: 5000
          });
        }
      }

      if (storedData.rngSeed !== undefined) {
        RNG.setSeed(storedData.rngSeed);
      }

      const state = storedData.state || null;

      const queue = [...this._loadQueue];
      this._loadQueue = [];
      for (const resolve of queue) resolve(state);

      return state;

    } catch (error) {
      console.error('[SaveManager] Load fehlgeschlagen:', error);
      this._loadQueue = [];
      return null;
    } finally {
      this._loadLock = false;
    }
  }

  /**
   * Prüft, ob ein Save im aktiven Slot existiert.
   */
  static async hasSave(slotId = this._activeSlotId) {
    if (!this._isRegisteredUser()) {
      return false;
    }

    try {
      const db = await this._getDB();
      const slotKey = this._getSlotKey(slotId);
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(slotKey);
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Löscht einen bestimmten Slot.
   */
  static async deleteSlot(slotId) {
    if (!this._isRegisteredUser()) {
      return false;
    }

    while (this._saveLock || this._loadLock) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    try {
      const db = await this._getDB();
      const slotKey = this._getSlotKey(slotId);

      await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(slotKey);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });

      if (slotId === 1) {
        try {
          const tx2 = db.transaction(STORE_NAME, 'readwrite');
          tx2.objectStore(STORE_NAME).delete(SAVE_KEY);
        } catch (e) {}
      }

      return true;
    } catch {
      return false;
    }
  }

  static async deleteSave() {
    return this.deleteSlot(this._activeSlotId);
  }

  static _getVaultKey(userId = null) {
    let uId = userId;
    if (!uId && this._services?.authService) {
      const u = this._services.authService.getCurrentUser();
      if (u && !u.isGuest) uId = u.id || u.username;
    }
    return uId ? `vault_u${uId}` : `vault_guest`;
  }

  static async saveAccountVault(vaultData, userId = null) {
    if (!this._isRegisteredUser(userId)) {
      return false;
    }

    try {
      const db = await this._getDB();
      const vaultKey = this._getVaultKey(userId);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ timestamp: Date.now(), data: vaultData }, vaultKey);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
      return true;
    } catch (e) {
      console.error('[SaveManager] Fehler beim Speichern des Account-Lagers:', e);
      return false;
    }
  }

  static async loadAccountVault(userId = null) {
    if (!this._isRegisteredUser(userId)) {
      return null;
    }

    try {
      const db = await this._getDB();
      const vaultKey = this._getVaultKey(userId);
      const res = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(vaultKey);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      return res ? res.data : null;
    } catch (e) {
      console.error('[SaveManager] Fehler beim Laden des Account-Lagers:', e);
      return null;
    }
  }

  static destroy() {
    this._saveLock = false;
    this._saveQueue = [];
    this._loadLock = false;
    this._loadQueue = [];
    if (this._db) {
      try { this._db.close(); } catch (e) {}
      this._db = null;
    }
    this._dbReady = false;
    this._services = {};
    this._workerManager = null;
  }
}

export default SaveManager;