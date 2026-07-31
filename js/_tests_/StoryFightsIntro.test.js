/**
 * ============================================================
 * FILE: js/_tests_/StoryFightsIntro.test.js
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import Actions from '../core/state/actions.js';
import {
  STORY_FIGHTS_INTRO_FRAMES,
  STORY_FIGHTS_INTRO_CROSSFADE_MS
} from '../data/story_fights_intro.js';

describe('Story Fights Intro data', () => {
  test('defines three cinematic keyframes with assets and copy', () => {
    expect(STORY_FIGHTS_INTRO_FRAMES).toHaveLength(3);
    expect(STORY_FIGHTS_INTRO_CROSSFADE_MS).toBeGreaterThan(0);

    for (const frame of STORY_FIGHTS_INTRO_FRAMES) {
      expect(frame.id).toBeTruthy();
      expect(frame.src).toMatch(/^\/cinematic\/story-fights-intro\/.+\.jpe?g$/);
      expect(frame.durationMs).toBeGreaterThan(1000);
      expect(frame.linesDe.length).toBeGreaterThan(0);
      expect(frame.linesEn.length).toBe(frame.linesDe.length);
    }
  });
});

describe('storyFightsIntroSeen state flag', () => {
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

  test('defaults to unseen on new games', () => {
    expect(stateManager.getState().system.storyFightsIntroSeen).toBe(false);
  });

  test('markStoryFightsIntroSeen persists via hydrate', () => {
    stateManager.dispatch(Actions.markStoryFightsIntroSeen(), 'test/intro');
    expect(stateManager.getState().system.storyFightsIntroSeen).toBe(true);

    const snapshot = stateManager.getState();
    stateManager.hydrate({
      ...snapshot,
      system: { ...snapshot.system, storyFightsIntroSeen: true }
    }, 'test/hydrate-intro');

    expect(stateManager.getState().system.storyFightsIntroSeen).toBe(true);
  });

  test('fills missing storyFightsIntroSeen from defaults as unseen', () => {
    stateManager.hydrate({
      hero: { name: 'Hüter', level: 3 },
      resources: { particles: '100' },
      system: {
        currentView: 'hub',
        tutorialFinished: true,
        tutorialStep: -1
      }
    }, 'test/legacy-intro');

    expect(stateManager.getState().system.storyFightsIntroSeen).toBe(false);
  });
});
