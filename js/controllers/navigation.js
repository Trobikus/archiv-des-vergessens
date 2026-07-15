import { EVENTS } from '../core/events.js';

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
    this.elements.btnNewGame.addEventListener('click', () => {
      this.elements.newGameModalOverlay.style.display = 'flex';
      this.elements.newGameInput.value = 'Der Mneme-Bund';
      setTimeout(() => { this.elements.newGameInput.focus(); this.elements.newGameInput.select(); }, 100);
    });

    this.elements.newGameCancelBtn.addEventListener('click', () => {
      this.elements.newGameModalOverlay.style.display = 'none';
    });

    this.elements.newGameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.elements.newGameStartBtn.click();
    });

    this.elements.newGameStartBtn.addEventListener('click', () => {
      const heroName = this.elements.newGameInput.value.trim() || 'Der Mneme-Bund';
      this.elements.newGameModalOverlay.style.display = 'none';
      if (this.callbacks.onNewGame) this.callbacks.onNewGame(heroName);
    });

    this.elements.btnContinue.addEventListener('click', () => {
      if (this.callbacks.onLoad) this.callbacks.onLoad();
    });

    this.elements.btnOptions.addEventListener('click', () => this.showOptions());
    this.elements.btnOptionsBack.addEventListener('click', () => this.showMenu());
    this.elements.btnHubArchive.addEventListener('click', () => this.showGame());

    this.elements.btnHubBack.addEventListener('click', () => {
      if (this.callbacks.onSave) this.callbacks.onSave();
      this.showMenu();
    });

    this.elements.btnBackToHub.addEventListener('click', () => {
      if (this.callbacks.onSave) this.callbacks.onSave();
      this.showHub();
    });

    this.elements.btnOfflineClose.addEventListener('click', () => {
      this.elements.offlineModalOverlay.style.display = 'none';
    });

    this.elements.btnQuit.addEventListener('click', () => {
      if (confirm('Möchtest du das Spiel wirklich beenden?')) {
        if (this.callbacks.onSave) this.callbacks.onSave();
        window.close();
      }
    });

    const optParticles = document.getElementById('opt-particles');
    if (optParticles) {
      optParticles.addEventListener('change', (e) => {
        this.settingsManager.set('particles', e.target.checked);
      });
    }

    const optFloating = document.getElementById('opt-floating');
    if (optFloating) {
      optFloating.addEventListener('change', (e) => {
        this.settingsManager.set('floatingText', e.target.checked);
      });
    }

    const optAutosave = document.getElementById('opt-autosave');
    if (optAutosave) {
      optAutosave.addEventListener('change', (e) => {
        this.settingsManager.set('autosave', e.target.value);
      });
    }

    const optHardReset = document.getElementById('opt-hard-reset');
    if (optHardReset) {
      optHardReset.addEventListener('click', async () => {
        if (confirm('WARNUNG! Möchtest du deinen kompletten Spielstand UNWIDERRUFLICH löschen?')) {
          if (this.callbacks.onHardReset) this.callbacks.onHardReset();
        }
      });
    }
  }

  showMenu() {
    this.elements.menuContainer.style.display = 'flex';
    this.elements.hubContainer.style.display = 'none';
    this.elements.optionsContainer.style.display = 'none';
    this.elements.gameContainer.classList.remove('active');
    this.elements.gameContainer.style.display = 'none';
    if (this.gameLoop.isRunning()) this.gameLoop.stop();
    this.updateMenuButtons();
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showHub() {
    this.elements.menuContainer.style.display = 'none';
    this.elements.hubContainer.style.display = 'flex';
    this.elements.optionsContainer.style.display = 'none';
    this.elements.gameContainer.classList.remove('active');
    this.elements.gameContainer.style.display = 'none';
    if (this.gameLoop.isRunning()) this.gameLoop.stop();
    this.updateMenuButtons();
    this.updateUnfoldingGameplay();
    this.updateNotifications();
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showGame() {
    this.elements.menuContainer.style.display = 'none';
    this.elements.hubContainer.style.display = 'none';
    this.elements.optionsContainer.style.display = 'none';
    this.elements.gameContainer.classList.add('active');
    this.elements.gameContainer.style.display = 'flex';

    if (!this.gameLoop.isRunning()) {
      this.gameStateManager.transitionTo('running');
      this.gameLoop.start();
    }

    if (this.callbacks.onGameStart) this.callbacks.onGameStart();
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
    this.eventBus.publish(EVENTS.UI_ENTER_GAME);
  }

  showOptions() {
    this.elements.menuContainer.style.display = 'none';
    this.elements.hubContainer.style.display = 'none';
    this.elements.gameContainer.classList.remove('active');
    this.elements.gameContainer.style.display = 'none';
    this.elements.optionsContainer.style.display = 'flex';
    
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
    if (this.elements.btnHubArtifact) this.elements.btnHubArtifact.style.display = this.hero.bossProgress >= 1 ? 'flex' : 'none';
    if (this.elements.btnHubLibrary) this.elements.btnHubLibrary.style.display = this.hero.bossProgress >= 1 ? 'flex' : 'none'; 
    if (this.elements.btnHubRelic) this.elements.btnHubRelic.style.display = this.hero.bossProgress >= 3 ? 'flex' : 'none';
    if (this.elements.btnHubSkills) this.elements.btnHubSkills.style.display = this.hero.prestigeLevel > 0 ? 'flex' : 'none';
    if (this.elements.btnHubChallenges) this.elements.btnHubChallenges.style.display = this.hero.prestigeLevel > 0 ? 'flex' : 'none';
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