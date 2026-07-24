/**
 * ============================================================
 * FILE: __tests__/AccountVaultService.test.js – AccountVaultService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import ResourceService from '../core/services/resource-service.js';
import AccountVaultService from '../core/services/account-vault-service.js';

describe('AccountVaultService & Class Gathering Specialization', () => {
  let eventBus;
  let stateManager;
  let accountVaultService;
  let resourceService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    accountVaultService = new AccountVaultService(eventBus, null);
    resourceService = new ResourceService(stateManager, eventBus, accountVaultService);
    stateManager.init(null, null, null);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('deposits and withdraws resources correctly from shared vault', async () => {
    await accountVaultService.depositResource('particles', 100);
    expect(accountVaultService.getVaultResources().particles).toBe('100');

    const success = await accountVaultService.withdrawResource('particles', 40);
    expect(success).toBe(true);
    expect(accountVaultService.getVaultResources().particles).toBe('60');
  });

  test('calculates combined total from local character and vault', async () => {
    await accountVaultService.depositResource('relics', 200);
    const combined = accountVaultService.getCombinedTotal('relics', '50');
    expect(combined).toBe('250');
  });

  test('Warrior class specialization grants +50% particles bonus', () => {
    stateManager.dispatch((state) => ({
      ...state,
      hero: { ...state.hero, avatar: '🛡️', title: 'Krieger des Lichts' }
    }));

    expect(resourceService.getClassSpecialization()).toBe('WARRIOR');
    resourceService.addParticles(100);
    // 100 * 1.5 = 150
    expect(resourceService.getResources().particles).toBe(150);
    expect(accountVaultService.getVaultResources().particles).toBe('150');
  });

  test('Hunter class specialization grants +50% relics bonus', () => {
    stateManager.dispatch((state) => ({
      ...state,
      hero: { ...state.hero, avatar: '🏹', title: 'Hüter des Archivs' }
    }));

    expect(resourceService.getClassSpecialization()).toBe('HUNTER');
    resourceService.addRelics(100);
    // 100 * 1.5 = 150
    expect(resourceService.getResources().relics).toBe(150);
    expect(accountVaultService.getVaultResources().relics).toBe('150');
  });

  test('deposits and withdraws items cleanly from sharedVault array', async () => {
    const testItem = { name: 'Ur-Klinge', rarity: 'legendary', level: 5 };
    await accountVaultService.depositItemToVault(testItem);

    const items = accountVaultService.getSharedVaultItems();
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Ur-Klinge');

    const withdrawn = await accountVaultService.withdrawItemFromVault(0);
    expect(withdrawn.name).toBe('Ur-Klinge');
    expect(accountVaultService.getSharedVaultItems().length).toBe(0);
  });
});

