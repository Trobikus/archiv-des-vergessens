import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class RelicHuntUI extends BaseModalUI {
  constructor(context) {
    super('relic-hunt-overlay', 'relic-hunt-close');
    this.eventBus = context.eventBus;
    this.relicHuntManager = context.relicHuntManager;
    this.hero = context.hero;
    this.resourceManager = context.resourceManager;

    this.startBtn = document.getElementById('relic-hunt-start-btn');
    this.chanceDisplay = document.getElementById('relic-hunt-chance');
    this.powerDisplay = document.getElementById('relic-hunt-power');
    this.resultDisplay = document.getElementById('relic-hunt-result');
    this.cooldownContainer = document.getElementById('relic-hunt-cooldown');
    this.cooldownText = document.getElementById('relic-hunt-cooldown-text');
    this.cooldownFill = document.getElementById('relic-hunt-cooldown-fill');

    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => this._performHunt());
    }

    this.eventBus.subscribe(EVENTS.UI_OPEN_RELICHUNT, () => this.open());
    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
      if (this.isOpen) this._updateStats();
    });
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => {
      if (this.isOpen) this._updateStats();
    });
    
    this.eventBus.subscribe(EVENTS.RELICHUNT_COOLDOWN, () => this._startCooldownUI());
    this.eventBus.subscribe(EVENTS.RELICHUNT_READY, () => this._endCooldownUI());
    
    this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, () => {
      if (this.isOpen && this.relicHuntManager.isOnCooldown) {
         this._updateCooldownBar();
      }
    });
  }

  onOpen() {
    if (this.resultDisplay) this.resultDisplay.textContent = '';
    this._updateStats();

    const status = this.relicHuntManager.updateCooldown();
    if (status && !status.ready) {
      this._startCooldownUI();
      this._updateCooldownBar();
    } else {
      this._endCooldownUI();
    }
  }

  _updateStats() {
    const chance = 0.4 + this.hero.level * 0.02 + this.hero.getTotalPower() * 0.001 + this.hero.getPrestigeBonusPercent('relicChance') / 100;
    const clampedChance = Math.min(0.95, Math.max(0.05, chance));
    if (this.chanceDisplay) this.chanceDisplay.textContent = Math.round(clampedChance * 100) + '%';
    if (this.powerDisplay) this.powerDisplay.textContent = this.hero.getTotalPower();
  }

  _performHunt() {
    const result = this.relicHuntManager.performHunt();
    if (result.success === false && result.message !== 'Warte noch...') {
      if (this.resultDisplay) this.resultDisplay.innerHTML = `<span style="color:#e0a080;">${result.message}</span>`;
      return;
    }

    if (this.resultDisplay) {
      if (result.success) {
        this.resultDisplay.innerHTML = `<span style="color:#9acd9a;">✅ ${result.message}</span>`;
      } else if (result.message && result.message !== 'Warte noch...') {
        this.resultDisplay.innerHTML = `<span style="color:#e0a080;">❌ ${result.message}</span>`;
      }
    }
  }

  _startCooldownUI() {
    if (this.cooldownContainer) this.cooldownContainer.style.display = 'block';
    if (this.startBtn) {
      this.startBtn.disabled = true;
      this.startBtn.textContent = 'WARTEN...';
    }
  }
  
  _updateCooldownBar() {
    const status = this.relicHuntManager.updateCooldown();
    if (!status || status.ready) return;
    
    const progress = ((status.total - status.remaining) / status.total) * 100;
    if (this.cooldownFill) this.cooldownFill.style.width = Math.min(100, Math.max(0, progress)) + '%';
    if (this.cooldownText) this.cooldownText.textContent = `Wartezeit: ${Math.ceil(status.remaining / 1000)}s`;
  }

  _endCooldownUI() {
    if (this.cooldownContainer) this.cooldownContainer.style.display = 'none';
    if (this.startBtn) {
      this.startBtn.disabled = false;
      this.startBtn.textContent = 'SUCHE STARTEN';
    }
    this._updateStats();
  }
}