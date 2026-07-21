/**
 * ============================================================
 * FILE: controllers/navigation.js – Navigation (v2.0 Preact-Migrated)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - View-Wechsel via State-Updates (Menu, Hub, Game, Options)
 * - Empfang von EventBus-Nachrichten aus Preact-Views
 * - Spielstand-Lade/Start-Schnittstellen
 * - Audio- & Grafik-Einstellungen verwalten
 * ============================================================
 */

import { EVENTS } from '../core/events/definitions.js';
import { setCurrentView } from '../core/state/actions.js';
import { CONFIG } from '../data/config.js';

/** @typedef {import('../core/events/bus.js').default} EventBus */
/** @typedef {import('../core/state/manager.js').default} StateManager */
/** @typedef {import('../core/game/loop.js').default} GameLoop */
/** @typedef {import('../core/services/hero-service.js').default} HeroService */
/** @typedef {import('../core/services/resource-service.js').default} ResourceService */
/** @typedef {import('../core/services/clan-service.js').default} ClanService */
/** @typedef {typeof import('../core/persistence/save-manager.js').default} SaveManager */

export class NavigationController {
  /**
   * @param {Object} deps
   * @param {EventBus} deps.eventBus
   * @param {StateManager} deps.stateManager
   * @param {GameLoop} deps.gameLoop
   * @param {HeroService} deps.heroService
   * @param {ResourceService} deps.resourceService
   * @param {ClanService} deps.clanService
   * @param {SaveManager} deps.saveManager
   * @param {import('../core/settings.js').default} deps.settingsManager
   * @param {import('../core/persistence/cloud-manager.js').default} deps.cloudManager
   */
  constructor({ eventBus, stateManager, gameLoop, heroService, resourceService, clanService, saveManager, settingsManager, cloudManager }) {
    this._eventBus = eventBus;
    this._stateManager = stateManager;
    this._gameLoop = gameLoop;
    this._heroService = heroService;
    this._resourceService = resourceService;
    this._clanService = clanService;
    this._saveManager = saveManager;
    this._settingsManager = settingsManager;
    this._cloudManager = cloudManager;

    this._bindEvents();
  }

  _bindEvents() {
    // --- Menü-Events ---
    this._eventBus.subscribe('menu:newGame', () => this._showNewGameModal());
    this._eventBus.subscribe('menu:continue', () => this._loadGame());
    this._eventBus.subscribe('menu:options', () => this.showOptions());
    this._eventBus.subscribe('menu:quit', () => this._quitGame());
    this._eventBus.subscribe('menu:startNewGame', (data) => this._startNewGame(data.name));

    // --- Options-Events ---
    this._eventBus.subscribe('options:setParticles', (data) => this._setParticles(data.value));
    this._eventBus.subscribe('options:setFloating', (data) => this._setFloating(data.value));
    this._eventBus.subscribe('options:toggleAudio', () => this._toggleAudio());
    this._eventBus.subscribe('options:setMusicVolume', (data) => this._setMusicVolume(data.value));
    this._eventBus.subscribe('options:setSfxVolume', (data) => this._setSfxVolume(data.value));
    this._eventBus.subscribe('options:setAutosave', (data) => this._setAutosave(data.value));
    this._eventBus.subscribe('options:setCloudEnabled', (data) => this._setCloudEnabled(data.value));
    this._eventBus.subscribe('options:syncCloud', () => this._syncCloud());
    this._eventBus.subscribe('options:hardReset', () => this._hardReset());
    this._eventBus.subscribe('options:back', () => this._saveAndExitOptions());

    // --- Hub-Events ---
    this._eventBus.subscribe('hub:backToMenu', () => this.showMenu());
    this._eventBus.subscribe('hub:enterGame', () => this.showGame());

    // --- In-Game-Events ---
    this._eventBus.subscribe('game:manualGather', (data) => this._manualGather(data.clientX, data.clientY));
    this._eventBus.subscribe('game:upgradeClickPower', () => this._upgradeClickPower());
    this._eventBus.subscribe('game:openAchievements', () => this._eventBus.publish(EVENTS.UI_OPEN_ACHIEVEMENTS));
    this._eventBus.subscribe('game:backToHub', () => this.showHub());

    // In-Game Loop Status & Ticks abhören
    let logicTickCount = 0;
    this._eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, (data) => {
      logicTickCount++;
      const tickInfoEl = document.getElementById('tick-info');
      if (tickInfoEl) {
        tickInfoEl.textContent = `Tick: ${logicTickCount} | Δ: ${Math.round(data.delta)}ms`;
      }
      
      const speedIndicatorEl = document.getElementById('speed-indicator');
      if (speedIndicatorEl) {
        const catchupActive = this._gameLoop.isCatchupActive();
        speedIndicatorEl.style.display = catchupActive ? 'inline-block' : 'none';
      }

      this._updateGameLoopStatus();
    });

    // Offline-Modal Schließen (falls DOM offline modal noch besteht, wir behalten die DB-Aktion hier)
    const offlineCloseBtn = document.getElementById('offline-close-btn');
    offlineCloseBtn?.addEventListener('click', () => {
      const modal = document.getElementById('offline-modal-overlay');
      if (modal) modal.style.display = 'none';
      this._resourceService.setTimeBank(0);
    });
  }

  // ---- VIEW-WECHSEL ----

  showMenu() {
    this._stateManager.dispatch(setCurrentView('menu'));
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showHub() {
    this._stateManager.dispatch(setCurrentView('hub'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showGame() {
    this._stateManager.dispatch(setCurrentView('game'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_ENTER_GAME);
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showOptions() {
    this._stateManager.dispatch(setCurrentView('options'));
  }

  // ---- NEUES SPIEL LOGIK ----

  _showNewGameModal() {
    this._eventBus.publish('ui:showNewGameModal');
  }

  _hideNewGameModal() {
    this._eventBus.publish('ui:hideNewGameModal');
  }

  async _startNewGame(name) {
    // Prüfen, ob ein Save existiert – ggf. löschen
    const hasSave = await this._saveManager.hasSave();
    if (hasSave) {
      if (!confirm('Möchtest du den alten Spielstand überschreiben?')) return;
      await this._saveManager.deleteSave();
    }

    // State komplett zurücksetzen
    this._stateManager.reset();

    // Hero-Namen setzen
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: { ...state.hero, name }
    }), 'game/setHeroName');

    // Lokale Service-Zustände zurücksetzen
    this._clanService.reset();

    // Zum Hub navigieren
    this.showHub();
    this._eventBus.publish('hero:updated', {});
    this._eventBus.publish('resources:updated', {});
    this._eventBus.publish('clan:membersUpdated', {});
    this._eventBus.publish('ui:showToast', {
      message: `🌅 Willkommen, ${name}! Deine Reise beginnt.`,
      type: 'success',
      duration: 4000
    });
  }

  // ---- SPIELSTAND LADEN ----

  async _loadGame() {
    const state = await this._saveManager.load();
    if (state) {
      this._stateManager.dispatch(() => state, 'game/load');
      this._clanService.cleanupExpeditions();
      
      // Richtige View basierend auf Tutorial wiederherstellen
      this._navigateToCorrectViewAfterLoad(state);

      // Offline-Zeit berechnen
      const now = Date.now();
      const offlineMs = now - (state.system.lastSave || now);
      if (offlineMs > 60000) {
        const clampedOffline = Math.min(offlineMs, 12 * 60 * 60 * 1000);
        const offlineSeconds = clampedOffline / 1000;
        this._resourceService.setTimeBank(offlineSeconds);
        
        // Offline-Modal einblenden
        const offlineModal = document.getElementById('offline-modal-overlay');
        if (offlineModal) offlineModal.style.display = 'flex';
        
        const offlineTimeVal = document.getElementById('offline-time-val');
        if (offlineTimeVal) offlineTimeVal.textContent = this._formatTime(clampedOffline);
      }
      this._eventBus.publish('ui:showToast', {
        message: '💾 Spielstand geladen!',
        type: 'success',
        duration: 2000
      });
    } else {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Kein Spielstand vorhanden.',
        type: 'warning',
        duration: 2000
      });
    }
  }

  _navigateToCorrectViewAfterLoad(state) {
    const isFinished = state.system?.tutorialFinished === true;
    const step = state.system?.tutorialStep !== undefined ? state.system.tutorialStep : -1;

    if (!isFinished && step >= 0) {
      if (step === 4 || step === 5 || step === 6 || step === 7) {
        this.showGame();
        return;
      }
      if (step === 9) {
        this.showHub();
        setTimeout(() => this._eventBus.publish(EVENTS.UI_OPEN_HERO), 150);
        return;
      }
      if (step === 11) {
        this.showHub();
        setTimeout(() => this._eventBus.publish(EVENTS.UI_OPEN_STORY), 150);
        return;
      }
    }
    this.showHub();
  }

  _formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    let str = '';
    if (hours > 0) str += hours + 'h ';
    if (minutes > 0) str += minutes + 'm ';
    str += seconds + 's';
    return str;
  }

  // ---- BEENDEN ----

  _quitGame() {
    if (confirm('Möchtest du das Spiel wirklich beenden?')) {
      this._eventBus.publish('save:started');
      this._saveManager.save(this._stateManager.getState()).then(() => {
        window.close();
      });
    }
  }

  // ---- OPTIONEN SETTINGS LOGIK ----

  _setParticles(val) {
    this._settingsManager.set('particles', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, particles: val }
    }), 'settings/updateParticles');
  }

  _setFloating(val) {
    this._settingsManager.set('floatingText', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, floatingText: val }
    }), 'settings/updateFloatingText');
  }

  _toggleAudio() {
    const settings = this._stateManager.getState().settings;
    const newVal = !settings.music;
    this._settingsManager.set('music', newVal);
    this._settingsManager.set('sfx', newVal);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, music: newVal, sfx: newVal }
    }), 'settings/toggleAudio');
  }

  _setMusicVolume(val) {
    const isMuted = val === 0;
    this._settingsManager.set('music', !isMuted);
    this._settingsManager.set('volume', val / 100);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, music: !isMuted, volume: val / 100 }
    }), 'settings/updateMusicVolume');
  }

  _setSfxVolume(val) {
    const isMuted = val === 0;
    this._settingsManager.set('sfx', !isMuted);
    this._settingsManager.set('sfxVolume', val / 100);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, sfx: !isMuted, sfxVolume: val / 100 }
    }), 'settings/updateSfxVolume');
  }

  _setAutosave(val) {
    this._settingsManager.set('autosave', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, autosave: val }
    }), 'settings/updateAutosave');
  }

  _setCloudEnabled(val) {
    this._cloudManager.setEnabled(val);
    this._settingsManager.set('cloudEnabled', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, cloudEnabled: val }
    }), 'settings/updateCloudEnabled');
  }

  async _syncCloud() {
    if (!this._cloudManager.isEnabled()) {
      this._eventBus.publish('ui:showToast', {
        message: '⚠️ Cloud-Sync ist deaktiviert. Bitte zuerst aktivieren.',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    this._eventBus.publish('ui:showToast', {
      message: '☁️ Synchronisiere mit Cloud...',
      type: 'info',
      duration: 1500
    });
    
    const success = await this._cloudManager.sync(this._stateManager.getState());
    if (success) {
      this._eventBus.publish('ui:showToast', {
        message: '💾 Cloud-Sync erfolgreich abgeschlossen!',
        type: 'success',
        duration: 3000
      });
    } else {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Cloud-Sync fehlgeschlagen.',
        type: 'error',
        duration: 3000
      });
    }
  }

  _saveAndExitOptions() {
    this._eventBus.publish('save:started');
    const state = this._stateManager.getState();
    this._saveManager.save(state).then(() => {
      console.log('[Settings] Einstellungen erfolgreich persistent gespeichert.');
    }).catch((err) => {
      console.error('[Settings] Fehler beim automatischen Speichern der Einstellungen:', err);
    });
    this.showMenu();
  }

  async _hardReset() {
    if (!confirm('🚨 ACHTUNG: Möchtest du deinen Spielstand wirklich unwiderruflich löschen? Alle Fortschritte gehen verloren!')) return;
    
    await this._saveManager.deleteSave();
    this._cloudManager.clearCloudData();
    this._stateManager.reset();
    this._clanService.reset();
    
    await this.showMenu();
    this._eventBus.publish('hero:updated', {});
    this._eventBus.publish('resources:updated', {});
    this._eventBus.publish('clan:membersUpdated', {});
    
    this._eventBus.publish('ui:showToast', {
      message: '🗑️ Spielstand wurde erfolgreich gelöscht.',
      type: 'success',
      duration: 4000
    });
  }

  // ---- MANUAL GATHER IN-GAME ----

  _manualGather(clientX, clientY) {
    const state = this._stateManager.getState();
    const clickPowerLevel = state.hero.clickPowerLevel || 0;
    const base = CONFIG.GATHER.BASE_AMOUNT + clickPowerLevel * CONFIG.GATHER.POWER_MULT;
    const gatherLevel = state.library.upgrades?.gather_boost || 0;
    const libraryBonus = gatherLevel * 0.10;
    const amount = Math.floor(base * (1 + libraryBonus));

    this._resourceService.addParticles(amount);
    this._eventBus.publish(EVENTS.QUEST_MANUAL_GATHER, {});

    const x = clientX || window.innerWidth / 2;
    const y = clientY || window.innerHeight / 2;
    this._eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, {
      text: `+${amount} Partikel`,
      x,
      y
    });
  }

  _upgradeClickPower() {
    const state = this._stateManager.getState();
    const clickPowerLevel = state.hero.clickPowerLevel || 0;
    const cost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, clickPowerLevel));
    const currentParticles = BigInt(state.resources.particles || '0');

    if (currentParticles < BigInt(cost)) {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Nicht genügend Partikel!',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    this._stateManager.dispatch((s) => {
      const nextClickPowerLevel = (s.hero.clickPowerLevel || 0) + 1;
      const particlesAfter = BigInt(s.resources.particles || '0') - BigInt(cost);
      return {
         ...s,
        resources: {
          ...s.resources,
          particles: String(particlesAfter)
        },
        hero: {
          ...s.hero,
          clickPowerLevel: nextClickPowerLevel
        }
      };
    }, 'hero/upgradeClickPower');

    this._eventBus.publish('ui:showToast', {
      message: '⚡ Klick-Stärke erfolgreich verbessert!',
      type: 'success',
      duration: 2000
    });
    
    this._eventBus.publish('resources:updated', { type: 'particles' });
    this._eventBus.publish('hero:updated', {});
  }

  _updateGameLoopStatus() {
    const statusTextEl = document.getElementById('game-state-text');
    const statusIndicatorEl = document.querySelector('.status-indicator');
    if (statusTextEl) {
      statusTextEl.textContent = this._gameLoop.isRunning() ? 'Running' : 'Paused';
    }
    if (statusIndicatorEl) {
      if (this._gameLoop.isRunning()) {
        statusIndicatorEl.classList.remove('paused');
        statusIndicatorEl.classList.add('running');
      } else {
        statusIndicatorEl.classList.remove('running');
        statusIndicatorEl.classList.add('paused');
      }
    }
  }
}

export default NavigationController;