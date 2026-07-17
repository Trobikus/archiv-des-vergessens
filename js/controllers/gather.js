/**
 * ============================================================
 * FILE: controllers/gather.js – Manuelles Sammeln
 * ============================================================
 */

import { EVENTS } from '../core/events/definitions.js';
import { CONFIG } from '../data/config.js';

export class GatherController {
  /**
   * @param {Object} deps
   * @param {EventBus} deps.eventBus
   * @param {ResourceService} deps.resourceService
   * @param {HeroService} deps.heroService
   * @param {StateManager} deps.stateManager
   * @param {SettingsManager} deps.settingsManager
   */
  constructor({ eventBus, resourceService, heroService, stateManager, settingsManager }) {
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
    this._stateManager = stateManager;
    this._settingsManager = settingsManager;

    this._btnGather = document.getElementById('manual-gather-btn');
    this._btnUpgrade = document.getElementById('upgrade-click-btn');
    this._lastClickTime = 0;

    this._bindEvents();
    this._bindStateUpdates();
  }

  _bindEvents() {
    if (this._btnGather) {
      this._btnGather.addEventListener('mousedown', (e) => this._handleGather(e));
    }
    if (this._btnUpgrade) {
      this._btnUpgrade.addEventListener('click', () => this._handleUpgrade());
    }
  }

  _bindStateUpdates() {
    this._stateManager.subscribe((state) => {
      this._updateUpgradeButton(state);
    });
  }

  _handleGather(e) {
    const now = performance.now();
    if (now - this._lastClickTime < CONFIG.GATHER.COOLDOWN_MS) return;
    this._lastClickTime = now;

    // Menge berechnen
    const hero = this._stateManager.getState().hero;
    const libraryBonus = 1 + this._stateManager.getState().library.upgrades.gather_boost * 0.1;
    const baseAmount = CONFIG.GATHER.BASE_AMOUNT + Math.floor(hero.level / 2) + (hero.clickPowerLevel * CONFIG.GATHER.POWER_MULT);
    const amount = Math.floor(baseAmount * libraryBonus);

    this._resourceService.addParticles(amount);

    // Floating-Text
    if (this._settingsManager.get('floatingText')) {
      this._eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, {
        text: '+' + amount,
        x: e.clientX + (Math.random() * 40 - 20),
        y: e.clientY - 20 - (Math.random() * 20)
      });
    }

    // Partikel-Effekt
    if (window.spawnClickParticles) {
      window.spawnClickParticles(e.clientX, e.clientY);
    }

    // Button-Visual
    this._btnGather.style.transform = 'scale(0.92)';
    this._btnGather.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.8)';
    setTimeout(() => {
      this._btnGather.style.transform = 'scale(1)';
      this._btnGather.style.boxShadow = '';
    }, 80);

    // Quest-Event
    this._eventBus.publish('quest:manualGather');
  }

  _handleUpgrade() {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const cost = this._getUpgradeCost(hero.clickPowerLevel);

    if (this._resourceService.removeParticles(cost)) {
      this._stateManager.dispatch((state) => ({
        ...state,
        hero: {
          ...state.hero,
          clickPowerLevel: (state.hero.clickPowerLevel || 0) + 1
        }
      }), 'gather/upgradeClick');

      this._eventBus.publish('hero:updated', {});
      this._eventBus.publish('ui:showToast', {
        message: `✨ Klick-Stärke erhöht auf Stufe ${hero.clickPowerLevel + 1}!`,
        type: 'success',
        duration: 2000
      });
    } else {
      this._eventBus.publish('ui:showToast', {
        message: `❌ Nicht genug Partikel (${cost} benötigt)`,
        type: 'warning',
        duration: 2000
      });
    }
  }

  _getUpgradeCost(level) {
    return Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, level || 0));
  }

  _updateUpgradeButton(state) {
    if (!this._btnUpgrade) return;
    const hero = state.hero;
    const cost = this._getUpgradeCost(hero.clickPowerLevel);
    const res = state.resources;
    this._btnUpgrade.textContent = `Klick-Stärke verbessern (Kosten: ${cost} Partikel)`;
    this._btnUpgrade.disabled = Number(res.particles) < cost;
  }
}

export default GatherController;