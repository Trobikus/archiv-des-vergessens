/**
 * ============================================================
 * FILE: core/services/relic-hunt-service.js – Relikt-Jagd
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Relikt-Jagd durchführen
 * - Cooldown verwalten
 * - Erfolgschancen berechnen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import RNG from '../utils/rng.js';
import { CONFIG } from '../../data/config.js';

export class RelicHuntService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, resourceService, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
    this._cooldownMs = CONFIG.RELIC_HUNT.COOLDOWN_MS;
    this._cost = CONFIG.RELIC_HUNT.COST;
    this._cooldownEnd = 0;

    this._bindSlowTick();
  }

  _bindSlowTick() {
    this._eventBus.subscribe('game:slowTick', () => {
      // Cooldown wird bei jedem Tick geprüft – kein State nötig
    });
  }

  /**
   * Führt eine Relikt-Jagd durch.
   */
  performHunt() {
    const now = Date.now();
    if (this._cooldownEnd > now) {
      const remaining = Math.ceil((this._cooldownEnd - now) / 1000);
      return { success: false, message: `Warte noch ${remaining}s...` };
    }

    const state = this._stateManager.getState();
    const resources = state.resources;
    const particles = Number(resources.particles || '0');

    if (particles < this._cost) {
      return { success: false, message: `Nicht genug Partikel (${this._cost} benötigt).` };
    }

    // Kosten abziehen
    this._resourceService.removeParticles(this._cost);

    // Erfolgschance berechnen
    const hero = state.hero;
    let chance = CONFIG.RELIC_HUNT.BASE_CHANCE;
    chance += hero.level * CONFIG.RELIC_HUNT.LEVEL_BONUS;
    chance += this._heroService.getAttributes().attack * CONFIG.RELIC_HUNT.POWER_BONUS;
    chance += hero.prestige.level * (CONFIG.RELIC_HUNT.PRESTIGE_BONUS || 0.01);
    chance = clamp(chance, CONFIG.RELIC_HUNT.MIN_CHANCE, CONFIG.RELIC_HUNT.MAX_CHANCE);

    const roll = RNG.next();
    let success = roll < chance;
    let reward = null;
    let message = '';

    if (success) {
      const relics = 1 + Math.floor(RNG.next() * 2) + Math.floor(hero.level / 10);
      const finalRelics = Math.max(1, relics);
      this._resourceService.addRelics(finalRelics);
      const exp = 5 + Math.floor(RNG.next() * 5);
      this._heroService.addExperience(exp);
      message = `Erfolg! +${finalRelics} Relikte und +${exp} EP.`;
      reward = { relics: finalRelics, experience: exp };
    } else {
      message = 'Fehlgeschlagen... Die Erinnerung war nur ein Schatten.';
    }

    // Cooldown setzen
    this._cooldownEnd = now + this._cooldownMs;

    this._eventBus.publish('relicHunt:result', { success, message, reward });
    this._eventBus.publish('ui:showToast', {
      message: message,
      type: success ? 'success' : 'warning',
      duration: 3000
    });

    return { success, message, reward };
  }

  /**
   * Gibt den Cooldown-Status zurück.
   */
  getCooldownStatus() {
    const now = Date.now();
    if (this._cooldownEnd <= now) {
      return { ready: true };
    }
    return {
      ready: false,
      remaining: this._cooldownEnd - now,
      total: this._cooldownMs
    };
  }

  /**
   * Gibt die aktuelle Erfolgschance zurück.
   */
  getSuccessChance() {
    const state = this._stateManager.getState();
    const hero = state.hero;
    let chance = CONFIG.RELIC_HUNT.BASE_CHANCE;
    chance += hero.level * CONFIG.RELIC_HUNT.LEVEL_BONUS;
    chance += this._heroService.getAttributes().attack * CONFIG.RELIC_HUNT.POWER_BONUS;
    chance += hero.prestige.level * (CONFIG.RELIC_HUNT.PRESTIGE_BONUS || 0.01);
    return clamp(chance, CONFIG.RELIC_HUNT.MIN_CHANCE, CONFIG.RELIC_HUNT.MAX_CHANCE);
  }

  /**
   * Setzt den Cooldown zurück (für Prestige).
   */
  resetCooldown() {
    this._cooldownEnd = 0;
  }
}

export default RelicHuntService;