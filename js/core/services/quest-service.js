/**
 * ============================================================
 * FILE: core/services/quest-service.js – Missionen
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Hauptmissionen (lineare Story)
 * - Tägliche Missionen
 * - Fortschrittsprüfung und Belohnungen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { MAIN_QUESTS_DATA, DAILY_QUESTS_DATA } from '../../data/quests.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */
/** @typedef {import('./clan-service.js').default} ClanService */

export class QuestService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   * @param {HeroService} heroService
   * @param {ClanService} clanService
   */
  constructor(stateManager, eventBus, resourceService, heroService, clanService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
    this._clanService = clanService;

    this._mainQuests = MAIN_QUESTS_DATA;
    this._dailyDefs = DAILY_QUESTS_DATA;

    this._bindEvents();
  }

  _bindEvents() {
    this._eventBus.subscribe('hero:updated', () => this.checkCurrentQuest());
    this._eventBus.subscribe('resources:updated', () => this.checkCurrentQuest());
    this._eventBus.subscribe('clan:membersUpdated', () => this.checkCurrentQuest());
    this._eventBus.subscribe('expedition:started', () => this.checkCurrentQuest());
    this._eventBus.subscribe('expedition:complete', () => {
      this._incrementDaily('expeditions');
      this.checkCurrentQuest();
    });
    this._eventBus.subscribe('forge:crafted', () => {
      this._incrementDaily('craftedItems');
      this.checkCurrentQuest();
    });
    this._eventBus.subscribe('forge:upgraded', () => this.checkCurrentQuest());
    this._eventBus.subscribe('story:bossDefeated', () => this.checkCurrentQuest());
    this._eventBus.subscribe('quest:manualGather', () => {
      this._incrementDaily('gatherClicks');
      this.checkCurrentQuest();
    });
    this._eventBus.subscribe('hero:prestige', () => {
      this._resetQuests();
    });
    this._eventBus.subscribe('game:booted', () => this._checkDailyReset());
  }

  // ---- DAILY RESET ----

  _checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    this._stateManager.dispatch((state) => {
      const daily = state.quests.daily;
      if (daily.date !== today) {
        return {
          ...state,
          quests: {
            ...state.quests,
            daily: { date: today, gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] }
          }
        };
      }
      return state;
    }, 'quest/checkDailyReset');
  }

  _incrementDaily(key) {
    this._checkDailyReset();
    this._stateManager.dispatch((state) => {
      const daily = { ...state.quests.daily };
      daily[key] = (daily[key] || 0) + 1;
      return {
        ...state,
        quests: {
          ...state.quests,
          daily
        }
      };
    }, 'quest/incrementDaily');
  }

  _resetQuests() {
    this._stateManager.dispatch((state) => ({
      ...state,
      quests: {
        mainIndex: 0,
        daily: { date: '', gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] }
      }
    }), 'quest/reset');
    this._eventBus.publish('quest:updated', {});
  }

  // ---- HAUPTMISSIONEN ----

  getCurrentQuest() {
    const state = this._stateManager.getState();
    const index = state.quests.mainIndex;
    if (index >= this._mainQuests.length) return null;
    return this._mainQuests[index];
  }

  isCurrentQuestComplete() {
    const q = this.getCurrentQuest();
    if (!q) return false;
    return this._checkCondition(q.id);
  }

  checkCurrentQuest() {
    if (this.isCurrentQuestComplete()) {
      this._eventBus.publish('quest:completed', { quest: this.getCurrentQuest() });
    }
    this._eventBus.publish('quest:updated', {});
  }

  claimReward() {
    const q = this.getCurrentQuest();
    if (!q || !this.isCurrentQuestComplete()) return;

    this._grantReward(q.reward);
    this._stateManager.dispatch((state) => ({
      ...state,
      quests: {
        ...state.quests,
        mainIndex: state.quests.mainIndex + 1
      }
    }), 'quest/claimReward');

    this._eventBus.publish('ui:showToast', {
      message: `✅ Mission erfüllt: ${q.text}`,
      type: 'success',
      duration: 3000
    });
    this._eventBus.publish('quest:updated', {});
  }

  _checkCondition(questId) {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const res = state.resources;
    const clan = state.clan;

    switch (questId) {
      case 'q1': return Number(res.particles) >= 10;
      case 'q2': return clan.members.length >= 1;
      case 'q3': return clan.members.some(m => this._clanService.isOnExpedition(m.id)) || (hero._successfulExpeditions || 0) > 0;
      case 'q4': return hero.prestige.bossProgress >= 1;
      case 'q5': return Object.values(hero.equipment).some(item => item !== null);
      case 'q6': return hero.clickPowerLevel >= 1;
      case 'q7': return hero._craftedRecipeCount > 0;
      case 'q8': return hero.prestige.bossProgress >= 10;
      case 'q9': return Number(res.relics) >= 20;
      case 'q10': return clan.members.length >= 5;
      case 'q11': return hero.level >= 10;
      case 'q12': return Object.values(hero.equipment).some(i => i && i.level > 1) || (hero.inventory?.equipment && hero.inventory.equipment.some(i => i && i.level > 1));
      case 'q13': return (hero._successfulExpeditions || 0) >= 25;
      case 'q14': return hero.prestige.bossProgress >= 20;
      case 'q15': return Number(res.totalParticles) >= 1000;
      default: return false;
    }
  }

  _grantReward(reward) {
    if (reward.particles) this._resourceService.addParticles(reward.particles);
    if (reward.relics) this._resourceService.addRelics(reward.relics);
    if (reward.artifacts) this._resourceService._stateManager.dispatch(Actions.addArtifacts(reward.artifacts));
    if (reward.memoryDust) this._resourceService._stateManager.dispatch(Actions.addMemoryDust(reward.memoryDust));
  }

  // ---- TÄGLICHE MISSIONEN ----

  getDailyQuests() {
    this._checkDailyReset();
    const state = this._stateManager.getState();
    const daily = state.quests.daily;

    return this._dailyDefs.map(def => {
      const progress = daily[def.key] || 0;
      const isClaimed = daily.claimed.includes(def.id);
      return {
        ...def,
        progress: Math.min(progress, def.target),
        isClaimed,
        isComplete: progress >= def.target,
        rewardFunc: () => this._grantReward(def.reward)
      };
    });
  }

  claimDailyReward(dailyId) {
    const dailies = this.getDailyQuests();
    const d = dailies.find(q => q.id === dailyId);
    if (!d || !d.isComplete || d.isClaimed) return;

    this._grantReward(d.reward);
    this._stateManager.dispatch((state) => {
      const daily = { ...state.quests.daily };
      daily.claimed = [...daily.claimed, dailyId];
      return {
        ...state,
        quests: {
          ...state.quests,
          daily
        }
      };
    }, 'quest/claimDaily');

    this._eventBus.publish('ui:showToast', {
      message: `📅 Tägliche Mission: ${d.text}`,
      type: 'success',
      duration: 3000
    });
    this._eventBus.publish('quest:updated', {});
  }

  // ---- PERSISTENZ ----

  toJSON() {
    const state = this._stateManager.getState();
    return state.quests;
  }

  fromJSON(data) {
    if (!data) return;
    this._stateManager.dispatch((state) => ({
      ...state,
      quests: data
    }), 'quest/load');
  }
}

export default QuestService;