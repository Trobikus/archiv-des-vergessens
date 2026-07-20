import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import ClanService from '../core/services/clan-service.js';
import ResourceService from '../core/services/resource-service.js';

describe('ClanService', () => {
  let eventBus;
  let stateManager;
  let resourceService;
  let clanService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    clanService = new ClanService(stateManager, eventBus, resourceService);
    stateManager.init(null, null, null);
  });

  afterEach(() => {
    eventBus.destroy();
    clanService.destroy();
  });

  test('recruit collector member increases member count and deducts cost', () => {
    // Add particles so we can recruit
    resourceService.addParticles(10);
    expect(resourceService.getResources().particles).toBe(10);

    const recruited = clanService.recruitMember('collector');
    expect(recruited).toBe(true);
    
    const members = clanService.getMembers();
    expect(members.length).toBe(1);
    expect(members[0].role).toBe('collector');
    expect(resourceService.getResources().particles).toBe(0);
  });

  test('processTick updates progress, experience and resources in a batch', () => {
    // Add some members to state directly
    stateManager.dispatch((state) => ({
      ...state,
      resources: {
        ...state.resources,
        particles: '100'
      },
      clan: {
        ...state.clan,
        members: [
          {
            id: 1,
            name: 'Member 1',
            role: 'collector',
            level: 1,
            experience: 0,
            progress: 50,
            expToNextLevel: 50,
            baseCollectRate: 2.0
          },
          {
            id: 2,
            name: 'Member 2',
            role: 'weaver',
            level: 1,
            experience: 0,
            progress: 80,
            expToNextLevel: 50,
            baseCollectRate: 1.2
          }
        ]
      }
    }), 'mockClan');

    // Run a slow tick of 10000ms.
    eventBus.publish('game:slowTick', { delta: 10000 });
    
    const members = clanService.getMembers();
    expect(members[0].progress).toBe(50);
    expect(members[0].experience).toBe(2);
    expect(members[1].progress).toBe(0);
    expect(members[1].experience).toBe(2);
    
    // Resources should be updated in a batch
    const resources = resourceService.getResources();
    expect(resources.particles).toBeGreaterThan(100);
  });

  test('performance and correctness with 1000 members', () => {
    // Generate 1000 members
    const newMembers = [];
    for (let i = 0; i < 1000; i++) {
      newMembers.push({
        id: i,
        name: `Member ${i}`,
        role: i % 2 === 0 ? 'collector' : 'weaver',
        level: 1,
        experience: 0,
        progress: 0,
        expToNextLevel: 50,
        baseCollectRate: 1.5
      });
    }

    stateManager.dispatch((state) => ({
      ...state,
      clan: {
        ...state.clan,
        members: newMembers
      }
    }), 'mock1000Members');

    const startTime = performance.now();
    eventBus.publish('game:slowTick', { delta: 1000 });
    const duration = performance.now() - startTime;
    
    console.log(`[Test] Slow tick processing for 1000 members took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100); // Must be super fast (usually < 10ms with batching)
    
    const members = clanService.getMembers();
    expect(members.length).toBe(1000);
    expect(members[0].progress).toBeGreaterThan(0);
  });
});
