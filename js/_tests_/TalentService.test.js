import { describe, it, expect, beforeEach } from 'vitest';
import { TalentService } from '../core/services/talent-service.js';
import { StateManager } from '../core/state/manager.js';
import EventBus from '../core/events/bus.js';

describe('TalentService (Path of Exile Skill Tree)', () => {
  let stateManager;
  let eventBus;
  let talentService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init();
    talentService = new TalentService(stateManager, eventBus);
  });

  it('initializes with start_0 node allocated and default points', () => {
    expect(talentService.getAllocatedNodeIds()).toEqual(['start_0']);
    expect(talentService.getAvailablePoints()).toBe(3);
  });

  it('identifies allocatable adjacent nodes correctly', () => {
    expect(talentService.isNodeAllocatable('str_1')).toBe(true);
    expect(talentService.isNodeAllocatable('mneme_1')).toBe(true);
    // str_2 is not adjacent to start_0 directly (str_1 must be allocated first)
    expect(talentService.isNodeAllocatable('str_2')).toBe(false);
  });

  it('allocates adjacent node and deducts points', () => {
    const success = talentService.allocateNode('str_1');
    expect(success).toBe(true);
    expect(talentService.getAllocatedNodeIds()).toContain('str_1');
    expect(talentService.getAvailablePoints()).toBe(2);

    // Now str_2 should be allocatable!
    expect(talentService.isNodeAllocatable('str_2')).toBe(true);
  });

  it('prevents unallocating a node if it breaks graph connectivity to other allocated nodes', () => {
    talentService.allocateNode('str_1'); // Allocated: start_0, str_1
    talentService.allocateNode('str_2'); // Allocated: start_0, str_1, str_2

    // Unallocating str_1 would leave str_2 disconnected from start_0!
    expect(talentService.canUnallocateNode('str_1')).toBe(false);
    expect(talentService.unallocateNode('str_1')).toBe(false);

    // Unallocating str_2 (the leaf node) IS allowed!
    expect(talentService.canUnallocateNode('str_2')).toBe(true);
    expect(talentService.unallocateNode('str_2')).toBe(true);
    expect(talentService.getAllocatedNodeIds()).not.toContain('str_2');
  });

  it('resets all talents and refunds spent points correctly', () => {
    talentService.allocateNode('str_1');
    talentService.allocateNode('str_2');
    expect(talentService.getAvailablePoints()).toBe(1);

    talentService.resetTalents();
    expect(talentService.getAllocatedNodeIds()).toEqual(['start_0']);
    expect(talentService.getAvailablePoints()).toBe(3);
  });

  it('aggregates stats correctly from allocated nodes', () => {
    talentService.allocateNode('str_1'); // +4% damage
    const stats = talentService.getAggregatedStats();
    // start_0 (+2% damage, +2% hp, +2% mneme) + str_1 (+4% damage)
    expect(stats.damagePercent).toBe(6);
    expect(stats.maxHpPercent).toBe(2);
    expect(stats.mnemeGainPercent).toBe(2);
  });
});
