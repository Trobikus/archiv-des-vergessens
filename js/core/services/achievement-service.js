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
      { id: 'particles_100', label: '100 Partikel gesammelt', target: 100, progress: 0, achieved: false, claimed: false, reward: { particles: 50, title: 'Sammler' } },
      { id: 'particles_1000', label: '1.000 Partikel gesammelt', target: 1000, progress: 0, achieved: false, claimed: false, reward: { particles: 120, title: 'Sammel-Meister' } },
      { id: 'relics_100', label: '100 Relikte gesammelt', target: 100, progress: 0, achieved: false, claimed: false, reward: { relics: 20, title: 'Erinnerungssucher' } },
      { id: 'boss_first_no_equip', label: 'Erster Boss ohne Ausrüstung', target: 1, progress: 0, achieved: false, claimed: false, reward: { particles: 80, title: 'Nackter Streiter' } },
      { id: 'recipes_10', label: '10 Rezepte geschmiedet', target: 10, progress: 0, achieved: false, claimed: false, reward: { artifacts: 8, title: 'Schmied' } },
      { id: 'recipes_50', label: '50 Rezepte geschmiedet', target: 50, progress: 0, achieved: false, claimed: false, reward: { particles: 300, title: 'Meisterschmied' } },
      { id: 'expeditions_100', label: '100 Expeditionen erfolgreich', target: 100, progress: 0, achieved: false, claimed: false, reward: { relics: 25, title: 'Pfadfinder' } }
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
    const hero = state.hero;
    const resources = selectResources(state);

    const progressMap = {
      particles_100: Math.floor(resources.totalParticles || 0),
      particles_1000: Math.floor(resources.totalParticles || 0),
      relics_100: Math.floor(resources.totalRelics || 0),
      boss_first_no_equip: hero._bossNoEquipmentWins || 0,
      recipes_10: hero._craftedRecipeCount || 0,
      recipes_50: hero._craftedRecipeCount || 0,
      expeditions_100: hero._successfulExpeditions || 0
    };

    let updated = false;

    this._stateManager.dispatch((state) => {
      const achievements = state.achievements.list.map(ach => {
        const current = progressMap[ach.id] || 0;
        const progress = Math.min(current, ach.target);
        if (!ach.achieved && progress >= ach.target) {
          updated = true;
          return { ...ach, progress, achieved: true };
        }
        if (ach.progress !== progress) {
          return { ...ach, progress };
        }
        return ach;
      });

      if (!updated) return state;

      return {
        ...state,
        achievements: {
          ...state.achievements,
          list: achievements
        }
      };
    }, 'achievement/checkProgress');

    if (updated) {
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