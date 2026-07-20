/**
 * ============================================================
 * FILE: core/services/daily-reward-service.js – Tägliche Belohnungen
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Tägliche Belohnung beanspruchen
 * - Streak verwalten
 * - Boost-Mechanik
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import RNG from '../../utils/rng.js';
import { Item } from '../../models/item.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */

export class DailyRewardService {
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
  }

  /**
   * Prüft, ob heute die Belohnung beansprucht werden kann.
   */
  canClaimToday() {
    const state = this._stateManager.getState();
    const today = this._getTodayKey();
    const daily = state.quests.daily;
    // Wir speichern den Claim-Status in quests.daily (als zusätzliches Feld)
    return daily._lastClaimDate !== today;
  }

  _getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  /**
   * Beansprucht die tägliche Belohnung.
   */
  claimDailyReward() {
    if (!this.canClaimToday()) {
      return { success: false, message: 'Heute wurde die Belohnung bereits abgeholt.' };
    }

    const today = this._getTodayKey();
    const state = this._stateManager.getState();
    const hero = state.hero;
    const resources = state.resources;

    // Streak berechnen
    let streak = 0;
    const lastClaim = state.quests.daily._lastClaimDate || '';
    if (lastClaim) {
      const daysDiff = this._daysBetween(lastClaim, today);
      if (daysDiff === 1) {
        streak = (state.quests.daily._streak || 0) + 1;
      } else if (daysDiff > 1) {
        streak = 1;
      } else {
        streak = state.quests.daily._streak || 1;
      }
    } else {
      streak = 1;
    }
    streak = clamp(streak, 1, 365);

    /**
     * @typedef {Object} DailyReward
     * @property {number} [particles]
     * @property {number} [relics]
     * @property {number} [artifacts]
     * @property {string} [title]
     * @property {boolean} [amulet]
     * @property {string} [boost]
     */

    // Belohnung generieren
    /** @type {DailyReward} */
    let reward = null;
    if (streak === 7) {
      // Wöchentliche Bonus-Belohnung
      reward = {
        particles: 250,
        relics: 15,
        artifacts: 5,
        title: 'Tagebuch der Erinnerung',
        amulet: true
      };
    } else {
      const rewards = [
        { particles: 80 },
        { relics: 12 },
        { artifacts: 4 },
        { particles: 50, relics: 4, boost: 'collect-2x' }
      ];
      const idx = Math.floor(RNG.next() * rewards.length);
      reward = rewards[idx];
    }

    // Belohnung vergeben
    if (reward.particles) this._resourceService.addParticles(reward.particles);
    if (reward.relics) this._resourceService.addRelics(reward.relics);
    if (reward.artifacts) this._resourceService._stateManager.dispatch((state) => ({
      ...state,
      resources: {
        ...state.resources,
        artifacts: String(Number(state.resources.artifacts || '0') + reward.artifacts)
      }
    }), 'daily/claimArtifacts');
    if (reward.boost) {
      this._stateManager.dispatch((state) => ({
        ...state,
        quests: {
          ...state.quests,
          daily: { ...state.quests.daily, _currentBoost: reward.boost, _boostUntil: Date.now() + 3600000 }
        }
      }), 'daily/setBoost');
    }
    if (reward.amulet) {
      const amulet = new Item(
        'Amulett der täglichen Wiederkehr',
        'amulet',
        'legendary',
        { attack: 6, defense: 4, stamina: 4 },
        'Einzigartige tägliche Belohnung.',
        false
      );
      this._heroService._stateManager.dispatch((state) => ({
        ...state,
        hero: {
          ...state.hero,
          inventory: {
            ...state.hero.inventory,
            equipment: [...state.hero.inventory.equipment, amulet.toJSON()]
          }
        }
      }), 'daily/addAmulet');
    }
    if (reward.title) {
      this._heroService._stateManager.dispatch((state) => {
        const titles = state.hero.titles || [];
        if (titles.includes(reward.title)) return state;
        return {
          ...state,
          hero: {
            ...state.hero,
            titles: [...titles, reward.title],
            title: reward.title
          }
        };
      }, 'daily/addTitle');
    }

    // State aktualisieren
    this._stateManager.dispatch((state) => ({
      ...state,
      quests: {
        ...state.quests,
        daily: {
          ...state.quests.daily,
          _lastClaimDate: today,
          _streak: streak,
          _claimedToday: true
        }
      }
    }), 'daily/claim');

    this._eventBus.publish('daily:claimed', { streak, reward });
    this._eventBus.publish('ui:showToast', {
      message: `🌅 Tägliche Belohnung erhalten (${streak}. Tag)`,
      type: 'success',
      duration: 4000
    });

    return { success: true, streak, reward };
  }

  /**
   * Gibt den aktuellen Boost zurück.
   */
  getCurrentBoost() {
    const state = this._stateManager.getState();
    const daily = state.quests.daily;
    if (daily._boostUntil && daily._boostUntil > Date.now()) {
      return daily._currentBoost || null;
    }
    return null;
  }

  /**
   * Gibt den Streak zurück.
   */
  getStreak() {
    return this._stateManager.getState().quests.daily._streak || 0;
  }

  _daysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }
}

export default DailyRewardService;