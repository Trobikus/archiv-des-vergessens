// Unit-Test für ResourceManager
// Kann mit Node.js + Vitest oder im Browser mit Mocha ausgeführt werden

import ResourceManager from '../managers/resourcemanager.js';
import EventBus from '../core/eventbus.js';

describe('ResourceManager', () => {
  let eventBus;
  let resourceManager;
  let updateCount;

  beforeEach(() => {
    eventBus = new EventBus();
    updateCount = 0;
    resourceManager = new ResourceManager(eventBus);

    // Counter für Updates
    eventBus.subscribe('resources:updated', () => {
      updateCount++;
    });
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial resources should be zero', () => {
    const res = resourceManager.getResources();
    expect(res.particles).toBe(0);
    expect(res.relics).toBe(0);
    expect(res.artifacts).toBe(0);
    expect(res.memoryDust).toBe(0);
  });

  test('addParticles increases particles and totalParticles', () => {
    resourceManager.addParticles(50);
    const res = resourceManager.getResources();
    expect(res.particles).toBe(50);
    expect(res.totalParticles).toBe(50);
    expect(updateCount).toBe(1);
  });

  test('addParticles with zero amount does nothing', () => {
    const before = resourceManager.getResources().particles;
    resourceManager.addParticles(0);
    expect(resourceManager.getResources().particles).toBe(before);
    expect(updateCount).toBe(0);
  });

  test('removeParticles subtracts correctly', () => {
    resourceManager.addParticles(100);
    const result = resourceManager.removeParticles(30);
    expect(result).toBe(true);
    expect(resourceManager.getResources().particles).toBe(70);
    expect(updateCount).toBe(2);
  });

  test('removeParticles fails if insufficient', () => {
    resourceManager.addParticles(10);
    const result = resourceManager.removeParticles(20);
    expect(result).toBe(false);
    expect(resourceManager.getResources().particles).toBe(10);
    expect(updateCount).toBe(1);
  });

  test('addRelics increases relics', () => {
    resourceManager.addRelics(15);
    expect(resourceManager.getResources().relics).toBe(15);
    expect(updateCount).toBe(1);
  });

  test('addArtifacts increases artifacts', () => {
    resourceManager.addArtifacts(5);
    expect(resourceManager.getResources().artifacts).toBe(5);
    expect(updateCount).toBe(1);
  });

  test('addMemoryDust increases memoryDust', () => {
    resourceManager.addMemoryDust(25);
    expect(resourceManager.getResources().memoryDust).toBe(25);
    expect(updateCount).toBe(1);
  });

  test('fromJSON restores state correctly', () => {
    const data = {
      particles: 100,
      relics: 20,
      artifacts: 5,
      memoryDust: 50,
      totalParticles: 200,
      totalRelics: 40,
      timeBank: 10
    };
    resourceManager.fromJSON(data);
    const res = resourceManager.getResources();
    expect(res.particles).toBe(100);
    expect(res.relics).toBe(20);
    expect(res.artifacts).toBe(5);
    expect(res.memoryDust).toBe(50);
    expect(res.totalParticles).toBe(200);
    expect(res.totalRelics).toBe(40);
    expect(res.timeBank).toBe(10);
  });

  test('toJSON returns correct structure', () => {
    resourceManager.addParticles(75);
    resourceManager.addRelics(10);
    resourceManager.addArtifacts(3);
    resourceManager.addMemoryDust(15);

    const json = resourceManager.toJSON();
    expect(json.particles).toBe(75);
    expect(json.relics).toBe(10);
    expect(json.artifacts).toBe(3);
    expect(json.memoryDust).toBe(15);
    expect(json.totalParticles).toBe(75);
    expect(json.totalRelics).toBe(10);
  });

  test('multiple operations batch updates', () => {
    resourceManager.addParticles(10);
    resourceManager.addParticles(20);
    resourceManager.addParticles(30);
    expect(updateCount).toBe(3);
    expect(resourceManager.getResources().particles).toBe(60);
  });
});