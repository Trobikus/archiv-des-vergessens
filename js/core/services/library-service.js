/**
 * ============================================================
 * FILE: core/services/library-service.js – Bibliothek (Forschungen)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Forschungs-Upgrades verwalten
 * - Kosten berechnen (mit exponentiellem Anstieg)
 * - Upgrades kaufen
 * - Boni für andere Systeme bereitstellen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import { EVENTS } from '../events/definitions.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */

export class LibraryService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   */
  constructor(stateManager, eventBus, resourceService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;

    // Upgrades: ID → Konfiguration
    this._upgradeConfigs = {
      gather_boost: {
        id: 'gather_boost',
        name: 'Mneme-Fokus',
        desc: '+10% Klick-Ertrag pro Stufe',
        baseCost: { particles: 1000 },
        costMult: 1.5,
        maxLevel: 999,
        bonus: (level) => level * 0.10
      },
      clan_boost: {
        id: 'clan_boost',
        name: 'Synergie des Bundes',
        desc: '+5% Clan-Produktion pro Stufe',
        baseCost: { particles: 5000, relics: 50 },
        costMult: 1.6,
        maxLevel: 999,
        bonus: (level) => level * 0.05
      },
      forge_discount: {
        id: 'forge_discount',
        name: 'Geheimnisse der Schmiede',
        desc: '-1% Schmiedekosten pro Stufe (Max -50%)',
        baseCost: { particles: 10000, artifacts: 10 },
        costMult: 1.8,
        maxLevel: 50,
        bonus: (level) => Math.min(level * 0.01, 0.5)
      }
    };
  }

  /**
   * Gibt alle Upgrades mit aktuellem Level zurück.
   */
  getUpgrades() {
    const state = this._stateManager.getState();
    const levels = state.library.upgrades || {};
    
    return Object.values(this._upgradeConfigs).map(cfg => ({
      ...cfg,
      level: levels[cfg.id] || 0,
      isMaxed: (levels[cfg.id] || 0) >= cfg.maxLevel
    }));
  }

  /**
   * Gibt die Kosten für ein Upgrade zurück.
   */
  getUpgradeCost(upgradeId) {
    const cfg = this._upgradeConfigs[upgradeId];
    if (!cfg) return {};

    const state = this._stateManager.getState();
    const currentLevel = (state.library.upgrades || {})[upgradeId] || 0;
    
    if (currentLevel >= cfg.maxLevel) {
      return {};
    }

    const cost = {};
    for (const [res, base] of Object.entries(cfg.baseCost)) {
      const amount = Math.floor(base * Math.pow(cfg.costMult, currentLevel));
      cost[res] = clamp(amount, 0, 1e15);
    }
    return cost;
  }

  /**
   * Kauft ein Upgrade.
   */
  buyUpgrade(upgradeId) {
    const cfg = this._upgradeConfigs[upgradeId];
    if (!cfg) return false;

    const state = this._stateManager.getState();
    const currentLevel = (state.library.upgrades || {})[upgradeId] || 0;
    
    if (currentLevel >= cfg.maxLevel) {
      this._eventBus.publish('ui:showToast', {
        message: `📚 ${cfg.name} hat bereits die maximale Stufe erreicht.`,
        type: 'warning',
        duration: 2000
      });
      return false;
    }

    const cost = this.getUpgradeCost(upgradeId);
    const resources = state.resources;

    // Prüfen, ob genug Ressourcen vorhanden sind
    for (const [res, amount] of Object.entries(cost)) {
      const current = BigInt(resources[res] || '0');
      if (current < BigInt(amount)) {
        this._eventBus.publish('ui:showToast', {
          message: `❌ Nicht genug ${res} (${amount} benötigt)`,
          type: 'warning',
          duration: 2000
        });
        return false;
      }
    }

    // Kosten abziehen
    for (const [res, amount] of Object.entries(cost)) {
      if (res === 'particles') this._resourceService.removeParticles(amount);
      else if (res === 'relics') this._resourceService.removeRelics(amount);
      else if (res === 'artifacts') {
        this._resourceService._stateManager.dispatch((state) => ({
          ...state,
          resources: {
            ...state.resources,
            artifacts: String(BigInt(state.resources.artifacts || '0') - BigInt(amount))
          }
        }), 'library/buy');
      }
    }

    // Upgrade-Level erhöhen
    this._stateManager.dispatch((state) => ({
      ...state,
      library: {
        ...state.library,
        upgrades: {
          ...state.library.upgrades,
          [upgradeId]: currentLevel + 1
        }
      }
    }), 'library/upgrade');

    this._eventBus.publish('library:upgraded', { 
      upgradeId, 
      newLevel: currentLevel + 1,
      bonus: cfg.bonus(currentLevel + 1)
    });
    this._eventBus.publish('ui:showToast', {
      message: `📚 ${cfg.name} auf Stufe ${currentLevel + 1} verbessert!`,
      type: 'success',
      duration: 3000
    });

    return true;
  }

  /**
   * Gibt den Bonus für ein Upgrade zurück.
   */
  getBonus(upgradeId) {
    const cfg = this._upgradeConfigs[upgradeId];
    if (!cfg) return 0;

    const state = this._stateManager.getState();
    const level = (state.library.upgrades || {})[upgradeId] || 0;
    
    return cfg.bonus(level);
  }

  /**
   * Gibt alle Boni als Objekt zurück.
   */
  getAllBonuses() {
    const bonuses = {};
    for (const id of Object.keys(this._upgradeConfigs)) {
      bonuses[id] = this.getBonus(id);
    }
    return bonuses;
  }

  /**
   * Gibt den Fortschritt in Prozent zurück.
   */
  getProgress() {
    const state = this._stateManager.getState();
    const levels = state.library.upgrades || {};
    let total = 0;
    let max = 0;
    
    for (const cfg of Object.values(this._upgradeConfigs)) {
      total += levels[cfg.id] || 0;
      max += cfg.maxLevel;
    }
    
    return max > 0 ? Math.floor((total / max) * 100) : 0;
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    this._stateManager.dispatch((state) => ({
      ...state,
      library: {
        ...state.library,
        upgrades: { ...data }
      }
    }), 'library/load');
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    return this._stateManager.getState().library.upgrades || {};
  }
}

export default LibraryService;