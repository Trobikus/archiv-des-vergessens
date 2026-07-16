// Unit-Test für SaveGameManager
import SaveGameManager from '../core/savegame.js';
import EventBus from '../core/eventbus.js';

describe('SaveGameManager', () => {
  let mockManager;

  beforeEach(() => {
    SaveGameManager.managers = {};
    mockManager = {
      toJSON: jest.fn(() => ({ test: 'data' })),
      fromJSON: jest.fn()
    };
    SaveGameManager.register('test', mockManager);
  });

  afterEach(() => {
    SaveGameManager.destroy();
    // Cleanup IndexedDB
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(SaveGameManager.DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });

  test('register adds manager to managers map', () => {
    expect(SaveGameManager.managers.test).toBe(mockManager);
  });

  test('saveGame calls toJSON on all managers', async () => {
    const result = await SaveGameManager.saveGame();
    expect(result).toBe(true);
    expect(mockManager.toJSON).toHaveBeenCalled();
  });

  test('loadGame calls fromJSON on all managers', async () => {
    await SaveGameManager.saveGame();
    const data = await SaveGameManager.loadGame();
    expect(data).toBeDefined();
    expect(mockManager.fromJSON).toHaveBeenCalledWith({ test: 'data' });
  });

  test('hasSaveGame returns true after save', async () => {
    const before = await SaveGameManager.hasSaveGame();
    expect(before).toBe(false);

    await SaveGameManager.saveGame();
    const after = await SaveGameManager.hasSaveGame();
    expect(after).toBe(true);
  });

  test('deleteSaveGame removes save data', async () => {
    await SaveGameManager.saveGame();
    expect(await SaveGameManager.hasSaveGame()).toBe(true);

    await SaveGameManager.deleteSaveGame();
    expect(await SaveGameManager.hasSaveGame()).toBe(false);
  });

  test('multiple simultaneous saves are queued', async () => {
    const savePromises = [];
    for (let i = 0; i < 5; i++) {
      savePromises.push(SaveGameManager.saveGame());
    }
    const results = await Promise.all(savePromises);
    expect(results.every(r => r === true)).toBe(true);
    expect(mockManager.toJSON).toHaveBeenCalledTimes(5);
  });

  test('load during save waits for save to complete', async () => {
    // Simuliere langsames Speichern
    const originalGetDB = SaveGameManager._getDB;
    let saveStarted = false;
    let saveResolved = false;

    SaveGameManager._getDB = async () => {
      saveStarted = true;
      await new Promise(resolve => setTimeout(resolve, 100));
      saveResolved = true;
      return originalGetDB.call(SaveGameManager);
    };

    const savePromise = SaveGameManager.saveGame();
    const loadPromise = SaveGameManager.loadGame();

    await savePromise;
    await loadPromise;

    expect(saveStarted).toBe(true);
    expect(saveResolved).toBe(true);
    expect(mockManager.fromJSON).toHaveBeenCalled();

    SaveGameManager._getDB = originalGetDB;
  });
});