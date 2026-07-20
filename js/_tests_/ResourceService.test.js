/**
 * ============================================================
 * FILE: __tests__/ResourceService.test.js – ResourceService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import ResourceService from '../core/services/resource-service.js';

describe('ResourceService', () => {
  let eventBus;
  let stateManager;
  let resourceService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    stateManager.init(null, null, null);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial resources are zero', () => {
    const res = resourceService.getResources();
    expect(res.particles).toBe(0);
    expect(res.relics).toBe(0);
    expect(res.artifacts).toBe(0);
    expect(res.memoryDust).toBe(0);
  });

  test('addParticles increases particles and totalParticles', () => {
    resourceService.addParticles(50);
    const res = resourceService.getResources();
    expect(res.particles).toBe(50);
    expect(res.totalParticles).toBe(50);
  });

  test('removeParticles subtracts correctly', () => {
    resourceService.addParticles(100);
    const result = resourceService.removeParticles(30);
    expect(result).toBe(true);
    expect(resourceService.getResources().particles).toBe(70);
  });

  test('removeParticles fails if insufficient', () => {
    resourceService.addParticles(10);
    const result = resourceService.removeParticles(20);
    expect(result).toBe(false);
    expect(resourceService.getResources().particles).toBe(10);
  });

  test('addRelics increases relics', () => {
    resourceService.addRelics(15);
    expect(resourceService.getResources().relics).toBe(15);
  });

  test('reset sets resources to initial state', () => {
    resourceService.addParticles(100);
    resourceService.addRelics(20);
    resourceService.reset(10);
    const res = resourceService.getResources();
    expect(res.particles).toBe(10);
    expect(res.relics).toBe(0);
    expect(res.totalParticles).toBe(10);
  });
});