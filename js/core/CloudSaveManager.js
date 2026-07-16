// --- START OF FILE core/CloudSaveManager.js ---

export default class CloudSaveManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.STORAGE_KEY = 'archiv_cloud_save';
        this.ENABLED_KEY = 'archiv_cloud_enabled';
        this.autoSync = true;
        this.syncInterval = 60000; // 1 Minute
        this.lastSync = null;
        this.pending = false;
        this.syncTimer = null;

        // Status
        this.isEnabled = localStorage.getItem(this.ENABLED_KEY) === 'true';
        this.isSynced = false;
        this.userId = this._getUserId();

        // Auto-Sync starten
        if (this.isEnabled && this.autoSync) {
            this.startAutoSync();
        }
    }

    _getUserId() {
        let id = localStorage.getItem('archiv_user_id');
        if (!id) {
            id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
            localStorage.setItem('archiv_user_id', id);
        }
        return id;
    }

    // ---- STATUS ----

    isCloudEnabled() { return this.isEnabled; }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem(this.ENABLED_KEY, String(enabled));
        if (enabled) {
            this.startAutoSync();
            this.sync();
        } else {
            this.stopAutoSync();
        }
        return this.isEnabled;
    }

    // ---- AUTO-SYNC ----

    startAutoSync() {
        this.stopAutoSync();
        if (!this.isEnabled) return;
        this.syncTimer = setInterval(() => {
            this.sync();
        }, this.syncInterval);
    }

    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    // ---- SYNC ----

    async sync(saveData = null) {
        if (!this.isEnabled) return false;
        if (this.pending) return false;

        this.pending = true;

        try {
            let data = saveData;
            if (!data) {
                // Hole aktuellen Spielstand
                const importData = await import('./savegame.js');
                data = await importData.default.loadGame();
                if (!data) data = { timestamp: Date.now(), version: '1.5' };
            }

            // Cloud-Speicher (lokal simuliert)
            const cloudData = {
                userId: this.userId,
                timestamp: Date.now(),
                saveData: data,
                version: data.version || '1.5',
                device: navigator.userAgent || 'unknown'
            };

            // Lokale "Cloud" speichern
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cloudData));
            this.lastSync = Date.now();
            this.isSynced = true;
            this.pending = false;

            if (this.eventBus) {
                this.eventBus.publish('cloud:synced', { timestamp: this.lastSync, userId: this.userId });
            }

            console.log('[CloudSave] Sync erfolgreich', this.lastSync);
            return true;

        } catch (error) {
            console.error('[CloudSave] Sync fehlgeschlagen:', error);
            this.pending = false;
            return false;
        }
    }

    async loadFromCloud() {
        if (!this.isEnabled) return null;

        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const cloudData = JSON.parse(raw);

            if (cloudData.saveData) {
                return cloudData.saveData;
            }
            return null;
        } catch (error) {
            console.error('[CloudSave] Laden aus Cloud fehlgeschlagen:', error);
            return null;
        }
    }

    getCloudInfo() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            return {
                userId: data.userId,
                timestamp: data.timestamp,
                version: data.version,
                device: data.device
            };
        } catch { return null; }
    }

    // ---- MANUELLE METHODEN ----

    async forceSync(saveData) {
        return await this.sync(saveData);
    }

    clearCloudData() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.isSynced = false;
        this.lastSync = null;
        if (this.eventBus) {
            this.eventBus.publish('cloud:cleared', {});
        }
    }

    // ---- SAVE / LOAD ----

    toJSON() {
        return {
            isEnabled: this.isEnabled,
            autoSync: this.autoSync,
            syncInterval: this.syncInterval,
            lastSync: this.lastSync,
            isSynced: this.isSynced,
            userId: this.userId
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.isEnabled = data.isEnabled !== undefined ? data.isEnabled : this.isEnabled;
        this.autoSync = data.autoSync !== undefined ? data.autoSync : this.autoSync;
        this.syncInterval = data.syncInterval || this.syncInterval;
        this.lastSync = data.lastSync || null;
        this.isSynced = data.isSynced || false;
        this.userId = data.userId || this._getUserId();

        localStorage.setItem(this.ENABLED_KEY, String(this.isEnabled));

        if (this.isEnabled && this.autoSync) {
            this.startAutoSync();
        }
    }
}