import { describe, it, expect, beforeEach, vi } from 'vitest';
import CloudManager from '../core/persistence/cloud-manager.js';

describe('CloudManager', () => {
  let eventBus;
  let networkService;
  let subscribers;

  beforeEach(() => {
    localStorage.clear();
    subscribers = {};
    eventBus = {
      publish: vi.fn(),
      subscribe: vi.fn((event, callback) => {
        subscribers[event] = callback;
        return 'sub_123';
      }),
      unsubscribe: vi.fn()
    };
    networkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn().mockReturnValue(true)
    };
  });

  it('should enable cloud sync on login and trigger loadFromCloud without firing pre-load sync', async () => {
    const cloudManager = new CloudManager(eventBus, networkService);
    const syncSpy = vi.spyOn(cloudManager, 'sync');
    const loadSpy = vi.spyOn(cloudManager, 'loadFromCloud').mockImplementation(() => Promise.resolve(null));

    // Simulate auth:stateChanged login event
    expect(subscribers['auth:stateChanged']).toBeDefined();
    subscribers['auth:stateChanged']({
      user: { id: 'usr_test123' },
      isLoggedIn: true
    });

    expect(cloudManager.isEnabled()).toBe(true);
    expect(loadSpy).toHaveBeenCalledTimes(1);
    // Ensure sync() was NOT triggered during setEnabled(true, false) on login
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should not send cloud:save if saveData is empty or null', async () => {
    const cloudManager = new CloudManager(eventBus, networkService);
    cloudManager.setEnabled(true, false);

    const result = await cloudManager.sync(null);
    expect(networkService.send).not.toHaveBeenCalledWith('cloud:save', expect.anything());
  });

  it('should send cloud:save when valid saveData is provided', async () => {
    const cloudManager = new CloudManager(eventBus, networkService);
    cloudManager.setEnabled(true, false);

    const validData = { timestamp: Date.now(), version: '1.6', hero: { name: 'Held' } };
    cloudManager.sync(validData);

    expect(networkService.send).toHaveBeenCalledWith('cloud:save', { saveData: validData });
  });

  it('should trigger sync on network:connected if cloud sync is enabled (Prio 3)', async () => {
    const cloudManager = new CloudManager(eventBus, networkService);
    cloudManager.setEnabled(true, false);
    const syncSpy = vi.spyOn(cloudManager, 'sync').mockImplementation(() => Promise.resolve(true));

    expect(subscribers['network:connected']).toBeDefined();
    subscribers['network:connected']();

    expect(syncSpy).toHaveBeenCalledTimes(1);
  });

  it('should publish cloud:loaded with saveData on successful cloud load (Prio 1)', async () => {
    const cloudManager = new CloudManager(eventBus, networkService);
    cloudManager.setEnabled(true, false);

    const saveDataPayload = { saveData: { hero: { name: 'CloudHero' } }, timestamp: 1234567800 };
    cloudManager.onCloudLoadSuccess(saveDataPayload);

    expect(eventBus.publish).toHaveBeenCalledWith('cloud:loaded', {
      saveData: saveDataPayload.saveData,
      timestamp: 1234567800
    });
  });
});
