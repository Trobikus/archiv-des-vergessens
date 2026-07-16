// ============================================================
// FILE: controllers/navigation.js – vollständig mit safeAddEventListener
// ============================================================
import { EVENTS } from '../core/events.js';
import { safeAddEventListener } from '../ui/errorHandler.js';

export default class NavigationController {
  constructor(context, elements, callbacks) {
    this.eventBus = context.eventBus;
    this.settingsManager = context.settingsManager;
    this.gameLoop = context.gameLoop;
    this.gameStateManager = context.gameStateManager;
    this.hero = context.hero;

    this.elements = elements;
    this.callbacks = callbacks;
    this.bindEvents();

    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this.updateNotifications());
  }

  bindEvents() {
    safeAddEventListener(this.elements.btnNewGame, 'click', () => {
      if (!this.elements.newGameModalOverlay) return;
      this.elements.newGameModalOverlay.style.display = 'flex';
      if (this.elements.newGameInput) {
        this.elements.newGameInput.value = 'Der Mneme-Bund';
        setTimeout(() => {
          this.elements.newGameInput.focus();
          this.elements.newGameInput.select();
        }, 100);
      }
    });

    safeAddEventListener(this.elements.newGameCancelBtn, 'click', () => {
      if (this.elements.newGameModalOverlay) {
        this.elements.newGameModalOverlay.style.display = 'none';
      }
    });

    safeAddEventListener(this.elements.newGameInput, 'keypress', (e) => {
      if (e.key === 'Enter' && this.elements.newGameStartBtn) {
        this.elements.newGameStartBtn.click();
      }
    });

    safeAddEventListener(this.elements.newGameStartBtn, 'click', () => {
      const heroName = this.elements.newGameInput?.value?.trim() || 'Der Mneme-Bund';
      if (this.elements.newGameModalOverlay) {
        this.elements.newGameModalOverlay.style.display = 'none';
      }
      if (this.callbacks.onNewGame) this.callbacks.onNewGame(heroName);
    });

    safeAddEventListener(this.elements.btnContinue, 'click', () => {
      if (this.callbacks.onLoad) this.callbacks.onLoad();
    });

    safeAddEventListener(this.elements.btnOptions, 'click', () => this.showOptions());
    safeAddEventListener(this.elements.btnOptionsBack, 'click', () => this.showMenu());
    safeAddEventListener(this.elements.btnHubArchive, 'click', () => this.showGame());

    safeAddEventListener(this.elements.btnHubBack, 'click', () => {
      if (this.callbacks.onSave) this.callbacks.onSave();
      this.showMenu();
    });

    safeAddEventListener(this.elements.btnBackToHub, 'click', () => {
      if (this.callbacks.onSave) this.callbacks.onSave();
      this.showHub();
    });

    safeAddEventListener(this.elements.btnOfflineClose, 'click', () => {
      if (this.elements.offlineModalOverlay) {
        this.elements.offlineModalOverlay.style.display = 'none';
      }
    });

    safeAddEventListener(this.elements.btnQuit, 'click', () => {
      if (confirm('Möchtest du das Spiel wirklich beenden?')) {
        if (this.callbacks.onSave) this.callbacks.onSave();
        window.close();
      }
    });

    // Optionen
    const optParticles = document.getElementById('opt-particles');
    safeAddEventListener(optParticles, 'change', (e) => {
      this.settingsManager.set('particles', e.target.checked);
    });

    const optFloating = document.getElementById('opt-floating');
    safeAddEventListener(optFloating, 'change', (e) => {
      this.settingsManager.set('floatingText', e.target.checked);
    });

    const optAutosave = document.getElementById('opt-autosave');
    safeAddEventListener(optAutosave, 'change', (e) => {
      this.settingsManager.set('autosave', e.target.value);
    });

    const optHardReset = document.getElementById('opt-hard-reset');
    safeAddEventListener(optHardReset, 'click', async () => {
      if (confirm('WARNUNG! Möchtest du deinen kompletten Spielstand UNWIDERRUFLICH löschen?')) {
        if (this.callbacks.onHardReset) this.callbacks.onHardReset();
      }
    });
  }

  showMenu() {
    if (this.elements.menuContainer) this.elements.menuContainer.style.display = 'flex';
    if (this.elements.hubContainer) this.elements.hubContainer.style.display = 'none';
    if (this.elements.optionsContainer) this.elements.optionsContainer.style.display = 'none';
    if (this.elements.gameContainer) {
      this.elements.gameContainer.classList.remove('active');
      this.elements.gameContainer.style.display = 'none';
    }
    if (this.gameLoop.isRunning()) this.gameLoop.stop();
    this.updateMenuButtons();
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showHub() {
    if (this.elements.menuContainer) this.elements.menuContainer.style.display = 'none';
    if (this.elements.hubContainer) this.elements.hubContainer.style.display = 'flex';
    if (this.elements.optionsContainer) this.elements.optionsContainer.style.display = 'none';
    if (this.elements.gameContainer) {
      this.elements.gameContainer.classList.remove('active');
      this.elements.gameContainer.style.display = 'none';
    }

    if (!this.gameLoop.isRunning()) {
      this.gameStateManager.transitionTo('running');
      this.gameLoop.start();
    }

    this.updateMenuButtons();
    this.updateUnfoldingGameplay();
    this.updateNotifications();
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showGame() {
    if (this.elements.menuContainer) this.elements.menuContainer.style.display = 'none';
    if (this.elements.hubContainer) this.elements.hubContainer.style.display = 'none';
    if (this.elements.optionsContainer) this.elements.optionsContainer.style.display = 'none';
    if (this.elements.gameContainer) {
      this.elements.gameContainer.classList.add('active');
      this.elements.gameContainer.style.display = 'flex';
    }

    if (!this.gameLoop.isRunning()) {
      this.gameStateManager.transitionTo('running');
      this.gameLoop.start();
    }

    if (this.callbacks.onGameStart) this.callbacks.onGameStart();
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
    this.eventBus.publish(EVENTS.UI_ENTER_GAME);
  }

  showOptions() {
    if (this.elements.menuContainer) this.elements.menuContainer.style.display = 'none';
    if (this.elements.hubContainer) this.elements.hubContainer.style.display = 'none';
    if (this.elements.gameContainer) {
      this.elements.gameContainer.classList.remove('active');
      this.elements.gameContainer.style.display = 'none';
    }
    if (this.elements.optionsContainer) this.elements.optionsContainer.style.display = 'flex';

    const optParticles = document.getElementById('opt-particles');
    const optFloating = document.getElementById('opt-floating');
    const optAutosave = document.getElementById('opt-autosave');

    if (optParticles) optParticles.checked = this.settingsManager.get('particles');
    if (optFloating) optFloating.checked = this.settingsManager.get('floatingText');
    if (optAutosave) optAutosave.value = this.settingsManager.get('autosave');

    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  async updateMenuButtons() {
    const hasSave = await this.callbacks.hasSaveGame();
    if (this.elements.btnContinue) this.elements.btnContinue.disabled = !hasSave;
    if (this.elements.btnNewGame) this.elements.btnNewGame.style.display = hasSave ? 'none' : 'block';
  }

  updateUnfoldingGameplay() {
    if (this.elements.btnHubArtifact) {
      this.elements.btnHubArtifact.style.display = this.hero.bossProgress >= 1 ? 'flex' : 'none';
    }
    if (this.elements.btnHubLibrary) {
      this.elements.btnHubLibrary.style.display = this.hero.bossProgress >= 1 ? 'flex' : 'none';
    }
    if (this.elements.btnHubRelic) {
      this.elements.btnHubRelic.style.display = this.hero.bossProgress >= 3 ? 'flex' : 'none';
    }
    if (this.elements.btnHubSkills) {
      this.elements.btnHubSkills.style.display = this.hero.prestigeLevel > 0 ? 'flex' : 'none';
    }
    if (this.elements.btnHubChallenges) {
      this.elements.btnHubChallenges.style.display = this.hero.prestigeLevel > 0 ? 'flex' : 'none';
    }
  }

  updateNotifications() {
    if (!this.elements.btnHubHero) return;
    if (this.hero.unspentStatPoints > 0) {
      if (!this.elements.btnHubHero.querySelector('.notification-dot')) {
        this.elements.btnHubHero.insertAdjacentHTML('beforeend', '<span class="notification-dot"></span>');
      }
    } else {
      const dot = this.elements.btnHubHero.querySelector('.notification-dot');
      if (dot) dot.remove();
    }
  }
}