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
   */
  constructor({ eventBus, stateManager, gameLoop, heroService, resourceService, clanService, saveManager }) {
    this._eventBus = eventBus;
    this._stateManager = stateManager;
    this._gameLoop = gameLoop;
    this._heroService = heroService;
    this._resourceService = resourceService;
    this._clanService = clanService;
    this._saveManager = saveManager;

    this._elements = {
      menuContainer: document.getElementById('menu-container'),
      hubContainer: document.getElementById('hub-container'),
      gameContainer: document.getElementById('game-container'),
      optionsContainer: document.getElementById('options-container'),
      btnNewGame: document.getElementById('menu-new-game'),
      btnContinue: document.getElementById('menu-continue'),
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
      newGameInput: document.getElementById('new-game-hero-name'),
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
    });
  }

  // ---- VIEW-WECHSEL ----

  showMenu() {
    this._hideAllViews();
    this._elements.menuContainer.style.display = 'flex';
    this._stateManager.dispatch(setCurrentView('menu'));
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
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

    // Hero zurücksetzen
    this._stateManager.dispatch((state) => {
      const newState = state._getInitialState(); // Achtung: intern – besser über Reset-Methode
      return newState;
    }, 'game/newGame');

    // Hero-Namen setzen
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: { ...state.hero, name }
    }), 'game/setHeroName');

    // Services zurücksetzen
    this._resourceService._stateManager.dispatch((state) => ({
      ...state,
      resources: {
        particles: '0',
        relics: '0',
        artifacts: '0',
        memoryDust: '0',
        catalyst: '0',
        essence: '0',
        timeBank: 0,
        totalParticles: '0',
        totalRelics: '0'
      }
    }), 'game/resetResources');

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

  async _loadGame() {
    const state = await this._saveManager.load();
    if (state) {
      this._stateManager.dispatch(() => state, 'game/load');
      // Expeditionen bereinigen
      this._clanService.cleanupExpeditions();
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
        // Nach Schließen des Modals: Hub anzeigen
      } else {
        this.showHub();
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
    document.getElementById('opt-particles').checked = settings.particles;
    document.getElementById('opt-floating').checked = settings.floatingText;
    document.getElementById('opt-autosave').value = settings.autosave;
    document.getElementById('opt-music-volume').value = settings.music ? 40 : 0;
    document.getElementById('opt-sfx-volume').value = settings.sfx ? 60 : 0;
    // Audio-Toggle
    const audioBtn = document.getElementById('opt-audio-toggle');
    if (audioBtn) audioBtn.textContent = settings.music ? '🔊 Aktiv' : '🔇 Stumm';
  }

  // ---- UI-UPDATES ----

  _updateMenuButtons(state) {
    const hasSave = state.system.lastSave !== null;
    this._elements.btnContinue.disabled = !hasSave;
    this._elements.btnContinue.style.display = hasSave ? 'inline-block' : 'none';
    this._elements.btnNewGame.style.display = hasSave ? 'none' : 'inline-block';
  }

  _updateHubVisibility(state) {
    const hero = state.hero;
    const progress = hero.prestige.bossProgress;
    // Entfalte Gameplay-Elemente basierend auf Boss-Fortschritt
    this._elements.hubArtifact.style.display = progress >= 1 ? 'flex' : 'none';
    this._elements.hubLibrary.style.display = progress >= 1 ? 'flex' : 'none';
    this._elements.hubRelic.style.display = progress >= 3 ? 'flex' : 'none';
    this._elements.hubSkills.style.display = hero.prestige.level > 0 ? 'flex' : 'none';
    this._elements.hubChallenges.style.display = hero.prestige.level > 0 ? 'flex' : 'none';
  }
}

export default NavigationController;