/**
 * ============================================================
 * FILE: js/_tests_/LeaderboardService.test.js – LeaderboardService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import LeaderboardService, {
  sanitizeTimeRecord,
  isBetterTime,
  formatTimeRecord
} from '../core/services/leaderboard-service.js';

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
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        level: 10
      }
    }), 'test/setLevel');

    leaderboardService._updateFromState();

    const records = leaderboardService.getRecords();
    expect(records.highestLevel).toBe(10);

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
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        level: 50
      }
    }), 'test/setLevel');
    leaderboardService._updateFromState();

    expect(leaderboardService.getRecords().highestLevel).toBe(50);

    stateManager.reset();
    eventBus.publish('game:reset', {});

    expect(leaderboardService.getRecords().highestLevel).toBe(1);
    expect(leaderboardService.getRecords().highestPrestige).toBe(0);
  });

  test('sanitizeTimeRecord restores null from JSON Infinity loss', () => {
    // Charakterisierung bleibt über Re-Export; Detailtests in LeaderboardSanitize.test.js
    expect(sanitizeTimeRecord(null)).toBe(Infinity);
    expect(sanitizeTimeRecord(12.5)).toBe(12.5);
  });

  test('null fastestBossKill still accepts new records and displays dash', () => {
    stateManager.dispatch((state) => ({
      ...state,
      leaderboard: {
        ...state.leaderboard,
        fastestBossKill: null,
        fastestPrestige: null,
        fastestLevelUp: null
      }
    }), 'test/corruptTimes');

    const stats = leaderboardService.getFormattedStats();
    expect(stats['⏱️ Schnellster Boss']).toBe('—');
    expect(stats['⏱️ Schnellstes Prestige']).toBe('—');

    expect(isBetterTime(12.34, null)).toBe(true);
    leaderboardService.updateBossDefeated('boss_1', 12.34, 1);
    expect(leaderboardService.getRecords().fastestBossKill).toBe(12.34);
    expect(formatTimeRecord(12.34)).toBe('12.3s');
  });

  test('state migration restores null time fields to Infinity', () => {
    const freshBus = new EventBus();
    const freshManager = new StateManager(freshBus);
    freshManager.init(null, null, null);

    const migrated = freshManager._migrateState({
      ...freshManager.getState(),
      leaderboard: {
        ...freshManager.getState().leaderboard,
        highestPrestige: 2,
        fastestBossKill: null,
        fastestPrestige: null,
        fastestLevelUp: null,
        highestLevel: 5
      }
    });

    expect(migrated.leaderboard.fastestBossKill).toBe(Infinity);
    expect(migrated.leaderboard.fastestPrestige).toBe(Infinity);
    expect(migrated.leaderboard.fastestLevelUp).toBe(Infinity);
    expect(migrated.leaderboard.highestPrestige).toBe(2);
    expect(migrated.leaderboard.highestLevel).toBe(5);

    freshBus.destroy();
  });

  test('requestGlobalLeaderboard times out when connected but silent', () => {
    vi.useFakeTimers();
    const networkService = {
      isConnected: () => true,
      send: vi.fn()
    };
    const timedService = new LeaderboardService(stateManager, eventBus, networkService);
    const handler = vi.fn();
    eventBus.subscribe('leaderboard:globalUpdated', handler);

    timedService.requestGlobalLeaderboard();
    expect(networkService.send).toHaveBeenCalledWith('leaderboard:get');
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(handler).toHaveBeenCalledWith(null);

    vi.useRealTimers();
  });
});
