/**
 * ============================================================
 * FILE: js/_tests_/LeaderboardService.test.js – LeaderboardService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import LeaderboardService from '../core/services/leaderboard-service.js';

describe('LeaderboardService (State-Integrated)', () => {
  let eventBus;
  let stateManager;
  let leaderboardService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init(null, null, null);
    leaderboardService = new LeaderboardService(stateManager, eventBus);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial leaderboard state slice is present and default', () => {
    const records = leaderboardService.getRecords();
    expect(records).toBeDefined();
    expect(records.highestPrestige).toBe(0);
    expect(records.highestLevel).toBe(1);
    expect(records.totalBossesDefeated).toBe(0);
  });

  test('state changes automatically update the leaderboard state slice', () => {
    // Modify hero level in state
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        level: 10
      }
    }), 'test/setLevel');

    // Trigger update (done automatically via state:changed)
    leaderboardService._updateFromState();

    const records = leaderboardService.getRecords();
    expect(records.highestLevel).toBe(10);
    
    // Check that stateManager's central state actually updated!
    const centralLeaderboard = stateManager.getState().leaderboard;
    expect(centralLeaderboard.highestLevel).toBe(10);
  });

  test('prestige event updates prestige records', () => {
    eventBus.publish('hero:prestige', { prestigeLevel: 3 });

    const records = leaderboardService.getRecords();
    expect(records.highestPrestige).toBe(3);
    expect(records.totalPrestiges).toBe(1);
  });

  test('game:reset event resets leaderboard records', () => {
    // First level up
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        level: 50
      }
    }), 'test/setLevel');
    leaderboardService._updateFromState();

    expect(leaderboardService.getRecords().highestLevel).toBe(50);

    // Reset StateManager to match real-game workflow
    stateManager.reset();

    // Fire reset event
    eventBus.publish('game:reset', {});

    expect(leaderboardService.getRecords().highestLevel).toBe(1);
    expect(leaderboardService.getRecords().highestPrestige).toBe(0);
  });
});
