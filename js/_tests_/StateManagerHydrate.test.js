/**
 * ============================================================
 * FILE: js/_tests_/StateManagerHydrate.test.js
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';

describe('StateManager.hydrate', () => {
  let eventBus;
  let stateManager;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init(null, null, null);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('replaces state and migrates null leaderboard times', () => {
    const result = stateManager.hydrate({
      hero: { ...stateManager.getState().hero, level: 7 },
      resources: stateManager.getState().resources,
      leaderboard: {
        ...stateManager.getState().leaderboard,
        highestPrestige: 3,
        fastestBossKill: null,
        fastestPrestige: null,
        fastestLevelUp: null
      },
      system: { ...stateManager.getState().system }
    }, 'test/hydrate');

    expect(result).not.toBeNull();
    const state = stateManager.getState();
    expect(state.hero.level).toBe(7);
    expect(state.leaderboard.highestPrestige).toBe(3);
    expect(state.leaderboard.fastestBossKill).toBe(Infinity);
    expect(state.leaderboard.fastestPrestige).toBe(Infinity);
    expect(state.leaderboard.fastestLevelUp).toBe(Infinity);
  });

  test('marks missing tutorialFinished as completed', () => {
    const system = { ...stateManager.getState().system };
    delete system.tutorialFinished;
    delete system.tutorialStep;

    stateManager.hydrate({
      ...stateManager.getState(),
      system
    }, 'test/hydrate');

    const state = stateManager.getState();
    expect(state.system.tutorialFinished).toBe(true);
    expect(state.system.tutorialStep).toBe(-1);
  });

  test('rejects invalid payloads', () => {
    const before = stateManager.getState();
    expect(stateManager.hydrate(null)).toBeNull();
    expect(stateManager.hydrate([])).toBeNull();
    expect(stateManager.getState()).toBe(before);
  });
});
