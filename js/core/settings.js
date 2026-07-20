// ============================================================
// FILE: js/core/settings.js – Einstellungen
// ============================================================
import { EVENTS } from './events/definitions.js';

export default class SettingsManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.STORAGE_KEY = 'archiv_des_vergessens_settings_v1';
        this.settings = {
            particles: true,
            floatingText: true,
            autosave: 15000,
            music: true,
            sfx: true,
            volume: 0.7,
            cloudEnabled: true,
            cloudInterval: 60000
        };
        this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                this.settings = { ...this.settings, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('[Settings] Fehler beim Laden:', error);
        }
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
            this.eventBus.publish(EVENTS.SETTINGS_UPDATED, this.settings);
        } catch (error) {
            console.error('[Settings] Fehler beim Speichern:', error);
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }
}