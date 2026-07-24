import { describe, it, expect, beforeEach, vi } from 'vitest';
import DIContainer from '../core/di/container.js';
import registerServices from '../core/di/config.js';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import SaveManager from '../core/persistence/save-manager.js';
import NavigationController from '../controllers/navigation.js';

describe('DI Container & Settings SSOT Refactor', () => {
  let container;
  let eventBus;
  let stateManager;

  beforeEach(() => {
    localStorage.clear();
    container = new DIContainer();
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init();

    container.register('eventBus', () => eventBus);
    container.register('stateManager', () => stateManager);

    registerServices(container);
  });

  it('should auto-wire all services via DI container without manual wiring', () => {
    const authService = container.get('authService');
    const networkService = container.get('networkService');
    const cloudManager = container.get('cloudManager');
    const settingsManager = container.get('settingsManager');

    expect(authService).toBeDefined();
    expect(networkService).toBeDefined();
    expect(cloudManager).toBeDefined();
    expect(settingsManager).toBeDefined();

    // Verify dependencies injected into AuthService
    expect(authService._networkService).toBe(networkService);
    expect(authService._cloudManager).toBe(cloudManager);

    // Verify lazy AuthService resolution in NetworkService
    const resolvedAuth = networkService._getAuthService();
    expect(resolvedAuth).toBe(authService);
  });

  it('should automatically invoke SaveManager.setServices when resolving saveManager', () => {
    const spySetServices = vi.spyOn(SaveManager, 'setServices');
    const saveManager = container.get('saveManager');
    expect(saveManager).toBe(SaveManager);
    expect(spySetServices).toHaveBeenCalled();
  });

  it('should use StateManager as Single Source of Truth for settings', () => {
    const settingsManager = container.get('settingsManager');

    // Default setting from state
    expect(settingsManager.get('volume')).toBe(0.7);

    // Dispatch state update directly
    stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, volume: 0.9 }
    }), 'test/updateVolume');

    // SettingsManager should return updated state value
    expect(settingsManager.get('volume')).toBe(0.9);
  });

  it('should persist settings when NavigationController updates options', () => {
    const settingsManager = container.get('settingsManager');
    const cloudManager = container.get('cloudManager');

    const nav = new NavigationController({
      eventBus,
      stateManager,
      gameLoop: null,
      heroService: null,
      resourceService: null,
      clanService: null,
      saveManager: SaveManager,
      settingsManager,
      cloudManager,
      i18nService: null
    });

    // Change music volume via navigation
    nav._setMusicVolume(50);

    // StateManager state updated
    expect(stateManager.getState().settings.volume).toBe(0.5);
    expect(stateManager.getState().settings.music).toBe(true);

    // SettingsManager reads from StateManager
    expect(settingsManager.get('volume')).toBe(0.5);

    // Persisted to localStorage
    const savedInStorage = JSON.parse(localStorage.getItem('archiv_des_vergessens_settings_v1'));
    expect(savedInStorage.volume).toBe(0.5);
    expect(savedInStorage.music).toBe(true);
  });
});
