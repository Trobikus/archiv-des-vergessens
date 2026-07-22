import { DE } from '../../data/locales/de.js';
import { EN } from '../../data/locales/en.js';

export default class I18nService {
    constructor(eventBus, settingsManager) {
        this.eventBus = eventBus;
        this.settingsManager = settingsManager;
        this.locales = {
            de: DE,
            en: EN
        };
        
        // Initialisiere Sprache aus Einstellungen or System/Default ('de')
        const savedLang = this.settingsManager ? this.settingsManager.get('language') : 'de';
        this.currentLang = savedLang || 'de';

        if (this.eventBus) {
            this.eventBus.subscribe('settings:updated', (newSettings) => {
                if (newSettings && newSettings.language && newSettings.language !== this.currentLang) {
                    this.setLanguage(newSettings.language, false);
                }
            });
        }
    }

    setLanguage(lang, updateSettings = true) {
        if (!this.locales[lang]) return;
        this.currentLang = lang;
        if (updateSettings && this.settingsManager) {
            this.settingsManager.set('language', lang);
        }
        if (this.eventBus) {
            this.eventBus.publish('i18n:languageChanged', { language: lang });
        }
    }

    getLanguage() {
        return this.currentLang;
    }

    t(key, fallback = '') {
        const dictionary = this.locales[this.currentLang] || this.locales.de;
        if (dictionary && dictionary[key] !== undefined) {
            return dictionary[key];
        }
        // Fallback zu Deutsch
        if (this.locales.de && this.locales.de[key] !== undefined) {
            return this.locales.de[key];
        }
        return fallback || key;
    }
}
