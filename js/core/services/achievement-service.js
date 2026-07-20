/**
 * ============================================================
 * FILE: core/services/achievement-service.js – Errungenschaften
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Alle Errungenschaften verwalten
 * - Fortschrittsprüfung bei Events
 * - Belohnungen einlösen
 * - Titel vergeben
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectResources } from '../state/selectors.js';
import { sanitizeNumber } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */

export class AchievementService {
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

    this._achievements = this._buildBaseAchievements();

    this._bindEvents();
  }

  _buildBaseAchievements() {
    return [
      // Partikel
      { id: 'particles_100', label: '100 Partikel gesammelt', target: 100, progress: 0, achieved: false, claimed: false, reward: { particles: 50, title: 'Novize des Lichts' } },
      { id: 'particles_1000', label: '1.000 Partikel gesammelt', target: 1000, progress: 0, achieved: false, claimed: false, reward: { particles: 200, title: 'Sammler' } },
      { id: 'particles_10000', label: '10.000 Partikel gesammelt', target: 10000, progress: 0, achieved: false, claimed: false, reward: { particles: 1000, title: 'Chronometer-König' } },
      { id: 'particles_100000', label: '100.000 Partikel gesammelt', target: 100000, progress: 0, achieved: false, claimed: false, reward: { particles: 5000, title: 'Lichtweber' } },
      { id: 'particles_1000000', label: '1.000.000 Partikel gesammelt', target: 1000000, progress: 0, achieved: false, claimed: false, reward: { particles: 50000, title: 'Mneme-Gott' } },

      // Relikte
      { id: 'relics_10', label: '10 Relikte geborgen', target: 10, progress: 0, achieved: false, claimed: false, reward: { relics: 5, title: 'Spurensucher' } },
      { id: 'relics_100', label: '100 Relikte geborgen', target: 100, progress: 0, achieved: false, claimed: false, reward: { relics: 30, title: 'Erinnerungsarchivar' } },
      { id: 'relics_500', label: '500 Relikte geborgen', target: 500, progress: 0, achieved: false, claimed: false, reward: { relics: 150, title: 'Reliktwächter' } },
      { id: 'relics_2000', label: '2.000 Relikte geborgen', target: 2000, progress: 0, achieved: false, claimed: false, reward: { relics: 600, title: 'Chronist der Ewigkeit' } },

      // Schmieden / Rezepte
      { id: 'recipes_1', label: 'Erstes Rezept geschmiedet', target: 1, progress: 0, achieved: false, claimed: false, reward: { artifacts: 1, title: 'Lehrling' } },
      { id: 'recipes_10', label: '10 Rezepte geschmiedet', target: 10, progress: 0, achieved: false, claimed: false, reward: { artifacts: 8, title: 'Eisenschmied' } },
      { id: 'recipes_50', label: '50 Rezepte geschmiedet', target: 50, progress: 0, achieved: false, claimed: false, reward: { artifacts: 20, title: 'Meisterschmied' } },
      { id: 'recipes_100', label: '100 Rezepte geschmiedet', target: 100, progress: 0, achieved: false, claimed: false, reward: { artifacts: 50, title: 'Großschmied' } },

      // Expeditionen
      { id: 'expeditions_1', label: 'Erste Expedition erfolgreich', target: 1, progress: 0, achieved: false, claimed: false, reward: { relics: 2, title: 'Pfadfinder' } },
      { id: 'expeditions_10', label: '10 Expeditionen erfolgreich', target: 10, progress: 0, achieved: false, claimed: false, reward: { relics: 10, title: 'Entdecker' } },
      { id: 'expeditions_50', label: '50 Expeditionen erfolgreich', target: 50, progress: 0, achieved: false, claimed: false, reward: { relics: 35, title: 'Pionier des Bundes' } },
      { id: 'expeditions_100', label: '100 Expeditionen erfolgreich', target: 100, progress: 0, achieved: false, claimed: false, reward: { relics: 80, title: 'Weltenwanderer' } },

      // Bosse / Besondere Siege
      { id: 'boss_1', label: 'Ersten Boss bezwungen', target: 1, progress: 0, achieved: false, claimed: false, reward: { particles: 100, title: 'Krieger des Bundes' } },
      { id: 'boss_5', label: '5 Bosse bezwungen', target: 5, progress: 0, achieved: false, claimed: false, reward: { particles: 500, title: 'Nemesis-Bezwinger' } },
      { id: 'boss_10', label: '10 Bosse bezwungen', target: 10, progress: 0, achieved: false, claimed: false, reward: { relics: 15, title: 'Bossjäger' } },
      { id: 'boss_20', label: '20 Bosse bezwungen', target: 20, progress: 0, achieved: false, claimed: false, reward: { relics: 50, title: 'Legende des Archivs' } },
      { id: 'boss_first_no_equip', label: 'Boss ohne Ausrüstung besiegt', target: 1, progress: 0, achieved: false, claimed: false, reward: { particles: 200, title: 'Nackter Streiter' } },

      // Prestige / Verewigung
      { id: 'prestige_1', label: 'Einmal verewigt (Prestige 1)', target: 1, progress: 0, achieved: false, claimed: false, reward: { relics: 15, title: 'Wiedergeborener' } },
      { id: 'prestige_5', label: '5-mal verewigt (Prestige 5)', target: 5, progress: 0, achieved: false, claimed: false, reward: { relics: 100, title: 'Unsterblicher' } }
    ];
  }

  _bindEvents() {
    this._eventBus.subscribe('resources:updated', () => this._checkProgress());
    this._eventBus.subscribe('story:bossDefeated', () => this._checkProgress());
    this._eventBus.subscribe('forge:crafted', () => this._checkProgress());
    this._eventBus.subscribe('expedition:complete', (data) => {
      if (data.success) this._checkProgress();
    });
    this._eventBus.subscribe('hero:updated', () => this._checkProgress());
    this._eventBus.subscribe('hero:prestige', () => this._onPrestige());
    this._eventBus.subscribe('game:booted', () => this._checkProgress());
  }

  _onPrestige() {
    // Bei Prestige werden Errungenschaften zurückgesetzt (außer bereits beanspruchte)
    this._stateManager.dispatch((state) => {
      const achievements = state.achievements.list.map(ach => {
        if (ach.claimed) return ach;
        return { ...ach, progress: 0, achieved: false };
      });
      return {
        ...state,
        achievements: {
          ...state.achievements,
          list: achievements
        }
      };
    }, 'achievement/prestigeReset');
    this._checkProgress();
  }

  _checkProgress() {
    const state = this._stateManager.getState();
    if (!state || !state.hero) return;

    const hero = state.hero;
    const resources = selectResources(state);

    const progressMap = {
      particles_100: Math.floor(resources.totalParticles || 0),
      particles_1000: Math.floor(resources.totalParticles || 0),
      particles_10000: Math.floor(resources.totalParticles || 0),
      particles_100000: Math.floor(resources.totalParticles || 0),
      particles_1000000: Math.floor(resources.totalParticles || 0),

      relics_10: Math.floor(resources.totalRelics || 0),
      relics_100: Math.floor(resources.totalRelics || 0),
      relics_500: Math.floor(resources.totalRelics || 0),
      relics_2000: Math.floor(resources.totalRelics || 0),

      recipes_1: hero._craftedRecipeCount || 0,
      recipes_10: hero._craftedRecipeCount || 0,
      recipes_50: hero._craftedRecipeCount || 0,
      recipes_100: hero._craftedRecipeCount || 0,

      expeditions_1: hero._successfulExpeditions || 0,
      expeditions_10: hero._successfulExpeditions || 0,
      expeditions_50: hero._successfulExpeditions || 0,
      expeditions_100: hero._successfulExpeditions || 0,

      boss_1: hero.prestige?.defeatedBosses?.length || 0,
      boss_5: hero.prestige?.defeatedBosses?.length || 0,
      boss_10: hero.prestige?.defeatedBosses?.length || 0,
      boss_20: hero.prestige?.defeatedBosses?.length || 0,
      boss_first_no_equip: hero._bossNoEquipmentWins || 0,

      prestige_1: hero.prestige?.level || 0,
      prestige_5: hero.prestige?.level || 0
    };

    let unlockedAny = false;
    let progressChanged = false;

    this._stateManager.dispatch((state) => {
      const list = (!state.achievements || !state.achievements.list || state.achievements.list.length === 0) ? this._achievements : state.achievements.list;
      const achievements = list.map(ach => {
        const current = progressMap[ach.id] || 0;
        const progress = Math.min(current, ach.target);
        if (!ach.achieved && progress >= ach.target) {
          unlockedAny = true;
          return { ...ach, progress, achieved: true };
        }
        if (ach.progress !== progress) {
          progressChanged = true;
          return { ...ach, progress };
        }
        return ach;
      });

      const isInitialPopulate = (!state.achievements || !state.achievements.list || state.achievements.list.length === 0);
      if (!unlockedAny && !progressChanged && !isInitialPopulate) return state;

      return {
        ...state,
        achievements: {
          ...state.achievements,
          list: achievements
        }
      };
    }, 'achievement/checkProgress');

    if (unlockedAny) {
      // Neue Errungenschaften wurden freigeschaltet – Events auslösen
      const unlocked = this._stateManager.getState().achievements.list.filter(a => a.achieved && !a.claimed);
      for (const ach of unlocked) {
        this._eventBus.publish('achievement:unlocked', { achievement: ach });
        this._eventBus.publish('ui:showToast', {
          message: `🏆 Erfolg erreicht: ${ach.label}!`,
          type: 'success',
          duration: 4000
        });
      }
    }
  }

  getAchievements() {
    return this._stateManager.getState().achievements.list;
  }

  claimReward(id) {
    const state = this._stateManager.getState();
    const ach = state.achievements.list.find(a => a.id === id);
    if (!ach || !ach.achieved || ach.claimed) return false;

    // Belohnung vergeben
    if (ach.reward.particles) this._resourceService.addParticles(ach.reward.particles);
    if (ach.reward.relics) this._resourceService.addRelics(ach.reward.relics);
    if (ach.reward.artifacts) this._resourceService._stateManager.dispatch(Actions.addArtifacts(ach.reward.artifacts));
    if (ach.reward.title) {
      this._heroService._stateManager.dispatch((state) => {
        const hero = { ...state.hero };
        const titles = hero.titles || [];
        if (!titles.includes(ach.reward.title)) {
          hero.titles = [...titles, ach.reward.title];
          hero.title = ach.reward.title;
        }
        return { ...state, hero };
      }, 'achievement/claimTitle');
    }

    // Als beansprucht markieren
    this._stateManager.dispatch((state) => {
      const achievements = state.achievements.list.map(a => {
        if (a.id === id) return { ...a, claimed: true };
        return a;
      });
      return {
        ...state,
        achievements: {
          ...state.achievements,
          list: achievements
        }
      };
    }, 'achievement/claim');

    this._eventBus.publish('achievement:claimed', { achievement: ach });
    this._eventBus.publish('ui:showToast', {
      message: `🎁 Belohnung für "${ach.label}" erhalten!`,
      type: 'success',
      duration: 3000
    });
    return true;
  }

  // ---- PERSISTENZ ----

  toJSON() {
    return this._stateManager.getState().achievements;
  }

  fromJSON(data) {
    if (!data) return;
    this._stateManager.dispatch((state) => ({
      ...state,
      achievements: data
    }), 'achievement/load');
    this._checkProgress();
  }
}

export default AchievementService;