/**
 * ============================================================
 * FILE: core/persistence/save-manager.js – Speichern & Laden (v2.0 FINAL)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - IndexedDB für persistente Speicherung
 * - Prüfsumme zur Korruptionserkennung (mit Fehlertoleranz)
 * - Queue für parallele Save/Load-Operationen
 * - Integration mit dem Security-Worker
 * ============================================================
 */

import { Checksum } from '../security.js';
import RNG from '../../utils/rng.js';

const DB_NAME = 'ArchivDB';
const STORE_NAME = 'saves';
const SAVE_KEY = 'main_save';
const LATEST_VERSION = '1.6';

export class SaveManager {
  static _db = null;
  static _saveLock = false;
  static _saveQueue = [];
  static _loadLock = false;
  static _loadQueue = [];
  static _workerManager = null;
  static _services = {};
  static _dbReady = false;

  /**
   * Setzt den WorkerManager für asynchrone Operationen.
   */
  static setWorkerManager(workerManager) {
    this._workerManager = workerManager;
  }

  /**
   * Setzt die Service-Referenzen für die Hydration.
   */
  static setServices(services) {
    this._services = services;
  }

  /**
   * Öffnet die IndexedDB-Datenbank.
   */
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
        // Fehlerbehandlung für die DB
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
   * Speichert den State asynchron.
   */
  static async save(state) {
    if (this._saveLock) {
      return new Promise((resolve) => this._saveQueue.push(resolve));
    }
    this._saveLock = true;

    try {
      const db = await this._getDB();

      const saveTime = Date.now();

      // State-Kopie mit aktualisiertem lastSave & isSaving Status
      const stateToSave = {
        ...state,
        system: {
          ...state.system,
          lastSave: saveTime,
          isSaving: false
        }
      };

      // Save-Daten vorbereiten
      const saveData = {
        timestamp: saveTime,
        version: LATEST_VERSION,
        rngSeed: RNG.getSeed(),
        state: stateToSave
      };

      // Prüfsumme berechnen (im Worker, wenn verfügbar)
      let checksum;
      if (this._workerManager && this._workerManager.isAvailable()) {
        try {
          checksum = await this._workerManager.execute('checksum:calculate', saveData);
        } catch (e) {
          console.warn('[SaveManager] Worker-Checksum fehlgeschlagen, Fallback:', e);
          checksum = Checksum.calculate(saveData);
        }
      } else {
        checksum = Checksum.calculate(saveData);
      }
      saveData._checksum = checksum;

      // In IndexedDB speichern
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(saveData, SAVE_KEY);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });

      // In-Memory State synchronisieren
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

      // Queue abarbeiten
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
   * Lädt den State asynchron (mit Fehlertoleranz bei Prüfsumme).
   */
  static async load() {
    if (this._loadLock) {
      return new Promise((resolve) => this._loadQueue.push(resolve));
    }
    this._loadLock = true;

    try {
      const db = await this._getDB();

      const storedData = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(SAVE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (!storedData) {
        this._loadQueue = [];
        return null;
      }

      // Prüfsumme validieren (mit Fehlertoleranz)
      if (storedData._checksum) {
        const expectedChecksum = storedData._checksum;
        delete storedData._checksum; // Temporär entfernen, da bei der Generierung in save() auch kein _checksum Feld existierte

        let valid = false;
        if (this._workerManager && this._workerManager.isAvailable()) {
          try {
            const calculated = await this._workerManager.execute('checksum:calculate', storedData);
            valid = calculated === expectedChecksum;
          } catch (e) {
            console.warn('[SaveManager] Worker-Checksum-Validierung fehlgeschlagen, Fallback:', e);
            valid = Checksum.calculate(storedData) === expectedChecksum;
          }
        } else {
          valid = Checksum.calculate(storedData) === expectedChecksum;
        }

        if (!valid) {
          console.warn('[SaveManager] Prüfsummen-Fehler! Lade trotzdem (Daten könnten korrupt sein).');
          // Event-Bus Benachrichtigung
          if (this._services?.eventBus) {
            this._services.eventBus.publish('ui:showToast', {
              message: '⚠️ Spielstand-Checksumme fehlerhaft – wurde trotzdem geladen.',
              type: 'warning',
              duration: 5000
            });
          }
        }
      }

      // RNG-Seed wiederherstellen
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
   * Prüft, ob ein Save existiert.
   */
  static async hasSave() {
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(SAVE_KEY);
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Löscht den Save.
   */
  static async deleteSave() {
    while (this._saveLock || this._loadLock) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(SAVE_KEY);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Bereinigt den Manager (für Tests).
   */
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