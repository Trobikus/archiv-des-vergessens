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
import { logger } from '../logger.js';

const DB_NAME = 'ArchivDB';
const STORE_NAME = 'saves';
const SAVE_KEY = 'main_save';
const LEGACY_VAULT_KEY = 'account_vault';
const DB_VERSION = 3;
const LATEST_VERSION = APP_VERSION;

export class SaveManager {
  static _db = null;
  static _saveLock = false;
  static _saveQueue = [];
  static _vaultSaveLock = false;
  static _vaultSaveQueue = [];
  static _pendingState = null;
  static _pendingSlotId = null;
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
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('archiv_active_slot', String(slotId));
        }
      } catch (e) {}
    }
  }

  static getActiveSlot() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('archiv_active_slot');
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (parsed >= 1 && parsed <= 5) {
            this._activeSlotId = parsed;
          }
        }
      } catch (e) {}
    }
    return this._activeSlotId;
  }

  static _isGuest() {
    if (!this._services?.authService) return false;
    if (typeof this._services.authService.isGuest === 'function') {
      return this._services.authService.isGuest();
    }
    const u = typeof this._services.authService.getCurrentUser === 'function'
      ? this._services.authService.getCurrentUser()
      : null;
    return !!u?.isGuest;
  }

  static _isRegisteredUser(userId = null) {
    if (userId) return true;
    if (this._services?.authService) {
      return !this._isGuest();
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
      logger.warn('[SaveManager] Fehler beim Bereinigen der Gast-Sicherungen:', e);
    }
  }

  static _resolveUserId(userId = null) {
    if (userId) return userId;
    if (!this._services?.authService) return null;
    const u = this._services.authService.getCurrentUser();
    if (u && !u.isGuest) return u.id || u.username || null;
    return null;
  }

  static _getUserIdentity() {
    if (!this._services?.authService) return { id: null, username: null };
    const u = this._services.authService.getCurrentUser();
    if (!u || u.isGuest) return { id: null, username: null };
    return {
      id: u.id || null,
      username: u.username || null
    };
  }

  static _getSlotKey(slotId = this.getActiveSlot(), userId = null) {
    const uId = this._resolveUserId(userId);
    return uId ? `slot_u${uId}_${slotId}` : `slot_guest_${slotId}`;
  }

  /**
   * Kandidaten-Keys für einen Slot (inkl. Username-Fallback bei ID-Wechsel).
   */
  static _getSlotKeyCandidates(slotId = this.getActiveSlot(), userId = null) {
    const keys = [];
    const primary = this._getSlotKey(slotId, userId);
    keys.push(primary);

    const identity = this._getUserIdentity();
    if (identity.id && identity.username && identity.id !== identity.username) {
      const alt = `slot_u${identity.username}_${slotId}`;
      if (!keys.includes(alt)) keys.push(alt);
    }
    if (userId && identity.username && userId !== identity.username) {
      const alt = `slot_u${identity.username}_${slotId}`;
      if (!keys.includes(alt)) keys.push(alt);
    }

    return keys;
  }

  static async _getFromStore(db, key) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Schreibt einen Record kompatibel zu Stores mit und ohne keyPath.
   * Alte DBs (v2 ohne keyPath) brauchen den expliziten Key; neue DBs den keyPath.
   */
  static _putIntoStore(store, record, key) {
    const keyedRecord = { ...record, key };
    if (store.keyPath === 'key') {
      return store.put(keyedRecord);
    }
    return store.put(keyedRecord, key);
  }

  static async _putRecord(db, key, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = this._putIntoStore(store, record, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  static async _deleteRecord(db, key) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Migriert Legacy-Keys (main_save / username-Slot) einmalig auf den kanonischen Slot-Key.
   */
  static async _promoteRecordToSlot(db, storedData, targetKey, sourceKey = null) {
    if (!storedData || !storedData.state || !targetKey) return storedData;
    if (sourceKey && sourceKey === targetKey) return storedData;

    try {
      const promoted = {
        ...storedData,
        key: targetKey
      };
      await this._putRecord(db, targetKey, promoted);
      if (sourceKey && sourceKey !== targetKey) {
        await this._deleteRecord(db, sourceKey);
        logger.info(`[SaveManager] Legacy-Spielstand von "${sourceKey}" nach "${targetKey}" migriert.`);
      }
      return promoted;
    } catch (e) {
      logger.warn('[SaveManager] Legacy-Migration fehlgeschlagen, nutze Quelldaten weiter:', e);
      return storedData;
    }
  }

  /**
   * Liest einen Slot inkl. Legacy-Fallbacks (username-Key, main_save).
   */
  static async _loadSlotRecord(db, slotId, userId = null) {
    const candidates = this._getSlotKeyCandidates(slotId, userId);
    const targetKey = candidates[0];

    for (const key of candidates) {
      const storedData = await this._getFromStore(db, key);
      if (storedData && storedData.state) {
        if (key !== targetKey) {
          return this._promoteRecordToSlot(db, storedData, targetKey, key);
        }
        return storedData;
      }
    }

    // Pre-Multi-Slot Legacy: globaler main_save → Slot 1
    if (slotId === 1) {
      const legacy = await this._getFromStore(db, SAVE_KEY);
      if (legacy && legacy.state) {
        return this._promoteRecordToSlot(db, legacy, targetKey, SAVE_KEY);
      }
    }

    return null;
  }

  static async _getDB() {
    if (this._db && this._dbReady) return this._db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
        // Bestehende Stores ohne keyPath bleiben erhalten; _putIntoStore schreibt dual-kompatibel.
        logger.info(`[SaveManager] Datenbank aktualisiert (v${event.oldVersion} → v${DB_VERSION})`);
      };

      request.onblocked = (event) => {
        logger.warn('[SaveManager] Datenbank-Öffnen blockiert.');
        if (request.result) {
          try { request.result.close(); } catch (e) {}
        }
      };
      
      request.onsuccess = (event) => {
        this._db = request.result;
        this._dbReady = true;
        this._db.onerror = (event) => {
          logger.error('[SaveManager] Datenbank-Fehler:', event.target.error);
        };
        resolve(this._db);
      };
      
      request.onerror = () => {
        logger.error('[SaveManager] Datenbank-Öffnen fehlgeschlagen:', request.error);
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
      const storedData = await this._loadSlotRecord(db, i, userId);

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
    if (this._isGuest()) {
      logger.info('[SaveManager] Speichern übersprungen: Gast-Accounts sind nur temporär für die aktuelle Sitzung.');
      return false;
    }

    if (this._saveLock) {
      return new Promise((resolve, reject) => {
        this._saveQueue.push({ state, slotId, resolve, reject });
      });
    }
    this._saveLock = true;
    this.setActiveSlot(slotId);

    let result = false;
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

      const cleanState = JSON.parse(
        JSON.stringify(stateToSave, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
      );

      const saveData = {
        key: slotKey,
        timestamp: saveTime,
        version: LATEST_VERSION,
        rngSeed: RNG.getSeed(),
        state: cleanState
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

      await this._putRecord(db, slotKey, saveData);

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

      result = true;

    } catch (error) {
      logger.warn('[SaveManager] Save fehlgeschlagen:', error);
      result = false;
    } finally {
      this._saveLock = false;
      if (this._saveQueue.length > 0) {
        const next = this._saveQueue.shift();
        if (next) {
          this.save(next.state, next.slotId)
            .then(next.resolve)
            .catch(next.reject);
        }
      }
    }

    return result;
  }

  /**
   * Lädt den State aus einem Slot.
   */
  static async load(slotId = this._activeSlotId) {
    if (this._isGuest()) {
      logger.info('[SaveManager] Laden übersprungen: Gast-Accounts besitzen keine dauerhaften Speicherstände.');
      return null;
    }

    if (this._loadLock) {
      return new Promise((resolve) => this._loadQueue.push(resolve));
    }
    this._loadLock = true;
    this.setActiveSlot(slotId);

    let state = null;
    try {
      const db = await this._getDB();
      let storedData = await this._loadSlotRecord(db, slotId);

      if (storedData) {
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

        state = storedData.state || null;
      }
    } catch (error) {
      logger.error('[SaveManager] Load fehlgeschlagen:', error);
      state = null;
    } finally {
      this._loadLock = false;
      const queue = [...this._loadQueue];
      this._loadQueue = [];
      for (const resolve of queue) resolve(state);
    }

    return state;
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
      const storedData = await this._loadSlotRecord(db, slotId);
      return !!(storedData && storedData.state);
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

      return true;
    } catch {
      return false;
    }
  }

  static async deleteSave() {
    return this.deleteSlot(this._activeSlotId);
  }

  static _getVaultKey(userId = null) {
    const uId = this._resolveUserId(userId);
    return uId ? `vault_u${uId}` : `vault_guest`;
  }

  static async saveAccountVault(vaultData, userId = null) {
    if (this._isGuest()) {
      return false;
    }

    if (!this._isRegisteredUser(userId)) {
      return false;
    }

    if (this._vaultSaveLock) {
      return new Promise((resolve) => {
        this._vaultSaveQueue.push({ vaultData, userId, resolve });
      });
    }

    this._vaultSaveLock = true;

    try {
      const db = await this._getDB();
      const vaultKey = this._getVaultKey(userId);
      const safeData = JSON.parse(JSON.stringify(vaultData || {}));

      await this._putRecord(db, vaultKey, {
        key: vaultKey,
        timestamp: Date.now(),
        vaultData: safeData
      });

      return true;
    } catch (e) {
      logger.warn('[SaveManager] Warnung beim Speichern des Account-Lagers:', e);
      return false;
    } finally {
      this._vaultSaveLock = false;
      if (this._vaultSaveQueue.length > 0) {
        const next = this._vaultSaveQueue.shift();
        this.saveAccountVault(next.vaultData, next.userId).then(next.resolve);
      }
    }
  }

  /**
   * Lädt die geteilten Account-Vault Daten aus der IndexedDB.
   */
  static async loadAccountVault(userId = null) {
    try {
      const db = await this._getDB();
      const vaultKey = this._getVaultKey(userId);
      let record = await this._getFromStore(db, vaultKey);

      // Legacy-Fallback: unscoped account_vault → nutzerbezogener Key
      if ((!record || !record.vaultData) && vaultKey !== 'vault_guest') {
        const legacy = await this._getFromStore(db, LEGACY_VAULT_KEY);
        if (legacy && legacy.vaultData) {
          await this._putRecord(db, vaultKey, {
            ...legacy,
            key: vaultKey
          });
          await this._deleteRecord(db, LEGACY_VAULT_KEY);
          logger.info(`[SaveManager] Legacy-Account-Vault nach "${vaultKey}" migriert.`);
          record = { ...legacy, key: vaultKey };
        }
      }

      // Username-Fallback analog zu Slot-Keys
      if ((!record || !record.vaultData)) {
        const identity = this._getUserIdentity();
        if (identity.id && identity.username && identity.id !== identity.username) {
          const altKey = `vault_u${identity.username}`;
          const alt = await this._getFromStore(db, altKey);
          if (alt && alt.vaultData) {
            await this._putRecord(db, vaultKey, { ...alt, key: vaultKey });
            await this._deleteRecord(db, altKey);
            record = { ...alt, key: vaultKey };
          }
        }
      }

      return record ? record.vaultData : null;
    } catch (e) {
      logger.error('[SaveManager] Fehler beim Laden des Account-Lagers:', e);
      return null;
    }
  }

  static destroy() {
    this._saveLock = false;
    this._saveQueue = [];
    this._pendingState = null;
    this._pendingSlotId = null;
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