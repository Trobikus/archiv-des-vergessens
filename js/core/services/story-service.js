/**
 * ============================================================
 * FILE: core/services/story-service.js – Story- & Boss-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Boss-Daten bereitstellen
 * - Kampf-Logik (deterministisch)
 * - Boss-Belohnungen verarbeiten
 * - Auto-Boss-Funktion
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectHero, selectHeroCombatStats } from '../state/selectors.js';
import { generateStoryBosses } from '../../data/bosses.js';
import { CONFIG } from '../../data/config.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import { ITEM_TEMPLATES } from '../../data/items.js';
import { Item } from '../../models/item.js';
import { EVENTS } from '../events/definitions.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */

export class StoryService {
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
    this._bosses = generateStoryBosses();
    this._slowTickSubscription = null;
    this._battleTimeout = null;

    this._bindSlowTick();
    this._bindEvents();
  }

  _bindSlowTick() {
    this._slowTickSubscription = this._eventBus.subscribe(EVENTS.GAME_SLOW_TICK, (data) => {
      this._processAutoBoss(data.delta);
      this._processBattleTimer(data.delta);
    });
  }

  _bindEvents() {
    this._eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => {
      this._abortBattle();
    });
  }

  // ---- ÖFFENTLICHE API ----

  /**
   * Gibt alle Bosse zurück.
   */
  getBosses() {
    return this._bosses;
  }

  /**
   * Gibt den aktuellen Boss zurück (basierend auf bossProgress).
   */
  getCurrentBoss() {
    const state = this._stateManager.getState();
    const progress = state.hero.prestige.bossProgress;
    if (progress >= this._bosses.length) return null;
    return this._bosses[Math.floor(progress)];
  }

  /**
   * Startet einen Bosskampf (manuell oder über Auto-Boss).
   */
  startBossFight() {
    const state = this._stateManager.getState();
    if (state.story.battleInProgress) return;

    const boss = this.getCurrentBoss();
    if (!boss) {
      this._eventBus.publish('ui:showToast', {
        message: '🏆 Alle Bosse besiegt!',
        type: 'success',
        duration: 3000
      });
      return;
    }

    const hero = state.hero;
    const cStats = selectHeroCombatStats(state);
    const heroDamageMultiplier = hero.unlockedSkills.includes('warrior_2') ? 1.2 : 1;

    // Schadensberechnung
    const bossDamageReduction = boss.defense / (boss.defense + 100);
    const baseHeroDamage = (cStats.attack * heroDamageMultiplier) * (1 - bossDamageReduction);
    const expectedHeroDamage = Math.max(1, baseHeroDamage * (1 + (cStats.critChance / 100) * ((cStats.critDamage / 100) - 1)));

    const baseBossDamage = boss.attack * (1 - cStats.damageReduction);
    const expectedBossDamage = Math.max(1, baseBossDamage * (1 - (cStats.dodgeChance / 100)));

    const roundsToKillBoss = Math.ceil(boss.hp / expectedHeroDamage);
    const roundsToKillHero = Math.ceil(cStats.maxHp / expectedBossDamage);

    const victory = roundsToKillBoss <= roundsToKillHero;
    const rounds = victory ? roundsToKillBoss : roundsToKillHero;

    const bossHP = victory ? 0 : Math.max(0, Math.floor(boss.hp - (rounds * expectedHeroDamage)));
    const heroHP = victory ? Math.max(0, Math.floor(cStats.maxHp - (rounds * expectedBossDamage))) : 0;

    // Battle-State setzen
    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleInProgress: true,
        battleTimer: CONFIG.STORY.BATTLE_DURATION_MS,
        _battleResult: { victory, boss, rounds, bossHP, heroHP }
      }
    }), 'story/battleStart');

    this._eventBus.publish('story:battleStarted', { boss, victory });
    this._eventBus.publish('ui:showToast', {
      message: `⚔️ Kampf gegen ${boss.name} beginnt!`,
      type: 'info',
      duration: 2000
    });
  }

  /**
   * Verarbeitet den Battle-Timer (wird bei Tick aufgerufen).
   */
  _processBattleTimer(delta) {
    const state = this._stateManager.getState();
    if (!state.story.battleInProgress) return;

    const remaining = state.story.battleTimer - delta;
    if (remaining <= 0) {
      this._finishBattle();
    } else {
      this._stateManager.dispatch((state) => ({
        ...state,
        story: {
          ...state.story,
          battleTimer: remaining
        }
      }), 'story/battleTick');
    }
  }

  /**
   * Schließt den Kampf ab (wird nach Battle-Dauer aufgerufen).
   */
  _finishBattle() {
    const state = this._stateManager.getState();
    const battle = state.story._battleResult;
    if (!battle) return;

    const { victory, boss, bossHP, heroHP } = battle;

    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleInProgress: false,
        battleTimer: 0,
        _battleResult: null
      }
    }), 'story/battleEnd');

    if (victory && heroHP > 0) {
      this._processVictory(boss);
    } else {
      this._processDefeat(boss);
    }

    this._eventBus.publish('story:battleResult', { victory, boss, heroHP, bossHP });
  }

  /**
   * Verarbeitet einen Sieg.
   */
  _processVictory(boss) {
    const hero = this._heroService.getHero();

    // Boss-Fortschritt erhöhen
    this._stateManager.dispatch((state) => {
      const progress = state.hero.prestige.bossProgress + 1;
      const defeated = [...state.hero.prestige.defeatedBosses, boss.id];
      return {
        ...state,
        hero: {
          ...state.hero,
          prestige: {
            ...state.hero.prestige,
            bossProgress: progress,
            defeatedBosses: defeated
          }
        }
      };
    }, 'story/bossDefeated');

    // Erfahrung vergeben
    const expReward = boss.reward.exp || CONFIG.STORY.BASE_EXP_REWARD;
    this._heroService.addExperience(expReward);

    // Item-Belohnungen
    if (boss.reward.items && boss.reward.items.length > 0) {
      for (const itemName of boss.reward.items) {
        const template = ITEM_TEMPLATES[itemName];
        if (template) {
          const item = new Item(
            itemName,
            template.slot,
            template.rarity,
            { ...template.stats },
            '',
            false,
            1
          );
          this._heroService._stateManager.dispatch((state) => ({
            ...state,
            hero: {
              ...state.hero,
              inventory: {
                ...state.hero.inventory,
                equipment: [...state.hero.inventory.equipment, item.toJSON()]
              }
            }
          }), 'story/addItemReward');
        }
      }
    }

    // Prüfung für Achievement "Boss ohne Ausrüstung"
    const heroState = this._heroService.getHero();
    const hasEquip = Object.values(heroState.equipment).some(slot => slot !== null);
    if (!hasEquip) {
      this._stateManager.dispatch((state) => ({
        ...state,
        hero: {
          ...state.hero,
          _bossNoEquipmentWins: (state.hero._bossNoEquipmentWins || 0) + 1
        }
      }), 'story/noEquipWin');
    }

    // Event
    this._eventBus.publish('story:bossDefeated', { boss });
    this._eventBus.publish('ui:showToast', {
      message: `🏆 ${boss.name} besiegt! +${expReward} XP`,
      type: 'success',
      duration: 3000
    });
  }

  /**
   * Verarbeitet eine Niederlage.
   */
  _processDefeat(boss) {
    this._eventBus.publish('ui:showToast', {
      message: `💀 Niederlage gegen ${boss.name}... Verbessere deine Ausrüstung!`,
      type: 'warning',
      duration: 4000
    });
  }

  /**
   * Auto-Boss: Startet automatisch Kämpfe, wenn Talent freigeschaltet.
   */
  _processAutoBoss(delta) {
    const state = this._stateManager.getState();
    if (state.story.battleInProgress) return;
    if (!state.hero.unlockedSkills.includes('auto_boss')) return;
    if (state.hero.prestige.bossProgress >= this._bosses.length) return;

    let timer = state.story.autoBossTimer + delta;
    if (timer >= CONFIG.STORY.AUTO_BOSS_INTERVAL_MS) {
      timer = 0;
      this.startBossFight();
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        autoBossTimer: timer
      }
    }), 'story/autoBossTick');
  }

  /**
   * Bricht den aktuellen Kampf ab.
   */
  _abortBattle() {
    const state = this._stateManager.getState();
    if (!state.story.battleInProgress) return;

    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleInProgress: false,
        battleTimer: 0,
        _battleResult: null
      }
    }), 'story/abortBattle');

    this._eventBus.publish('story:battleAborted', {});
  }

  /**
   * Zerstört den Service.
   */
  destroy() {
    if (this._slowTickSubscription !== null) {
      this._eventBus.unsubscribe(this._slowTickSubscription);
      this._slowTickSubscription = null;
    }
    if (this._battleTimeout) {
      clearTimeout(this._battleTimeout);
      this._battleTimeout = null;
    }
  }
}

export default StoryService;