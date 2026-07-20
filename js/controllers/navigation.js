/**
 * ============================================================
 * FILE: controllers/navigation.js – Navigation (v2.0)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - View-Wechsel (Menu, Hub, Game, Options)
 * - Menu-Buttons (Neu/Weiter)
 * - Hub-Tabs
 * - Rückkehr zur Hauptmenü
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

    this._elements = {
      menuContainer: document.getElementById('menu-container'),
      hubContainer: document.getElementById('hub-container'),
      gameContainer: document.getElementById('game-container'),
      optionsContainer: document.getElementById('options-container'),
      btnNewGame: document.getElementById('menu-new-game'),
      btnContinue: /** @type {HTMLButtonElement} */ (document.getElementById('menu-continue')),
      btnOptions: document.getElementById('menu-options'),
      btnQuit: document.getElementById('menu-quit'),
      btnHubBack: document.getElementById('hub-back-to-menu'),
      btnBackToHub: document.getElementById('back-to-hub-btn'),
      btnOptionsBack: document.getElementById('options-back-btn'),
      hubArchive: document.getElementById('hub-archive'),
      hubHero: document.getElementById('hub-hero'),
      hubStory: document.getElementById('hub-story'),
      hubArtifact: document.getElementById('hub-artifact'),
      hubRelic: document.getElementById('hub-relic'),
      hubSkills: document.getElementById('hub-skills'),
      hubChallenges: document.getElementById('hub-challenges'),
      hubLibrary: document.getElementById('hub-library'),
      hubCrafting: document.getElementById('hub-crafting'),
      hubLeaderboard: document.getElementById('hub-leaderboard'),
      hubStoryBranch: document.getElementById('hub-story-branch'),
      hubCodex: document.getElementById('hub-codex'),
      hubGuild: document.getElementById('hub-guild'),
      hubFriends: document.getElementById('hub-friends'),
      hubChat: document.getElementById('hub-chat'),
      newGameModal: document.getElementById('new-game-modal-overlay'),
      newGameInput: /** @type {HTMLInputElement} */ (document.getElementById('new-game-hero-name')),
      newGameStart: document.getElementById('new-game-start-btn'),
      newGameCancel: document.getElementById('new-game-cancel-btn'),
      offlineModal: document.getElementById('offline-modal-overlay'),
      offlineClose: document.getElementById('offline-close-btn')
    };

    this._bindEvents();
    this._stateManager.dispatch(setCurrentView('menu'));
  }

  _bindEvents() {
    // Hauptmenü
    this._elements.btnNewGame?.addEventListener('click', () => this._showNewGameModal());
    this._elements.btnContinue?.addEventListener('click', () => this._loadGame());
    this._elements.btnOptions?.addEventListener('click', () => this.showOptions());
    this._elements.btnQuit?.addEventListener('click', () => this._quitGame());
    this._elements.btnOptionsBack?.addEventListener('click', () => this.showMenu());
    this._elements.btnHubBack?.addEventListener('click', () => this.showMenu());
    this._elements.btnBackToHub?.addEventListener('click', () => this.showHub());

    // Optionen-Events binden
    this._bindOptionsEvents();

    // Hub-Buttons
    this._elements.hubArchive?.addEventListener('click', () => this.showGame());
    this._elements.hubHero?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_HERO));
    this._elements.hubStory?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_STORY));
    this._elements.hubArtifact?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_FORGE));
    this._elements.hubRelic?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_RELICHUNT));
    this._elements.hubSkills?.addEventListener('click', () => this._eventBus.publish('ui:openSkillTree'));
    this._elements.hubChallenges?.addEventListener('click', () => this._eventBus.publish('ui:openChallenges'));
    this._elements.hubLibrary?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_LIBRARY));
    this._elements.hubCrafting?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_CRAFTING));
    this._elements.hubLeaderboard?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_LEADERBOARD));
    this._elements.hubStoryBranch?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_DIALOG, { npcId: 'archivist' }));
    this._elements.hubCodex?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_CODEX));
    this._elements.hubGuild?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_GUILD));
    this._elements.hubFriends?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_FRIENDS));
    this._elements.hubChat?.addEventListener('click', () => this._eventBus.publish(EVENTS.UI_OPEN_CHAT));

    // Hub-Tabs (Kategorie-Reiter Wechsel)
    const tabButtons = document.querySelectorAll('.hub-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        if (!category) return;

        // Active-Klasse bei Tab-Buttons umschalten
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Kategorien ein-/ausblenden
        const categories = document.querySelectorAll('.hub-category');
        categories.forEach(cat => {
          const htmlCat = /** @type {HTMLElement} */ (cat);
          if (htmlCat.id === `hub-category-${category}`) {
            htmlCat.style.display = 'block';
          } else {
            htmlCat.style.display = 'none';
          }
        });
      });
    });

    // In-Game Buttons (Mneme-Partikel extrahieren, Klick-Stärke verbessern, Erfolge)
    const manualGatherBtn = document.getElementById('manual-gather-btn');
    const upgradeClickBtn = document.getElementById('upgrade-click-btn');
    const openAchievementsBtn = document.getElementById('open-achievements-btn');
    
    let lastGatherTime = 0;
    manualGatherBtn?.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastGatherTime < (CONFIG.GATHER.COOLDOWN_MS || 40)) return;
      lastGatherTime = now;

      const state = this._stateManager.getState();
      const clickPowerLevel = state.hero.clickPowerLevel || 0;
      const base = CONFIG.GATHER.BASE_AMOUNT + clickPowerLevel * CONFIG.GATHER.POWER_MULT;
      const gatherLevel = state.library.upgrades?.gather_boost || 0;
      const libraryBonus = gatherLevel * 0.10;
      const amount = Math.floor(base * (1 + libraryBonus));

      // Partikel hinzufügen
      this._resourceService.addParticles(amount);
      
      // Quest Fortschritt melden
      this._eventBus.publish(EVENTS.QUEST_MANUAL_GATHER, {});
      
      // Floating-Text spawnen
      const x = e.clientX || window.innerWidth / 2;
      const y = e.clientY || window.innerHeight / 2;
      this._eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, {
        text: `+${amount} Partikel`,
        x,
        y
      });
    });

    upgradeClickBtn?.addEventListener('click', () => {
      this._upgradeClickPower();
    });

    openAchievementsBtn?.addEventListener('click', () => {
      this._eventBus.publish(EVENTS.UI_OPEN_ACHIEVEMENTS);
    });

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

    // New Game Modal
    this._elements.newGameCancel?.addEventListener('click', () => this._hideNewGameModal());
    this._elements.newGameStart?.addEventListener('click', () => this._startNewGame());
    this._elements.newGameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._startNewGame();
    });

    // Offline-Modal
    this._elements.offlineClose?.addEventListener('click', () => {
      this._elements.offlineModal.style.display = 'none';
      this._resourceService.setTimeBank(0);
    });

    // State-Änderungen abhören
    this._stateManager.subscribe((state) => {
      this._updateMenuButtons(state);
      this._updateHubVisibility(state);
      this._updateGameResourceDisplays(state);
    });
  }

  // ---- VIEW-WECHSEL ----

  async showMenu() {
    this._hideAllViews();
    this._elements.menuContainer.style.display = 'flex';
    this._stateManager.dispatch(setCurrentView('menu'));
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);

    // Direkt die IndexedDB prüfen – nicht den In-Memory-State.
    // So ist der Button-Status nach Löschen des Saves immer korrekt.
    try {
      const hasSave = await this._saveManager.hasSave();
      this._setMenuButtonsForSaveState(hasSave);
    } catch (e) {
      // Im Fehlerfall sicherer Fallback: Neues Spiel anzeigen
      this._setMenuButtonsForSaveState(false);
    }
  }

  showHub() {
    this._hideAllViews();
    this._elements.hubContainer.style.display = 'flex';
    this._stateManager.dispatch(setCurrentView('hub'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showGame() {
    this._hideAllViews();
    this._elements.gameContainer.style.display = 'flex';
    this._elements.gameContainer.classList.add('active');
    this._stateManager.dispatch(setCurrentView('game'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_ENTER_GAME);
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showOptions() {
    this._hideAllViews();
    this._elements.optionsContainer.style.display = 'flex';
    this._stateManager.dispatch(setCurrentView('options'));
    // Optionen-Werte aus Settings laden
    this._loadOptionsFromSettings();
  }

  _hideAllViews() {
    this._elements.menuContainer.style.display = 'none';
    this._elements.hubContainer.style.display = 'none';
    this._elements.gameContainer.style.display = 'none';
    this._elements.optionsContainer.style.display = 'none';
    this._elements.gameContainer.classList.remove('active');
  }

  // ---- NEUES SPIEL ----

  _showNewGameModal() {
    this._elements.newGameModal.style.display = 'flex';
    this._elements.newGameInput.value = 'Der Mneme-Bund';
    setTimeout(() => {
      this._elements.newGameInput.focus();
      this._elements.newGameInput.select();
    }, 100);
  }

  _hideNewGameModal() {
    this._elements.newGameModal.style.display = 'none';
  }

  async _startNewGame() {
    const name = this._elements.newGameInput.value.trim() || 'Der Mneme-Bund';
    this._hideNewGameModal();

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

    // Lokale Service-Zustände zurücksetzen (z.B. aktive Expeditionen)
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

  // ---- LADEN ----

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
        setTimeout(() => {
          this._eventBus.publish(EVENTS.UI_OPEN_HERO);
        }, 150);
        return;
      }
      if (step === 11) {
        this.showHub();
        setTimeout(() => {
          this._eventBus.publish(EVENTS.UI_OPEN_STORY);
        }, 150);
        return;
      }
    }
    this.showHub();
  }

  async _loadGame() {
    const state = await this._saveManager.load();
    if (state) {
      this._stateManager.dispatch(() => state, 'game/load');
      // Expeditionen bereinigen
      this._clanService.cleanupExpeditions();
      
      // Richtige View/Menü basierend auf Tutorial-Fortschritt wiederherstellen
      this._navigateToCorrectViewAfterLoad(state);

      // Offline-Zeit berechnen
      const now = Date.now();
      const offlineMs = now - (state.system.lastSave || now);
      if (offlineMs > 60000) {
        const clampedOffline = Math.min(offlineMs, 12 * 60 * 60 * 1000);
        const offlineSeconds = clampedOffline / 1000;
        this._resourceService.setTimeBank(offlineSeconds);
        // Offline-Modal anzeigen (optional)
        this._elements.offlineModal.style.display = 'flex';
        document.getElementById('offline-time-val').textContent = this._formatTime(clampedOffline);
        document.getElementById('offline-particles-val').textContent = '...'; // später berechnen
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

  // ---- OPTIONEN ----

  _loadOptionsFromSettings() {
    const settings = this._stateManager.getState().settings;
    const particlesEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-particles'));
    if (particlesEl) particlesEl.checked = settings.particles;
    
    const floatingEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-floating'));
    if (floatingEl) floatingEl.checked = settings.floatingText;
    
    const autosaveEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-autosave'));
    if (autosaveEl) autosaveEl.value = String(settings.autosave);
    
    const musicVolEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-music-volume'));
    if (musicVolEl) musicVolEl.value = String(settings.music ? 40 : 0);
    
    const sfxVolEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-sfx-volume'));
    if (sfxVolEl) sfxVolEl.value = String(settings.sfx ? 60 : 0);
    
    // Audio-Toggle
    const audioBtn = document.getElementById('opt-audio-toggle');
    if (audioBtn) audioBtn.textContent = settings.music ? '🔊 Aktiv' : '🔇 Stumm';

    // Cloud-Sync
    const cloudEnabledEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-cloud-enabled'));
    if (cloudEnabledEl) cloudEnabledEl.checked = this._cloudManager.isEnabled();

    const cloudInfo = this._cloudManager.getCloudInfo();
    const lastSyncEl = document.getElementById('opt-cloud-last-sync');
    if (lastSyncEl) {
      lastSyncEl.textContent = cloudInfo ? new Date(cloudInfo.timestamp).toLocaleString() : 'Nie';
    }
  }

  _bindOptionsEvents() {
    // Mystisches Netzwerk (Partikel)
    document.getElementById('opt-particles')?.addEventListener('change', (e) => {
      const val = /** @type {HTMLInputElement} */ (e.target).checked;
      this._settingsManager.set('particles', val);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, particles: val }
      }), 'settings/updateParticles');
    });

    // Floating-Text
    document.getElementById('opt-floating')?.addEventListener('change', (e) => {
      const val = /** @type {HTMLInputElement} */ (e.target).checked;
      this._settingsManager.set('floatingText', val);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, floatingText: val }
      }), 'settings/updateFloatingText');
    });

    // Audio-Toggle
    document.getElementById('opt-audio-toggle')?.addEventListener('click', () => {
      const settings = this._stateManager.getState().settings;
      const newVal = !settings.music;
      this._settingsManager.set('music', newVal);
      this._settingsManager.set('sfx', newVal);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, music: newVal, sfx: newVal }
      }), 'settings/toggleAudio');
      
      const audioBtn = document.getElementById('opt-audio-toggle');
      if (audioBtn) audioBtn.textContent = newVal ? '🔊 Aktiv' : '🔇 Stumm';
      
      const musicVolEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-music-volume'));
      if (musicVolEl) musicVolEl.value = String(newVal ? 40 : 0);
      
      const sfxVolEl = /** @type {HTMLInputElement} */ (document.getElementById('opt-sfx-volume'));
      if (sfxVolEl) sfxVolEl.value = String(newVal ? 60 : 0);
    });

    // Musik-Lautstärke
    document.getElementById('opt-music-volume')?.addEventListener('input', (e) => {
      const val = parseInt(/** @type {HTMLInputElement} */ (e.target).value, 10);
      const isMuted = val === 0;
      this._settingsManager.set('music', !isMuted);
      this._settingsManager.set('volume', val / 100);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, music: !isMuted, volume: val / 100 }
      }), 'settings/updateMusicVolume');
      
      const audioBtn = document.getElementById('opt-audio-toggle');
      if (audioBtn) audioBtn.textContent = !isMuted ? '🔊 Aktiv' : '🔇 Stumm';
    });

    // SFX-Lautstärke
    document.getElementById('opt-sfx-volume')?.addEventListener('input', (e) => {
      const val = parseInt(/** @type {HTMLInputElement} */ (e.target).value, 10);
      const isMuted = val === 0;
      this._settingsManager.set('sfx', !isMuted);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, sfx: !isMuted }
      }), 'settings/updateSfxVolume');
    });

    // Autosave-Intervall
    document.getElementById('opt-autosave')?.addEventListener('change', (e) => {
      const val = parseInt(/** @type {HTMLInputElement} */ (e.target).value, 10);
      this._settingsManager.set('autosave', val);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, autosave: val }
      }), 'settings/updateAutosave');
    });

    // Cloud-Sync
    document.getElementById('opt-cloud-enabled')?.addEventListener('change', (e) => {
      const val = /** @type {HTMLInputElement} */ (e.target).checked;
      this._cloudManager.setEnabled(val);
      this._settingsManager.set('cloudEnabled', val);
      this._stateManager.dispatch((state) => ({
        ...state,
        settings: { ...state.settings, cloudEnabled: val }
      }), 'settings/updateCloudEnabled');
    });

    // Manuell synchronisieren
    document.getElementById('opt-cloud-sync-btn')?.addEventListener('click', async () => {
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
        const cloudInfo = this._cloudManager.getCloudInfo();
        const lastSyncEl = document.getElementById('opt-cloud-last-sync');
        if (lastSyncEl && cloudInfo) {
          lastSyncEl.textContent = new Date(cloudInfo.timestamp).toLocaleString();
        }
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
    });

    // Spielstand verwerfen
    document.getElementById('opt-hard-reset')?.addEventListener('click', () => {
      this._hardReset();
    });
  }

  async _hardReset() {
    if (!confirm('🚨 ACHTUNG: Möchtest du deinen Spielstand wirklich unwiderruflich löschen? Alle Fortschritte gehen verloren!')) return;
    
    // Spielstand in DB löschen
    await this._saveManager.deleteSave();
    
    // Cloud-Daten zurücksetzen
    this._cloudManager.clearCloudData();
    
    // State komplett zurücksetzen
    this._stateManager.reset();
    
    // Lokale Service-Zustände zurücksetzen
    this._clanService.reset();
    
    // UI refreshen & zum Hauptmenü navigieren
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

  // ---- UI-UPDATES ----

  /**
   * Setzt die Menü-Buttons basierend auf dem echten Save-Zustand (IndexedDB).
   * Wird von showMenu() nach einem async hasSave()-Check aufgerufen.
   */
  _setMenuButtonsForSaveState(hasSave) {
    this._elements.btnContinue.disabled = !hasSave;
    this._elements.btnContinue.style.display = hasSave ? 'inline-block' : 'none';
    this._elements.btnNewGame.style.display = hasSave ? 'none' : 'inline-block';
  }

  /**
   * Wird bei jedem State-Update aufgerufen.
   * Aktualisiert die Menü-Buttons NICHT mehr (das übernimmt showMenu via hasSave()),
   * um zu vermeiden, dass der In-Memory-State den DB-Zustand überschreibt.
   */
  _updateMenuButtons(_state) {
    // Buttons werden nur noch in showMenu() via _setMenuButtonsForSaveState() gesetzt.
    // Kein In-Memory-State-Check mehr, da dieser nach einem externen Löschen falsch sein kann.
  }

  _updateHubVisibility(state) {
    const hero = state.hero;
    const progress = hero.prestige.bossProgress;

    // Hub Player Card aktualisieren
    const nameEl = document.getElementById('hub-hero-name');
    const levelEl = document.getElementById('hub-level');
    const prestigeEl = document.getElementById('hub-prestige');
    const lvlNumEl = document.getElementById('hub-level-number');
    const guildBadge = document.getElementById('hub-guild-badge');
    
    if (nameEl) nameEl.textContent = hero.name;
    if (levelEl) levelEl.textContent = hero.level;
    if (prestigeEl) prestigeEl.textContent = hero.prestige.level;
    if (lvlNumEl) lvlNumEl.textContent = hero.level;
    if (guildBadge) {
      guildBadge.style.display = state.guild?.id ? 'inline-block' : 'none';
    }

    // Entfalte Gameplay-Elemente basierend auf Boss-Fortschritt
    this._elements.hubArtifact.style.display = progress >= 1 ? 'flex' : 'none';
    this._elements.hubLibrary.style.display = progress >= 1 ? 'flex' : 'none';
    this._elements.hubRelic.style.display = progress >= 3 ? 'flex' : 'none';
    this._elements.hubSkills.style.display = hero.prestige.level > 0 ? 'flex' : 'none';
    this._elements.hubChallenges.style.display = hero.prestige.level > 0 ? 'flex' : 'none';
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

  _updateGameResourceDisplays(state) {
    if (state.system.currentView !== 'game') return;
    
    const particlesEl = document.getElementById('particle-display');
    const relicsEl = document.getElementById('relic-display');
    const artifactsEl = document.getElementById('node-artifact-display');
    const upgradeClickBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('upgrade-click-btn'));
    
    if (particlesEl) particlesEl.textContent = state.resources.particles;
    if (relicsEl) relicsEl.textContent = state.resources.relics;
    if (artifactsEl) artifactsEl.textContent = state.resources.artifacts;
    
    if (upgradeClickBtn) {
      const clickPowerLevel = state.hero.clickPowerLevel || 0;
      const cost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, clickPowerLevel));
      
      upgradeClickBtn.textContent = `Klick-Stärke verbessern (Kosten: ${cost} Partikel)`;
      
      const currentParticles = BigInt(state.resources.particles || '0');
      upgradeClickBtn.disabled = currentParticles < BigInt(cost);
    }
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