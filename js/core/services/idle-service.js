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
import {
  calculateBuildingCost,
  calculateBulkBuildingCost,
  calculateMaxAffordableLevel,
  calculateYieldPerSecond,
  calculateOfflineProgress,
  calculatePrestigeCurrency
} from '../game/math.js';

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

    // Standard-Schwellenwert für Ewige-Mneme Prestige (10.000 mnemeFragmente für 30-60 Min Erst-Prestige)
    this._prestigeThreshold = 10000;
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

  static calculateBuildingCost(baseCost, costMultiplier = 1.15, currentLevel = 0) {
    return calculateBuildingCost(baseCost, costMultiplier, currentLevel);
  }

  static calculateBulkBuildingCost(baseCost, costMultiplier = 1.15, currentLevel = 0, count = 1) {
    return calculateBulkBuildingCost(baseCost, costMultiplier, currentLevel, count);
  }

  static calculateMaxAffordableLevel(baseCost, costMultiplier = 1.15, currentLevel = 0, availableResources = 0) {
    return calculateMaxAffordableLevel(baseCost, costMultiplier, currentLevel, availableResources);
  }

  static calculateYieldPerSecond(baseYield, level, upgradeBonusesSum = 0, prestigeMultiplier = 1.0) {
    return calculateYieldPerSecond(baseYield, level, upgradeBonusesSum, prestigeMultiplier);
  }

  static calculateOfflineProgress(lastTimestamp, currentTimestamp, yieldPerSecond, maxOfflineSeconds = 43200) {
    return calculateOfflineProgress(lastTimestamp, currentTimestamp, yieldPerSecond, maxOfflineSeconds);
  }

  static calculatePrestigeCurrency(totalResources, threshold = 10000) {
    return calculatePrestigeCurrency(totalResources, threshold);
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
    return calculateBuildingCost(gen.baseCost, gen.costMultiplier, gen.level);
  }

  /**
   * Berechnet die Gesamtkosten für mehrere Stufen des GedankenArchivs.
   * @param {number} count
   */
  getGedankenArchivBulkCost(count = 1) {
    const gen = this.getGedankenArchiv();
    return calculateBulkBuildingCost(gen.baseCost, gen.costMultiplier, gen.level, count);
  }

  /**
   * Berechnet die maximal bezahlbaren Stufen des GedankenArchivs.
   */
  getGedankenArchivMaxAffordable() {
    const gen = this.getGedankenArchiv();
    const currentMneme = selectMnemeFragmenteBigInt(this._stateManager.getState());
    return calculateMaxAffordableLevel(gen.baseCost, gen.costMultiplier, gen.level, currentMneme);
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
    return calculateYieldPerSecond(gen.baseYield, gen.level, upgradeBonus, prestigeMult);
  }

  /**
   * Kauft eine oder mehrere Stufen des GedankenArchivs, sofern genug mnemeFragmente vorhanden sind.
   * @param {number} [count=1]
   */
  buyGedankenArchivLevel(count = 1) {
    const safeCount = Math.max(1, Math.floor(sanitizeNumber(count, 1)));
    const totalCost = this.getGedankenArchivBulkCost(safeCount);
    const currentMneme = selectMnemeFragmenteBigInt(this._stateManager.getState());

    if (currentMneme < BigInt(totalCost) || totalCost <= 0) {
      this._eventBus.publish('ui:showToast', {
        message: `❌ Nicht genug Mneme-Fragmente (${totalCost} benötigt)`,
        type: 'warning',
        duration: 2000
      });
      return false;
    }

    this._stateManager.dispatch(
      Actions.buyIdleGeneratorLevel('gedankenArchiv', totalCost, safeCount),
      'idle/buyGedankenArchiv'
    );

    const newGen = this.getGedankenArchiv();
    this._eventBus.publish('idle:generatorUpgraded', {
      generatorId: 'gedankenArchiv',
      newLevel: newGen.level,
      boughtCount: safeCount,
      totalCost,
      newYield: this.getGedankenArchivYieldPerSecond()
    });

    this._eventBus.publish('ui:showToast', {
      message: `🏛️ GedankenArchiv um +${safeCount} Stufe(n) ausgebaut! (Stufe ${newGen.level})`,
      type: 'success',
      duration: 2500
    });

    return true;
  }

  /**
   * Kauft maximal bezahlbare Stufen des GedankenArchivs.
   */
  buyGedankenArchivMax() {
    const maxInfo = this.getGedankenArchivMaxAffordable();
    if (maxInfo.count <= 0) {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Nicht genug Mneme-Fragmente für einen Ausbau.',
        type: 'warning',
        duration: 2000
      });
      return false;
    }

    return this.buyGedankenArchivLevel(maxInfo.count);
  }

  /**
   * Berechnet die anhängige Ewige Mneme für das nächste Prestige.
   */
  getPendingEwigeMneme() {
    const totalMneme = selectTotalMnemeFragmenteBigInt(this._stateManager.getState());
    return calculatePrestigeCurrency(totalMneme, this._prestigeThreshold);
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
   * Berechnet den Offline-Fortschritt für das GedankenArchiv.
   * @param {number} lastTimestamp
   * @param {number} currentTimestamp
   */
  calculateOfflineProgress(lastTimestamp, currentTimestamp) {
    const yieldPerSec = this.getGedankenArchivYieldPerSecond();
    return calculateOfflineProgress(lastTimestamp, currentTimestamp, yieldPerSec);
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
