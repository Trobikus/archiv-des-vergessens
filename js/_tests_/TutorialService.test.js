/**
 * ============================================================
 * FILE: __tests__/TutorialService.test.js – TutorialService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import TutorialService from '../core/services/tutorial-service.js';
import * as Actions from '../core/state/actions.js';

describe('TutorialService', () => {
  let eventBus;
  let stateManager;
  let tutorialService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init(null, null, null);
    tutorialService = new TutorialService(stateManager, eventBus);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial state has tutorial values', () => {
    const state = stateManager.getState();
    expect(state.system.tutorialStep).toBe(0);
    expect(state.system.tutorialFinished).toBe(false);
  });

  test('startStep publishes tutorial:step', () => {
    const stepSpy = vi.fn();
    eventBus.subscribe('tutorial:step', stepSpy);

    tutorialService.startStep(0);

    expect(stepSpy).toHaveBeenCalledTimes(1);
    expect(stepSpy.mock.calls[0][0].title).toBe('Das Erwachen');
  });

  test('nextStep advances index in state', () => {
    tutorialService.startStep(0);
    tutorialService.nextStep();

    const state = stateManager.getState();
    expect(state.system.tutorialStep).toBe(1);
  });

  test('finish sets tutorialFinished true and fires tutorial:end', () => {
    const endSpy = vi.fn();
    eventBus.subscribe('tutorial:end', endSpy);

    tutorialService.finish();

    const state = stateManager.getState();
    expect(state.system.tutorialFinished).toBe(true);
    expect(state.system.tutorialStep).toBe(-1);
    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  test('automatically advances from step 4 when particles >= 50', async () => {
    tutorialService.startStep(4);
    
    // Simulate getting particles
    stateManager.dispatch((state) => ({
      ...state,
      resources: {
        ...state.resources,
        particles: '55'
      }
    }), 'resource/addParticles');

    // Warte auf debounceten State-Callback (16ms im StateManager)
    await new Promise((resolve) => setTimeout(resolve, 25));

    const state = stateManager.getState();
    expect(state.system.tutorialStep).toBe(5);
  });
});
