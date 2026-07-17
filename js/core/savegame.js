// ============================================================
// FILE: js/core/savegame.js – mit Verschlüsselung & Prüfsumme
// ============================================================
import RNG from '../utils/rng.js';
import { SimpleCrypto, Checksum, Sanitizer, IntegrityChecker } from './security.js';

const LATEST_VERSION = '1.5';
const ENCRYPTION_ENABLED = true;

export default class SaveGameManager {
    static DB_NAME = 'ArchivDB';
    static STORE_NAME = 'saves';
    static SAVE_KEY = 'main_save';
    static managers = {};

    static _saveLock = false;
    static _saveQueue = [];
    static _loadLock = false;
    static _loadQueue = [];

    static register(key, manager) {
        this.managers[key] = manager;
    }

    static async _getDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 2);
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
        if (this._saveLock) {
            return new Promise((resolve) => this._saveQueue.push(resolve));
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

            const checksum = Checksum.calculate(saveData);
            saveData._checksum = checksum;

            let dataToStore = saveData;
            if (ENCRYPTION_ENABLED) {
                dataToStore = {
                    _encrypted: true,
                    data: SimpleCrypto.encrypt(JSON.stringify(saveData))
                };
            }

            await new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                const req = store.put(dataToStore, this.SAVE_KEY);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });

            const queue = [...this._saveQueue];
            this._saveQueue = [];
            for (const resolve of queue) resolve(true);
            return true;

        } catch (error) {
            console.error('[SaveGame] Fehler beim Speichern:', error);
            this._saveQueue = [];
            return false;
        } finally {
            this._saveLock = false;
        }
    }

    static async loadGame() {
        if (this._loadLock) {
            return new Promise((resolve) => this._loadQueue.push(resolve));
        }
        this._loadLock = true;

        try {
            const db = await this._getDB();
            const storedData = await new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const store = tx.objectStore(this.STORE_NAME);
                const req = store.get(this.SAVE_KEY);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            if (!storedData) {
                this._loadQueue = [];
                return null;
            }

            let saveData;
            if (storedData._encrypted) {
                const decrypted = SimpleCrypto.decrypt(storedData.data);
                if (!decrypted) {
                    this._loadQueue = [];
                    return null;
                }
                try {
                    saveData = JSON.parse(decrypted);
                } catch {
                    this._loadQueue = [];
                    return null;
                }
            } else {
                saveData = storedData;
            }

            if (saveData._checksum) {
                const calculated = Checksum.calculate(saveData);
                if (calculated !== saveData._checksum) {
                    console.error('[SaveGame] Prüfsummen-Fehler!');
                    this._loadQueue = [];
                    return null;
                }
                delete saveData._checksum;
            }

            if (saveData.rngSeed !== undefined) {
                RNG.setSeed(saveData.rngSeed);
            }

            for (const [key, manager] of Object.entries(this.managers)) {
                if (saveData[key] && manager.fromJSON) {
                    try {
                        manager.fromJSON(saveData[key]);
                    } catch (e) {
                        console.error(`[SaveGame] Fehler beim Parsen von ${key}:`, e);
                    }
                }
            }

            const queue = [...this._loadQueue];
            this._loadQueue = [];
            for (const resolve of queue) resolve(saveData);
            return saveData;

        } catch (error) {
            console.error('[SaveGame] Fehler beim Laden:', error);
            this._loadQueue = [];
            return null;
        } finally {
            this._loadLock = false;
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
        } catch {
            return false;
        }
    }

    static async deleteSaveGame() {
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

    static destroy() {
        this._saveLock = false;
        this._saveQueue = [];
        this._loadLock = false;
        this._loadQueue = [];
        this.managers = {};
    }
}