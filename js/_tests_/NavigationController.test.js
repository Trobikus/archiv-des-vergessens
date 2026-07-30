import { describe, it, expect, beforeEach, vi } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import { NavigationController } from '../controllers/navigation.js';
import { EVENTS } from '../core/events/definitions.js';

describe('NavigationController', () => {
  let eventBus;
  let stateManager;
  let navigationController;
  let mockGameLoop;
  let mockResourceService;
  let mockClanService;
  let mockSaveManager;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init();

    mockGameLoop = { isRunning: vi.fn().mockReturnValue(false), start: vi.fn(), stop: vi.fn() };
    mockResourceService = { addParticles: vi.fn() };
    mockClanService = { reset: vi.fn() };
    mockSaveManager = { load: vi.fn(), save: vi.fn().mockResolvedValue(true) };

    navigationController = new NavigationController({
      eventBus,
      stateManager,
      gameLoop: mockGameLoop,
      resourceService: mockResourceService,
      clanService: mockClanService,
      saveManager: mockSaveManager
    });
  });

  it('navigates to characterSelect when HUB_BACK_TO_MENU event is triggered', () => {
    eventBus.publish(EVENTS.HUB_BACK_TO_MENU);
    expect(stateManager.getState().system.currentView).toBe('characterSelect');
  });

  it('showMenu redirects to characterSelect', () => {
    navigationController.showMenu();
    expect(stateManager.getState().system.currentView).toBe('characterSelect');
  });

  it('navigates correctly to hub and game views', () => {
    navigationController.showHub();
    expect(stateManager.getState().system.currentView).toBe('hub');

    navigationController.showGame();
    expect(stateManager.getState().system.currentView).toBe('game');
  });
});
