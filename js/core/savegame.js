import RNG from '../utils/rng.js';

const MIGRATIONS = {
  '1.1': (data) => {
    if (!data.hero) data.hero = {};
    if (!data.hero.unlockedSkills) data.hero.unlockedSkills = [];
    return data;
  },
  '1.2': (data) => {
    if (data.resources && data.resources.memoryDust === undefined) {
      data.resources.memoryDust = 0;
    }
    return data;
  },
  '1.3': (data) => {
    if (data.resources && data.resources.timeBank === undefined) {
      data.resources.timeBank = 0;
    }
    return data;
  }
};

const LATEST_VERSION = '1.3';

function getNextVersion(version) {
  const versions = Object.keys(MIGRATIONS).sort();
  const index = versions.indexOf(version);
  if (index === -1 || index === versions.length - 1) return null;
  return versions[index + 1];
}

export default class SaveGameManager {
  static DB_NAME = 'ArchivDB';
  static STORE_NAME = 'saves';
  static SAVE_KEY = 'main_save';
  static managers = {};

  // ---- LOCKING MECHANISMUS FÜR RACE-CONDITIONS ----
  static _saveLock = false;
  static _saveQueue = [];
  static _loadLock = false;
  static _loadQueue = [];

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
    // ---- RACE-CONDITION: Warte auf laufenden Speichervorgang ----
    if (this._saveLock) {
      return new Promise((resolve) => {
        this._saveQueue.push(resolve);
      });
    }

    this._saveLock = true;

    try {
      const db = await this._getDB();
      const saveData = {
        timestamp: Date.now(),
        version: LATEST_VERSION,
        rngSeed: RNG.getSeed()
      };

      for (const [key, manager] of Object.entries(this.managers)) {
        if (manager.toJSON) saveData[key] = manager.toJSON();
      }

      const result = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put(saveData, this.SAVE_KEY);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });

      // ---- Aufgestaute Speicheranfragen verarbeiten ----
      const queue = [...this._saveQueue];
      this._saveQueue = [];
      for (const resolve of queue) {
        resolve(true);
      }

      return result;
    } catch (error) {
      console.error('[SaveGame] Fehler beim Speichern:', error);
      this._saveQueue = [];
      return false;
    } finally {
      this._saveLock = false;
    }
  }

  static async loadGame() {
    // ---- RACE-CONDITION: Warte auf laufenden Ladevorgang ----
    if (this._loadLock) {
      return new Promise((resolve) => {
        this._loadQueue.push(resolve);
      });
    }

    this._loadLock = true;

    try {
      const db = await this._getDB();
      const saveData = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(this.SAVE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (!saveData) {
        this._loadQueue = [];
        return null;
      }

      let data = saveData;
      const currentVersion = data.version || '1.0';
      if (currentVersion !== LATEST_VERSION) {
        data = this._migrate(data, currentVersion);
        data.version = LATEST_VERSION;
        await this.saveGame();
      }

      if (data.rngSeed !== undefined) {
        RNG.setSeed(data.rngSeed);
      } else {
        RNG.setSeed(Math.floor(Math.random() * 2147483647));
      }

      for (const [key, manager] of Object.entries(this.managers)) {
        if (data[key] && manager.fromJSON) {
          try {
            manager.fromJSON(data[key]);
          } catch (e) {
            console.error(`[SaveGame] Fehler beim Parsen von ${key}:`, e);
            if (manager.reset) manager.reset();
          }
        }
      }

      // ---- Aufgestaute Ladeanfragen verarbeiten ----
      const queue = [...this._loadQueue];
      this._loadQueue = [];
      for (const resolve of queue) {
        resolve(data);
      }

      return data;
    } catch (error) {
      console.error('[SaveGame] Fehler beim Laden:', error);
      this._loadQueue = [];
      return null;
    } finally {
      this._loadLock = false;
    }
  }

  static _migrate(data, fromVersion) {
    let current = fromVersion;
    let migratedData = { ...data };
    while (current && current !== LATEST_VERSION) {
      const next = getNextVersion(current);
      if (!next) break;
      const migrationFn = MIGRATIONS[next];
      if (migrationFn) {
        try {
          migratedData = migrationFn(migratedData);
          current = next;
        } catch (e) {
          console.error(`[SaveGame] Migration von ${current} nach ${next} fehlgeschlagen:`, e);
          break;
        }
      } else {
        break;
      }
    }
    return migratedData;
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
    } catch {
      return false;
    }
  }

  static async deleteSaveGame() {
    // ---- Warte auf laufende Vorgänge ----
    while (this._saveLock || this._loadLock) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(this.SAVE_KEY);
        req.onsuccess = () => resolve(true);
      });
    } catch {
      return false;
    }
  }

  // ---- Cleanup bei App-Teardown ----
  static destroy() {
    this._saveLock = false;
    this._saveQueue = [];
    this._loadLock = false;
    this._loadQueue = [];
    this.managers = {};
  }
}