import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import SaveManager from '../core/persistence/save-manager.js';
import NavigationController from '../controllers/navigation.js';
import HeroService from '../core/services/hero-service.js';
import ResourceService from '../core/services/resource-service.js';
import ClanService from '../core/services/clan-service.js';
import { EVENTS } from '../core/events/definitions.js';

describe('Character Creation & Persistence for Registered Users', () => {
  let eventBus;
  let stateManager;
  let navigation;
  let heroService;
  let resourceService;
  let clanService;

  const mockRegisteredAuthService = {
    isGuest: () => false,
    getCurrentUser: () => ({ id: 'usr_test_123', username: 'TestHeroUser', isGuest: false })
  };

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    heroService = new HeroService(stateManager, eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    clanService = new ClanService(stateManager, eventBus, resourceService);
    stateManager.init(null, null, null);

    SaveManager.setServices({
      stateManager,
      authService: mockRegisteredAuthService,
      heroService,
      resourceService,
      clanService
    });

    navigation = new NavigationController({
      eventBus,
      stateManager,
      gameLoop: { isRunning: () => false, start: () => {} },
      resourceService,
      clanService,
      saveManager: SaveManager
    });
  });

  afterEach(() => {
    eventBus.destroy();
    SaveManager.destroy();
    localStorage.clear();
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('ArchivDB');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });

  test('creates a character, persists it in slot, and restores it on reload', async () => {
    // 1. Create character in Slot 2
    eventBus.publish(EVENTS.CHARACTER_CREATE, {
      slotId: 2,
      name: 'ErzmagierMax',
      avatar: '🔮',
      title: 'Erzmagier'
    });

    // Wait a tick for async handlers
    await new Promise(r => setTimeout(r, 50));

    // Verify state in memory
    const currentState = stateManager.getState();
    expect(currentState.hero.name).toBe('ErzmagierMax');
    expect(currentState.hero.title).toBe('Erzmagier');
    expect(SaveManager.getActiveSlot()).toBe(2);

    // 2. Verify it exists in slot list
    const slots = await SaveManager.listSlots('usr_test_123');
    const slot2 = slots.find(s => s.slotId === 2);
    expect(slot2).toBeDefined();
    expect(slot2.hasSave).toBe(true);
    expect(slot2.name).toBe('ErzmagierMax');

    // 3. Simulate game reload (reset state manager and active slot from memory, but keep localStorage)
    stateManager.reset();
    expect(stateManager.getState().hero.name).toBe('Der Mneme-Bund');

    // Load active slot (which should read localStorage and load slot 2)
    const activeSlot = SaveManager.getActiveSlot();
    expect(activeSlot).toBe(2);

    const loadedState = await SaveManager.load(activeSlot);
    expect(loadedState).not.toBeNull();
    expect(loadedState.hero.name).toBe('ErzmagierMax');
  });
});
