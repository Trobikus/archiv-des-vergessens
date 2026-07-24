// ============================================================
// FILE: js/core/settings.js – Einstellungen (Persistenz-Layer)
// ============================================================
import { EVENTS } from './events/definitions.js';

export default class SettingsManager {
    /**
     * @param {import('./events/bus.js').default} eventBus
     * @param {import('./state/manager.js').default} [stateManager]
     */
    constructor(eventBus, stateManager = null) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.STORAGE_KEY = 'archiv_des_vergessens_settings_v1';
        this.defaultSettings = {
            particles: true,
            floatingText: true,
            autosave: 15000,
            music: true,
            sfx: true,
            volume: 0.7,
            sfxVolume: 0.7,
            cloudEnabled: true,
            cloudInterval: 60000,
            language: 'de'
        };
    }

    setStateManager(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Lädt Einstellungen aus dem localStorage.
     * @returns {Object} Die geladenen oder Standard-Einstellungen
     */
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return { ...this.defaultSettings, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('[Settings] Fehler beim Laden aus localStorage:', error);
        }
        return { ...this.defaultSettings };
    }

    /**
     * Speichert ein Settings-Objekt im localStorage und veröffentlicht EVENTS.SETTINGS_UPDATED.
     * @param {Object} [settings] - Settings-Objekt. Falls weggelassen, wird der State aus StateManager genutzt.
     */
    save(settings = null) {
        try {
            const settingsToSave = settings || (this.stateManager && this.stateManager.isInitialized() ? this.stateManager.getState()?.settings : null);
            if (settingsToSave) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settingsToSave));
                if (this.eventBus) {
                    this.eventBus.publish(EVENTS.SETTINGS_UPDATED, settingsToSave);
                }
            }
        } catch (error) {
            console.error('[Settings] Fehler beim Speichern in localStorage:', error);
        }
    }

    /**
     * Liest den Wert eines Einstellungs-Schlüssels.
     * Nutzt StateManager als Single Source of Truth falls verfügbar.
     * @param {string} key
     * @returns {*}
     */
    get(key) {
        if (this.stateManager && this.stateManager.isInitialized()) {
            const state = this.stateManager.getState();
            if (state && state.settings && state.settings[key] !== undefined) {
                return state.settings[key];
            }
        }
        const loaded = this.load();
        return loaded[key];
    }

    /**
     * Setzt einen Einstellungswert via StateManager Dispatch und speichert im localStorage.
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
        if (this.stateManager && this.stateManager.isInitialized()) {
            this.stateManager.dispatch((state) => ({
                ...state,
                settings: { ...state.settings, [key]: value }
            }), `settings/set_${key}`);
            this.save(this.stateManager.getState().settings);
        } else {
            const current = this.load();
            current[key] = value;
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(current));
                if (this.eventBus) {
                    this.eventBus.publish(EVENTS.SETTINGS_UPDATED, current);
                }
            } catch (error) {
                console.error('[Settings] Fehler beim direkten Setzen im localStorage:', error);
            }
        }
    }
}