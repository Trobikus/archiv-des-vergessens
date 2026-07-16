// --- START OF FILE core/savegame.js ---

import RNG from '../utils/rng.js';

export default class SaveGameManager {
  static DB_NAME = 'ArchivDB';
  static STORE_NAME = 'saves';
  static SAVE_KEY = 'main_save';
  static managers = {};

  static register(key, manager) {
    this.managers[key] = manager;
  }

  static async _getDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveGame() {
    try {
      const db = await this._getDB();
      const saveData = {
        timestamp: Date.now(),
        version: '1.5',
        rngSeed: RNG.getSeed()
      };

      for (const [key, manager] of Object.entries(this.managers)) {
        if (manager.toJSON) saveData[key] = manager.toJSON();
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put(saveData, this.SAVE_KEY);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('[SaveGame] Fehler beim Speichern:', error);
      return false;
    }
  }

  static async loadGame() {
    try {
      const db = await this._getDB();
      const saveData = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(this.SAVE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (!saveData) return null;

      if (saveData.rngSeed) {
        RNG.setSeed(saveData.rngSeed);
      }

      for (const [key, manager] of Object.entries(this.managers)) {
        if (saveData[key] && manager.fromJSON) {
          try {
            manager.fromJSON(saveData[key]);
          } catch (e) {
            console.error(`[SaveGame] Fehler beim Parsen von ${key}:`, e);
            // Manager zurücksetzen, falls Fehler auftritt
            try {
              if (manager.reset) manager.reset();
            } catch (resetErr) {
              console.error(`[SaveGame] Fehler beim Reset von ${key}:`, resetErr);
            }
          }
        }
      }
      return saveData;
    } catch (error) {
      console.error('[SaveGame] Fehler beim Laden:', error);
      return null;
    }
  }

  static async hasSaveGame() {
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.count(this.SAVE_KEY);
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      });
    } catch { return false; }
  }

  static async deleteSaveGame() {
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(this.SAVE_KEY);
        req.onsuccess = () => resolve(true);
      });
    } catch { return false; }
  }
}