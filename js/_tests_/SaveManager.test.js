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
    stateManager.hydrate(loadedState, 'test/hydrate');

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

  test('migrates legacy main_save into slot 1 for registered users', async () => {
    const mockAuthService = {
      isGuest: () => false,
      getCurrentUser: () => ({ id: 'usr_legacy_1', username: 'LegacyUser', isGuest: false })
    };

    SaveManager.setServices({
      stateManager,
      heroService,
      resourceService,
      authService: mockAuthService
    });

    await SaveManager._getDB();

    globalThis.__indexedDB_store['main_save'] = {
      timestamp: 111,
      version: '1.6',
      state: {
        hero: { name: 'VergessenerHüter', level: 33, title: 'Chronist', avatar: '📜' },
        resources: { particles: '500' },
        system: { lastSave: 111 }
      }
    };

    const slots = await SaveManager.listSlots('usr_legacy_1');
    const slot1 = slots.find(s => s.slotId === 1);
    expect(slot1.hasSave).toBe(true);
    expect(slot1.name).toBe('VergessenerHüter');
    expect(slot1.level).toBe(33);

    const loaded = await SaveManager.load(1);
    expect(loaded).not.toBeNull();
    expect(loaded.hero.name).toBe('VergessenerHüter');
    expect(loaded.hero.level).toBe(33);

    // Nach Migration unter kanonischem Slot-Key
    expect(globalThis.__indexedDB_store['slot_uusr_legacy_1_1']).toBeDefined();
    expect(globalThis.__indexedDB_store['main_save']).toBeUndefined();
  });

  test('migrates username-scoped slot keys to id-scoped keys', async () => {
    const mockAuthService = {
      isGuest: () => false,
      getCurrentUser: () => ({ id: 'usr_abc', username: 'MaxHüter', isGuest: false })
    };

    SaveManager.setServices({
      stateManager,
      heroService,
      resourceService,
      authService: mockAuthService
    });

    await SaveManager._getDB();

    globalThis.__indexedDB_store['slot_uMaxHüter_2'] = {
      key: 'slot_uMaxHüter_2',
      timestamp: 222,
      state: {
        hero: { name: 'Umbenannt', level: 12 },
        resources: { particles: '10' }
      }
    };

    const loaded = await SaveManager.load(2);
    expect(loaded.hero.name).toBe('Umbenannt');
    expect(globalThis.__indexedDB_store['slot_uusr_abc_2']).toBeDefined();
    expect(globalThis.__indexedDB_store['slot_uMaxHüter_2']).toBeUndefined();
  });

  test('migrates legacy account_vault into user vault key', async () => {
    const mockAuthService = {
      isGuest: () => false,
      getCurrentUser: () => ({ id: 'usr_vault', username: 'VaultUser', isGuest: false })
    };

    SaveManager.setServices({
      stateManager,
      authService: mockAuthService
    });

    await SaveManager._getDB();
    globalThis.__indexedDB_store['account_vault'] = {
      key: 'account_vault',
      vaultData: { particles: '777', sharedVault: [{ id: 'item_1' }] }
    };

    const vault = await SaveManager.loadAccountVault('usr_vault');
    expect(vault.particles).toBe('777');
    expect(vault.sharedVault).toHaveLength(1);
    expect(globalThis.__indexedDB_store['vault_uusr_vault']).toBeDefined();
    expect(globalThis.__indexedDB_store['account_vault']).toBeUndefined();
  });
});