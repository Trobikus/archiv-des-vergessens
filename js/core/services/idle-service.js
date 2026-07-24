/**
 * ============================================================
 * FILE: core/services/idle-service.js – Idle-Game Berechnungen & Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Implementierung der Standard-Berechnungsformeln für Incremental/Idle Games
 * - Kostenformel: Kosten = BasisKosten * (Multiplikator ^ AktuellesLevel) [Mult = 1.15]
 * - Ertragsformel: ErtragProSekunde = BasisErtrag * Level * (1 + Summe(UpgradeBonusse)) * PrestigeMultiplikator
 * - Prestige-Formel: PrestigeWährung = floor(Wurzel(GesamtRessourcen / Schwellenwert))
 * - Zuordnung:
 *     - Ressource: mnemeFragmente
 *     - Generator/Gebäude: gedankenArchiv
 *     - Prestige-Währung: ewigeMneme
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectGedankenArchiv, selectMnemeFragmenteBigInt, selectTotalMnemeFragmenteBigInt, selectEwigeMneme } from '../state/selectors.js';
import { sanitizeNumber } from '../../utils/sanitizer.js';
import { EVENTS } from '../events/definitions.js';

/** @typedef {import('../events/bus.js').default} EventBus */
/** @typedef {import('./resource-service.js').default} ResourceService */

export class IdleService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   */
  constructor(stateManager, eventBus, resourceService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._slowTickSubscription = null;
    this._partialYield = 0;

    // Standard-Schwellenwert für Ewige-Mneme Prestige (1000 mnemeFragmente)
    this._prestigeThreshold = 1000;
    // Standard-Multiplikator pro Ewige Mneme (+10%)
    this._ewigeMnemeBonus = 0.10;

    this._bindSlowTick();
  }

  _bindSlowTick() {
    this._slowTickSubscription = this._eventBus.subscribe(EVENTS.GAME_SLOW_TICK, (data) => {
      this._processTick(data.delta);
    });
  }

  // ============================================================
  // MATH FORMULA HELPERS (PURE STATIC CALCULATIONS)
  // ============================================================

  /**
   * Berechnet die Kosten für eine Gebäude/Upgrade-Stufe.
   * Formel: Kosten = floor(BasisKosten * (Multiplikator ^ AktuellesLevel))
   * @param {number} baseCost - BasisKosten
   * @param {number} costMultiplier - Industriestandard: 1.15
   * @param {number} currentLevel - Aktuelle Stufe
   * @returns {number}
   */
  static calculateBuildingCost(baseCost, costMultiplier = 1.15, currentLevel = 0) {
    const safeBase = Math.max(0, baseCost);
    const safeMult = Math.max(1.0, costMultiplier);
    const safeLevel = Math.max(0, currentLevel);
    return Math.floor(safeBase * Math.pow(safeMult, safeLevel));
  }

  /**
   * Berechnet den Ertrag pro Sekunde.
   * Formel: ErtragProSekunde = BasisErtrag * Level * (1 + Summe(UpgradeBonusse)) * PrestigeMultiplikator
   * @param {number} baseYield
   * @param {number} level
   * @param {number} upgradeBonusesSum
   * @param {number} prestigeMultiplier
   * @returns {number}
   */
  static calculateYieldPerSecond(baseYield, level, upgradeBonusesSum = 0, prestigeMultiplier = 1.0) {
    const safeBase = Math.max(0, baseYield);
    const safeLevel = Math.max(0, level);
    const safeBonus = Math.max(0, upgradeBonusesSum);
    const safePrestige = Math.max(1.0, prestigeMultiplier);
    return safeBase * safeLevel * (1 + safeBonus) * safePrestige;
  }

  /**
   * Berechnet die verdiente Prestige-Währung bei einem Reset.
   * Formel: PrestigeWährung = floor(Wurzel(GesamtRessourcen / Schwellenwert))
   * @param {number|BigInt} totalResources
   * @param {number} threshold
   * @returns {number}
   */
  static calculatePrestigeCurrency(totalResources, threshold = 1000) {
    let numResources = 0;
    if (typeof totalResources === 'bigint') {
      numResources = Number(totalResources);
    } else {
      numResources = sanitizeNumber(totalResources, 0);
    }

    if (numResources < threshold || threshold <= 0) {
      return 0;
    }

    return Math.floor(Math.sqrt(numResources / threshold));
  }

  // ============================================================
  // SERVICE PUBLIC API
  // ============================================================

  /**
   * Gibt den aktuellen Status des GedankenArchivs zurück.
   */
  getGedankenArchiv() {
    const state = this._stateManager.getState();
    return selectGedankenArchiv(state) || {
      level: 0,
      baseCost: 10,
      costMultiplier: 1.15,
      baseYield: 1.0,
      upgrades: { focusBonus: 0 }
    };
  }

  /**
   * Berechnet die Kosten für die nächste Stufe des GedankenArchivs.
   */
  getGedankenArchivCost() {
    const gen = this.getGedankenArchiv();
    return IdleService.calculateBuildingCost(gen.baseCost, gen.costMultiplier, gen.level);
  }

  /**
   * Gibt den Prestige-Multiplikator basierend auf der Ewigen Mneme zurück.
   */
  getPrestigeMultiplier() {
    const ewigeMneme = selectEwigeMneme(this._stateManager.getState());
    return 1.0 + (ewigeMneme * this._ewigeMnemeBonus);
  }

  /**
   * Berechnet den aktuellen Gesamtertrag pro Sekunde des GedankenArchivs.
   */
  getGedankenArchivYieldPerSecond() {
    const gen = this.getGedankenArchiv();
    const upgradeBonus = gen.upgrades?.focusBonus || 0;
    const prestigeMult = this.getPrestigeMultiplier();
    return IdleService.calculateYieldPerSecond(gen.baseYield, gen.level, upgradeBonus, prestigeMult);
  }

  /**
   * Kauft eine Stufe des GedankenArchivs, sofern genug mnemeFragmente vorhanden sind.
   */
  buyGedankenArchivLevel() {
    const cost = this.getGedankenArchivCost();
    const currentMneme = selectMnemeFragmenteBigInt(this._stateManager.getState());

    if (currentMneme < BigInt(cost)) {
      this._eventBus.publish('ui:showToast', {
        message: `❌ Nicht genug Mneme-Fragmente (${cost} benötigt)`,
        type: 'warning',
        duration: 2000
      });
      return false;
    }

    this._stateManager.dispatch(
      Actions.buyIdleGeneratorLevel('gedankenArchiv', cost),
      'idle/buyGedankenArchiv'
    );

    const newGen = this.getGedankenArchiv();
    this._eventBus.publish('idle:generatorUpgraded', {
      generatorId: 'gedankenArchiv',
      newLevel: newGen.level,
      newYield: this.getGedankenArchivYieldPerSecond()
    });

    this._eventBus.publish('ui:showToast', {
      message: `🏛️ GedankenArchiv auf Stufe ${newGen.level} ausgebaut!`,
      type: 'success',
      duration: 2500
    });

    return true;
  }

  /**
   * Berechnet die anhängige Ewige Mneme für das nächste Prestige.
   */
  getPendingEwigeMneme() {
    const totalMneme = selectTotalMnemeFragmenteBigInt(this._stateManager.getState());
    return IdleService.calculatePrestigeCurrency(totalMneme, this._prestigeThreshold);
  }

  /**
   * Führt den Ewige-Mneme Prestige-Reset durch.
   */
  performEwigeMnemePrestige() {
    const reward = this.getPendingEwigeMneme();
    if (reward <= 0) {
      this._eventBus.publish('ui:showToast', {
        message: `🌌 Nicht genug Mneme-Fragmente gesammelt (mind. ${this._prestigeThreshold} benötigt).`,
        type: 'warning',
        duration: 3000
      });
      return { success: false, reward: 0 };
    }

    this._stateManager.dispatch(
      Actions.resetEwigeMnemePrestige(reward),
      'idle/ewigeMnemePrestige'
    );

    this._eventBus.publish('idle:prestigeCompleted', {
      reward,
      totalEwigeMneme: selectEwigeMneme(this._stateManager.getState())
    });

    this._eventBus.publish('ui:showToast', {
      message: `✨ Verewigung vollzogen! +${reward} Ewige Mneme erhalten.`,
      type: 'success',
      duration: 4000
    });

    return { success: true, reward };
  }

  /**
   * Verarbeitet regelmäßige Ticks zur automatischen Mneme-Fragment-Produktion.
   * @param {number} deltaMs
   */
  _processTick(deltaMs) {
    const yieldPerSec = this.getGedankenArchivYieldPerSecond();
    if (yieldPerSec <= 0) return;

    const gained = (yieldPerSec * deltaMs) / 1000;
    this._partialYield += gained;

    if (this._partialYield >= 1.0) {
      const fullAmount = Math.floor(this._partialYield);
      this._partialYield -= fullAmount;
      this._resourceService.addMnemeFragmente(fullAmount);
    }
  }
}

export default IdleService;
