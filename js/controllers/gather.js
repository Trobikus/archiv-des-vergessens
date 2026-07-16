// --- START OF FILE gather.js ---

import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';

export default class GatherController {
  constructor(context) {
    this.context = context;
    this.eventBus = context.eventBus;
    this.resourceManager = context.resourceManager;
    this.hero = context.hero;

    this.btnManualGather = document.getElementById('manual-gather-btn');
    this.btnUpgradeClick = document.getElementById('upgrade-click-btn');
    this.lastClickTime = 0;

    this.bindEvents();
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => this.updateUI());
  }

  bindEvents() {
    if (this.btnUpgradeClick) {
      this.btnUpgradeClick.addEventListener('click', () => {
        const cost = this.getUpgradeCost();
        if (this.resourceManager.removeParticles(cost)) {
          this.hero.clickPowerLevel = (this.hero.clickPowerLevel || 0) + 1;
          this.eventBus.publish(EVENTS.HERO_UPDATED);
          this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `✨ Klick-Stärke erhöht auf Stufe ${this.hero.clickPowerLevel}!`, type: 'event' });
          this.updateUI();
        }
      });
    }

    if (this.btnManualGather) {
      this.btnManualGather.addEventListener('mousedown', (e) => {
        const now = performance.now();
        if (now - this.lastClickTime < CONFIG.GATHER.COOLDOWN_MS) return;
        this.lastClickTime = now;

        const libraryBonus = this.context.libraryManager ? (1 + this.context.libraryManager.getBonus('gather_boost')) : 1;
        const baseAmount = CONFIG.GATHER.BASE_AMOUNT + Math.floor(this.hero.level / 2) + ((this.hero.clickPowerLevel || 0) * CONFIG.GATHER.POWER_MULT);
        const amount = Math.floor(baseAmount * libraryBonus);

        this.resourceManager.addParticles(amount);

        const optFloating = document.getElementById('opt-floating');
        if (!optFloating || optFloating.checked) {
          this.eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, {
            text: '+' + amount,
            x: e.clientX + (Math.random() * 40 - 20),
            y: e.clientY - 20 - (Math.random() * 20)
          });
        }

        if (window.spawnClickParticles) {
          window.spawnClickParticles(e.clientX, e.clientY);
        }

        this.btnManualGather.style.transform = 'scale(0.92)';
        this.btnManualGather.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.8)';

        setTimeout(() => {
          this.btnManualGather.style.transform = 'scale(1)';
          this.btnManualGather.style.boxShadow = '';
        }, 80);

        this.eventBus.publish(EVENTS.QUEST_MANUAL_GATHER);
        this.eventBus.publish(EVENTS.QUEST_CHECK);
      });
    }
  }

  getUpgradeCost() {
    return Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, this.hero.clickPowerLevel || 0));
  }

  updateUI() {
    if (!this.btnUpgradeClick) return;
    const cost = this.getUpgradeCost();
    this.btnUpgradeClick.textContent = `Klick-Stärke verbessern (Kosten: ${cost} Partikel)`;
    this.btnUpgradeClick.disabled = this.resourceManager.particles < cost;
  }
}