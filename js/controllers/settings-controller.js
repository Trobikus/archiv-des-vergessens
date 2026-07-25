/**
 * ============================================================
 * FILE: controllers/settings-controller.js
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Verwaltung der Spiel-Einstellungen (Audio, Sprache, etc.)
 * - Ausführung von Hard-Reset und Cloud-Sync
 * ============================================================
 */

import { EVENTS } from '../core/events/definitions.js';
import { setCurrentView } from '../core/state/actions.js';
import { logger } from '../core/logger.js';

/** @typedef {import('../core/events/bus.js').default} EventBus */
/** @typedef {import('../core/state/manager.js').default} StateManager */
/** @typedef {typeof import('../core/persistence/save-manager.js').default} SaveManager */

export class SettingsController {
  /**
   * @param {Object} deps
   * @param {EventBus} deps.eventBus
   * @param {StateManager} deps.stateManager
   * @param {import('../core/settings.js').default} deps.settingsManager
   * @param {import('../core/persistence/cloud-manager.js').default} deps.cloudManager
   * @param {import('../core/services/i18n-service.js').default} [deps.i18nService]
   * @param {SaveManager} deps.saveManager
   * @param {import('../core/services/clan-service.js').default} deps.clanService
   * @param {import('./navigation.js').default} deps.navigationController
   */
  constructor({ eventBus, stateManager, settingsManager, cloudManager, i18nService, saveManager, clanService, navigationController }) {
    this._eventBus = eventBus;
    this._stateManager = stateManager;
    this._settingsManager = settingsManager;
    this._cloudManager = cloudManager;
    this._i18nService = i18nService;
    this._saveManager = saveManager;
    this._clanService = clanService;
    this.navigationController = navigationController;

    this._previousView = null;

    this._bindEvents();
  }

  _bindEvents() {
    this._eventBus.subscribe(EVENTS.MENU_OPTIONS, () => this.showOptions());
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_LANGUAGE, (data) => this._setLanguage(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_PARTICLES, (data) => this._setParticles(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_FLOATING, (data) => this._setFloating(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_TOGGLE_AUDIO, () => this._toggleAudio());
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_MUSIC_VOLUME, (data) => this._setMusicVolume(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_SFX_VOLUME, (data) => this._setSfxVolume(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_AUTOSAVE, (data) => this._setAutosave(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_SET_CLOUD_ENABLED, (data) => this._setCloudEnabled(data.value));
    this._eventBus.subscribe(EVENTS.OPTIONS_SYNC_CLOUD, () => this._syncCloud());
    this._eventBus.subscribe(EVENTS.OPTIONS_HARD_RESET, () => this._hardReset());
    this._eventBus.subscribe(EVENTS.OPTIONS_BACK, () => this._saveAndExitOptions());
  }

  showOptions() {
    const currentView = this._stateManager.getState()?.system?.currentView || 'hub';
    if (currentView !== 'options') {
      this._previousView = (currentView === 'menu' ? 'hub' : currentView);
    }
    this._stateManager.dispatch(setCurrentView('options'));
  }

  _setParticles(val) {
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, particles: val }
    }), 'settings/updateParticles');
    this._settingsManager.save(newState.settings);
  }

  _setFloating(val) {
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, floatingText: val }
    }), 'settings/updateFloatingText');
    this._settingsManager.save(newState.settings);
  }

  _setLanguage(val) {
    if (this._i18nService) {
      this._i18nService.setLanguage(val, false);
    }
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, language: val }
    }), 'settings/updateLanguage');
    this._settingsManager.save(newState.settings);
  }

  _toggleAudio() {
    const settings = this._stateManager.getState()?.settings || {};
    const newVal = !settings.music;
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, music: newVal, sfx: newVal }
    }), 'settings/toggleAudio');
    this._settingsManager.save(newState.settings);
  }

  _setMusicVolume(val) {
    const isMuted = val === 0;
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, music: !isMuted, volume: val / 100 }
    }), 'settings/updateMusicVolume');
    this._settingsManager.save(newState.settings);
  }

  _setSfxVolume(val) {
    const isMuted = val === 0;
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, sfx: !isMuted, sfxVolume: val / 100 }
    }), 'settings/updateSfxVolume');
    this._settingsManager.save(newState.settings);
  }

  _setAutosave(val) {
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, autosave: val }
    }), 'settings/updateAutosave');
    this._settingsManager.save(newState.settings);
  }

  _setCloudEnabled(val) {
    this._cloudManager.setEnabled(val);
    const newState = this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, cloudEnabled: val }
    }), 'settings/updateCloudEnabled');
    this._settingsManager.save(newState.settings);
  }

  async _syncCloud() {
    if (!this._cloudManager.isEnabled()) {
      this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
        message: '⚠️ Cloud-Sync ist deaktiviert. Bitte zuerst aktivieren.',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
      message: '☁️ Synchronisiere mit Cloud...',
      type: 'info',
      duration: 1500
    });
    
    const success = await this._cloudManager.sync(this._stateManager.getState());
    if (success) {
      this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
        message: '💾 Cloud-Sync erfolgreich abgeschlossen!',
        type: 'success',
        duration: 3000
      });
    } else {
      this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
        message: '❌ Cloud-Sync fehlgeschlagen.',
        type: 'error',
        duration: 3000
      });
    }
  }

  _saveAndExitOptions() {
    this._eventBus.publish(EVENTS.SAVE_STARTED);
    const state = this._stateManager.getState();
    this._saveManager.save(state).then(() => {
      logger.info('[Settings] Einstellungen erfolgreich persistent gespeichert.');
    }).catch((err) => {
      logger.error('[Settings] Fehler beim automatischen Speichern der Einstellungen:', err);
    });

    const targetView = this._previousView && this._previousView !== 'options' && this._previousView !== 'menu'
      ? this._previousView
      : 'hub';

    if (targetView === 'characterSelect') {
      this._stateManager.dispatch(setCurrentView('characterSelect'));
    } else if (targetView === 'game') {
      this.navigationController.showGame();
    } else if (targetView === 'login') {
      this._stateManager.dispatch(setCurrentView('login'));
    } else {
      this.navigationController.showHub();
    }
  }

  async _hardReset() {
    if (!(await window.gameConfirm('🚨 ACHTUNG: Möchtest du deinen Spielstand wirklich unwiderruflich löschen? Alle Fortschritte gehen verloren!', 'SPIELSTAND LÖSCHEN'))) return;
    
    await this._saveManager.deleteSave();
    this._cloudManager.clearCloudData();
    this._stateManager.reset();
    this._clanService.reset();
    this._eventBus.publish(EVENTS.GAME_RESET);
    
    await this.navigationController.showMenu();
    this._eventBus.publish(EVENTS.HERO_UPDATED, {});
    this._eventBus.publish(EVENTS.RESOURCES_UPDATED, {});
    this._eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, {});
    
    this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
      message: '🗑️ Spielstand wurde erfolgreich gelöscht.',
      type: 'success',
      duration: 4000
    });
  }
}

export default SettingsController;
