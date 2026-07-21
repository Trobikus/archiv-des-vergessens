/**
 * ============================================================
 * FILE: js/_tests_/QuestService.test.js – QuestService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import ResourceService from '../core/services/resource-service.js';
import HeroService from '../core/services/hero-service.js';
import ClanService from '../core/services/clan-service.js';
import QuestService from '../core/services/quest-service.js';

describe('QuestService', () => {
  let eventBus;
  let stateManager;
  let resourceService;
  let heroService;
  let clanService;
  let questService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    heroService = new HeroService(stateManager, eventBus);
    clanService = new ClanService(stateManager, eventBus, resourceService);
    questService = new QuestService(stateManager, eventBus, resourceService, heroService, clanService);

    stateManager.init(null, null, null);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial quest state is correct', () => {
    const activeQuest = questService.getCurrentQuest();
    expect(activeQuest).toBeDefined();
    expect(activeQuest.id).toBe('q1');
    expect(questService.isCurrentQuestComplete()).toBe(false);
  });

  test('q1 (particles >= 10) condition works', () => {
    expect(questService.isCurrentQuestComplete()).toBe(false);

    resourceService.addParticles(10);
    expect(questService.isCurrentQuestComplete()).toBe(true);
  });

  test('quest completion transitions and claiming rewards', () => {
    resourceService.addParticles(10);
    expect(questService.getCurrentQuest().id).toBe('q1');
    expect(questService.isCurrentQuestComplete()).toBe(true);

    const initialParticles = BigInt(resourceService.getResources().particles);
    questService.claimReward();

    // Assert next quest is active
    expect(questService.getCurrentQuest().id).toBe('q2');
    expect(questService.isCurrentQuestComplete()).toBe(false);

    // Reward added (q1 reward: 15 particles)
    const currentParticles = BigInt(resourceService.getResources().particles);
    expect(currentParticles).toBe(initialParticles + 15n);
  });

  test('q2 (clan members >= 1) and q3 (send on expedition / robust callback)', () => {
    // Manually advance to q2
    stateManager.dispatch((state) => ({
      ...state,
      quests: { ...state.quests, mainIndex: 1 }
    }), 'test/setQuestIndex');

    expect(questService.getCurrentQuest().id).toBe('q2');
    expect(questService.isCurrentQuestComplete()).toBe(false);

    // Recruit a member
    stateManager.dispatch((state) => ({
      ...state,
      clan: {
        ...state.clan,
        members: [{ id: 1, name: 'Hero 1', role: 'collector', level: 1 }]
      }
    }), 'test/addMember');

    expect(questService.isCurrentQuestComplete()).toBe(true);
    questService.claimReward();

    // Now q3 is active
    expect(questService.getCurrentQuest().id).toBe('q3');
    expect(questService.isCurrentQuestComplete()).toBe(false);

    // Mock an active expedition
    vi.spyOn(clanService, 'isOnExpedition').mockImplementation((memberId) => memberId === 1);
    expect(questService.isCurrentQuestComplete()).toBe(true);

    // Test robust q3 condition: even if expedition finishes (isOnExpedition becomes false),
    // if successfulExpeditions > 0, it should still be complete!
    vi.spyOn(clanService, 'isOnExpedition').mockImplementation(() => false);
    expect(questService.isCurrentQuestComplete()).toBe(false);

    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        _successfulExpeditions: 1
      }
    }), 'test/addSuccessfulExpedition');
    expect(questService.isCurrentQuestComplete()).toBe(true);
  });

  test('q12 (upgrade equipment) checks both equipped slots and inventory', () => {
    stateManager.dispatch((state) => ({
      ...state,
      quests: { ...state.quests, mainIndex: 11 } // q12 index
    }), 'test/setQuestIndex');

    expect(questService.getCurrentQuest().id).toBe('q12');
    expect(questService.isCurrentQuestComplete()).toBe(false);

    // Equipped item at level 1: not complete
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        equipment: {
          ...state.hero.equipment,
          weapon: { name: 'Rusty Sword', level: 1, slot: 'weapon' }
        }
      }
    }), 'test/equipItemLevel1');
    expect(questService.isCurrentQuestComplete()).toBe(false);

    // Equipped item at level 2: complete!
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        equipment: {
          ...state.hero.equipment,
          weapon: { name: 'Rusty Sword', level: 2, slot: 'weapon' }
        }
      }
    }), 'test/equipItemLevel2');
    expect(questService.isCurrentQuestComplete()).toBe(true);

    // Revert equipped item level, but put level 2 item in inventory instead (simulates unequipping)
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        equipment: {
          ...state.hero.equipment,
          weapon: null
        },
        inventory: {
          ...state.hero.inventory,
          equipment: [{ name: 'Rusty Sword', level: 2, slot: 'weapon' }]
        }
      }
    }), 'test/unequipItem');
    // Thanks to our robust check, it's still complete!
    expect(questService.isCurrentQuestComplete()).toBe(true);
  });

  test('QuestService listens to forge:upgraded event', () => {
    let triggered = false;
    eventBus.subscribe('quest:updated', () => {
      triggered = true;
    });

    eventBus.publish('forge:upgraded', {});
    expect(triggered).toBe(true);
  });

  test('QuestService listens to story:bossDefeated event', () => {
    let triggered = false;
    eventBus.subscribe('quest:updated', () => {
      triggered = true;
    });

    eventBus.publish('story:bossDefeated', { boss: { id: 1 } });
    expect(triggered).toBe(true);
  });

  test('prestige resets quest mainIndex to 0', () => {
    stateManager.dispatch((state) => ({
      ...state,
      quests: { ...state.quests, mainIndex: 5 }
    }), 'test/setQuestIndex');

    expect(questService.getCurrentQuest().id).toBe('q6');

    eventBus.publish('hero:prestige', {});
    expect(questService.getCurrentQuest().id).toBe('q1');
  });

  test('daily quests reset and claim works', () => {
    const dailyQuests = questService.getDailyQuests();
    expect(dailyQuests.length).toBe(3);

    // Mock progress of daily_1 (clicks)
    stateManager.dispatch((state) => ({
      ...state,
      quests: {
        ...state.quests,
        daily: {
          ...state.quests.daily,
          gatherClicks: 10
        }
      }
    }), 'test/mockDailyProgress');

    let dailies = questService.getDailyQuests();
    let d1 = dailies.find(q => q.id === 'daily_1');
    expect(d1.progress).toBe(10);
    expect(d1.target).toBe(50);
    expect(d1.isComplete).toBe(false);

    // Mock complete
    stateManager.dispatch((state) => ({
      ...state,
      quests: {
        ...state.quests,
        daily: {
          ...state.quests.daily,
          gatherClicks: 50
        }
      }
    }), 'test/mockDailyComplete');

    dailies = questService.getDailyQuests();
    d1 = dailies.find(q => q.id === 'daily_1');
    expect(d1.isComplete).toBe(true);
    expect(d1.isClaimed).toBe(false);

    // Claim daily reward
    const resBefore = BigInt(resourceService.getResources().particles);
    questService.claimDailyReward('daily_1');

    dailies = questService.getDailyQuests();
    d1 = dailies.find(q => q.id === 'daily_1');
    expect(d1.isClaimed).toBe(true);

    const resAfter = BigInt(resourceService.getResources().particles);
    expect(resAfter).toBe(resBefore + 100n); // daily_1 reward is 100 particles
  });
});
