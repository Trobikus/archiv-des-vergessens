/**
 * ============================================================
 * FILE: __tests__/SaveManager.test.js – SaveManager Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import SaveManager from '../core/persistence/save-manager.js';
import HeroService from '../core/services/hero-service.js';
import ResourceService from '../core/services/resource-service.js';

describe('SaveManager', () => {
  let eventBus;
  let stateManager;
  let heroService;
  let resourceService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    heroService = new HeroService(stateManager, eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    stateManager.init(null, null, null);

    SaveManager.setServices({
      stateManager,
      heroService,
      resourceService
    });
  });

  afterEach(() => {
    eventBus.destroy();
    SaveManager.destroy();
    // IndexedDB bereinigen
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('ArchivDB');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });

  test('save and load roundtrip preserves state', async () => {
    // State ändern
    heroService.addExperience(100);
    heroService.spendStatPoint('attack');
    resourceService.addParticles(50);

    const originalState = stateManager.getState();

    // Speichern
    const saveResult = await SaveManager.save(originalState);
    expect(saveResult).toBe(true);

    // State zurücksetzen
    stateManager.reset();

    // Laden
    const loadedState = await SaveManager.load();
    expect(loadedState).not.toBeNull();

    // State hydrieren
    stateManager.dispatch(() => loadedState, 'test/hydrate');

    const newState = stateManager.getState();
    expect(newState.hero.level).toBe(2);
    expect(newState.hero.spentStats.attack).toBe(1);
    expect(newState.resources.particles).toBe('50');
  });

  test('hasSave returns true after save', async () => {
    const before = await SaveManager.hasSave();
    expect(before).toBe(false);

    const state = stateManager.getState();
    await SaveManager.save(state);

    const after = await SaveManager.hasSave();
    expect(after).toBe(true);
  });

  test('deleteSave removes save data', async () => {
    const state = stateManager.getState();
    await SaveManager.save(state);
    expect(await SaveManager.hasSave()).toBe(true);

    await SaveManager.deleteSave();
    expect(await SaveManager.hasSave()).toBe(false);
  });

  test('multiple saves are queued correctly', async () => {
    const state = stateManager.getState();
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(SaveManager.save(state));
    }
    const results = await Promise.all(promises);
    expect(results.every(r => r === true)).toBe(true);
  });

  test('concurrent saves with updated state persist the pending state without data loss', async () => {
    const initialState = stateManager.getState();
    const state1 = { ...initialState, hero: { ...initialState.hero, level: 10 } };
    const state2 = { ...initialState, hero: { ...initialState.hero, level: 25 } };

    // Trigger two saves concurrently
    const p1 = SaveManager.save(state1);
    const p2 = SaveManager.save(state2);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);

    const loadedState = await SaveManager.load();
    expect(loadedState.hero.level).toBe(25);
  });

  test('prevents saving and loading for guest accounts', async () => {
    const mockAuthService = {
      getCurrentUser: () => ({ id: 'guest_123', username: 'Gast-Hüter', isGuest: true })
    };

    SaveManager.setServices({
      stateManager,
      heroService,
      resourceService,
      authService: mockAuthService
    });

    const state = stateManager.getState();
    const saveResult = await SaveManager.save(state);
    expect(saveResult).toBe(false);

    const hasSaveResult = await SaveManager.hasSave();
    expect(hasSaveResult).toBe(false);

    const loadedState = await SaveManager.load();
    expect(loadedState).toBeNull();

    const slots = await SaveManager.listSlots();
    expect(slots.every(s => s.hasSave === false)).toBe(true);
  });
});