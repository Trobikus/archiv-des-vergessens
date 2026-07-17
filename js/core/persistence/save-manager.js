/**
 * ============================================================
 * FILE: core/persistence/save-manager.js – Speichern & Laden
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - IndexedDB für persistente Speicherung
 * - Prüfsumme zur Korruptionserkennung
 * - Queue für parallele Save/Load-Operationen
 * - Integration mit dem Security-Worker
 * ============================================================
 */

import { Checksum } from '../security.js';
import RNG from '../utils/rng.js';

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

  static async _getDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this._db = request.result;
        resolve(this._db);
      };
      request.onerror = () => reject(request.error);
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

      // Save-Daten vorbereiten
      const saveData = {
        timestamp: Date.now(),
        version: LATEST_VERSION,
        rngSeed: RNG.getSeed(),
        state: state
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
   * Lädt den State asynchron.
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

      // Prüfsumme validieren
      if (storedData._checksum) {
        let valid = false;
        if (this._workerManager && this._workerManager.isAvailable()) {
          try {
            const calculated = await this._workerManager.execute('checksum:calculate', storedData);
            valid = calculated === storedData._checksum;
          } catch (e) {
            console.warn('[SaveManager] Worker-Checksum-Validierung fehlgeschlagen, Fallback:', e);
            valid = Checksum.calculate(storedData) === storedData._checksum;
          }
        } else {
          valid = Checksum.calculate(storedData) === storedData._checksum;
        }

        if (!valid) {
          console.error('[SaveManager] Prüfsummen-Fehler!');
          this._loadQueue = [];
          return null;
        }
        delete storedData._checksum;
      }

      // RNG-Seed wiederherstellen
      if (storedData.rngSeed !== undefined) {
        RNG.setSeed(storedData.rngSeed);
      }

      // State zurückgeben (wird vom Boot hydriert)
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
    this._db = null;
    this._services = {};
    this._workerManager = null;
  }
}

export default SaveManager;