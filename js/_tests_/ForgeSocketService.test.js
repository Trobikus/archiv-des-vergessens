import { describe, it, expect, beforeEach } from 'vitest';
import ForgeService from '../core/services/forge-service.js';
import { StateManager } from '../core/state/manager.js';
import EventBus from '../core/events/bus.js';

describe('ForgeService Socketing & Enchanting', () => {
  let stateManager;
  let eventBus;
  let forgeService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init();

    // Create test item in inventory
    stateManager.dispatch((st) => ({
      ...st,
      hero: {
        ...st.hero,
        inventory: {
          ...st.hero.inventory,
          equipment: [
            {
              id: 'test_sword',
              name: 'Drachenklinge',
              rarity: 'rare',
              sockets: [null, null],
              baseStats: { attack: 50, defense: 0 }
            }
          ]
        }
      }
    }), 'init_test_item');

    forgeService = new ForgeService(stateManager, eventBus, null, null);
  });

  it('sockets a gem into a free socket on an item', () => {
    const res = forgeService.socketGem(0, 0, 'ruby_flawless', false);
    expect(res.success).toBe(true);

    const state = stateManager.getState();
    const item = state.hero.inventory.equipment[0];
    expect(item.sockets[0]).not.toBeNull();
    expect(item.sockets[0].id).toBe('ruby_flawless');
  });

  it('sockets a rune into a free socket on an item', () => {
    const res = forgeService.socketRune(0, 1, 'rune_el', false);
    expect(res.success).toBe(true);

    const state = stateManager.getState();
    const item = state.hero.inventory.equipment[0];
    expect(item.sockets[1]).not.toBeNull();
    expect(item.sockets[1].id).toBe('rune_el');
  });

  it('enchants an item with an enchantment scroll', () => {
    const res = forgeService.enchantItem(0, 'scroll_mneme_power', false);
    expect(res.success).toBe(true);

    const state = stateManager.getState();
    const item = state.hero.inventory.equipment[0];
    expect(item.enchantment).not.toBeNull();
    expect(item.enchantment.id).toBe('scroll_mneme_power');
  });
});

