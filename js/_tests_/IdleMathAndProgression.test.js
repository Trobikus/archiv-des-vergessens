import { describe, it, expect, beforeEach, vi } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import ResourceService from '../core/services/resource-service.js';
import IdleService from '../core/services/idle-service.js';
import GameLoop from '../core/game/loop.js';
import {
  calculateBuildingCost,
  calculateBulkBuildingCost,
  calculateMaxAffordableLevel,
  calculateYieldPerSecond,
  calculateOfflineProgress,
  calculatePrestigeCurrency
} from '../core/game/math.js';

describe('Idle Math & Progression Systems (Steps 2 - 5)', () => {
  let eventBus;
  let stateManager;
  let resourceService;
  let idleService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init();
    resourceService = new ResourceService(stateManager, eventBus);
    idleService = new IdleService(stateManager, eventBus, resourceService);
  });

  // ============================================================
  // SCHRITT 2: Kern-Berechnungsfunktionen
  // ============================================================
  describe('Schritt 2: Pure Calculation Functions (math.js)', () => {
    it('calculates single building cost correctly', () => {
      expect(calculateBuildingCost(10, 1.15, 0)).toBe(10);
      expect(calculateBuildingCost(10, 1.15, 1)).toBe(11);
      expect(calculateBuildingCost(10, 1.15, 2)).toBe(13);
      expect(calculateBuildingCost(100, 1.15, 10)).toBe(404);
    });

    it('calculates bulk building cost correctly', () => {
      // Stufe 0 (10) + Stufe 1 (11) = 21
      expect(calculateBulkBuildingCost(10, 1.15, 0, 2)).toBe(21);
      // Stufe 0 (10) + Stufe 1 (11) + Stufe 2 (13) = 34
      expect(calculateBulkBuildingCost(10, 1.15, 0, 3)).toBe(34);
      expect(calculateBulkBuildingCost(10, 1.15, 0, 0)).toBe(0);
    });

    it('calculates max affordable level correctly', () => {
      // Bei 21 Ressourcen und Basis 10, Multi 1.15 ab Level 0 => 2 Stufen (10 + 11 = 21)
      const max21 = calculateMaxAffordableLevel(10, 1.15, 0, 21);
      expect(max21.count).toBe(2);
      expect(max21.totalCost).toBe(21);

      // Bei 33 Ressourcen => immer noch 2 Stufen (für 3 Stufen bräuchte man 34)
      const max33 = calculateMaxAffordableLevel(10, 1.15, 0, 33);
      expect(max33.count).toBe(2);
      expect(max33.totalCost).toBe(21);

      // Bei 0 Ressourcen => 0 Stufen
      const max0 = calculateMaxAffordableLevel(10, 1.15, 0, 0);
      expect(max0.count).toBe(0);
      expect(max0.totalCost).toBe(0);
    });

    it('calculates yield per second correctly', () => {
      // Basis 1.0, Level 5, 0 Bonus, 1.0 Prestige => 5.0
      expect(calculateYieldPerSecond(1.0, 5, 0, 1.0)).toBe(5.0);
      // Basis 2.0, Level 10, 0.5 Upgrade-Bonus (+50%), 1.2 Prestige => 2.0 * 10 * 1.5 * 1.2 = 36.0
      expect(calculateYieldPerSecond(2.0, 10, 0.5, 1.2)).toBe(36.0);
      // Level 0 => 0
      expect(calculateYieldPerSecond(1.0, 0, 0, 1.0)).toBe(0);
    });

    it('calculates prestige currency correctly', () => {
      // < 10000 threshold => 0
      expect(calculatePrestigeCurrency(9999)).toBe(0);
      // 10000 => sqrt(1) = 1
      expect(calculatePrestigeCurrency(10000)).toBe(1);
      // 40000 => sqrt(4) = 2
      expect(calculatePrestigeCurrency(40000)).toBe(2);
      // 100000 => sqrt(10) = 3
      expect(calculatePrestigeCurrency(100000)).toBe(3);
    });
  });

  // ============================================================
  // SCHRITT 3: Delta Time Game Loop Integration
  // ============================================================
  describe('Schritt 3: Delta Time Game Loop', () => {
    it('runs game loop using requestAnimationFrame and emits delta time', () => {
      const loop = new GameLoop({
        eventBus,
        stateManager,
        services: { resourceService }
      });

      let tickReceived = false;
      let tickDelta = 0;

      eventBus.subscribe('game:logicTick', (data) => {
        tickReceived = true;
        tickDelta = data.delta;
      });

      loop.start();
      expect(loop.isRunning()).toBe(true);

      loop.stop();
      expect(loop.isRunning()).toBe(false);
    });
  });

  // ============================================================
  // SCHRITT 4: Kauf-Logik & Bulk Purchases
  // ============================================================
  describe('Schritt 4: Purchase Logic & Bulk/Max Buying', () => {
    it('buys 1 level when affordable', () => {
      resourceService.addMnemeFragmente(100);
      const initialGen = idleService.getGedankenArchiv();
      expect(initialGen.level).toBe(0);

      const success = idleService.buyGedankenArchivLevel(1);
      expect(success).toBe(true);

      const updatedGen = idleService.getGedankenArchiv();
      expect(updatedGen.level).toBe(1);
      // 100 - 10 = 90
      expect(stateManager.getState().resources.mnemeFragmente).toBe('90');
    });

    it('buys multiple levels (bulk) correctly in one action', () => {
      resourceService.addMnemeFragmente(100);
      // Kosten für 3 Stufen: 10 + 11 + 13 = 34
      const success = idleService.buyGedankenArchivLevel(3);
      expect(success).toBe(true);

      const updatedGen = idleService.getGedankenArchiv();
      expect(updatedGen.level).toBe(3);
      // 100 - 34 = 66
      expect(stateManager.getState().resources.mnemeFragmente).toBe('66');
    });

    it('buys max affordable levels', () => {
      resourceService.addMnemeFragmente(34);
      const success = idleService.buyGedankenArchivMax();
      expect(success).toBe(true);

      const updatedGen = idleService.getGedankenArchiv();
      expect(updatedGen.level).toBe(3);
      expect(stateManager.getState().resources.mnemeFragmente).toBe('0');
    });

    it('fails purchase when insufficient mnemeFragmente', () => {
      const success = idleService.buyGedankenArchivLevel(1);
      expect(success).toBe(false);
      expect(idleService.getGedankenArchiv().level).toBe(0);
    });
  });

  // ============================================================
  // SCHRITT 5: Offline-Progression
  // ============================================================
  describe('Schritt 5: Offline Progression', () => {
    it('calculates offline earnings based on elapsed time and yield per second', () => {
      const now = Date.now();
      const lastSave = now - (3600 * 1000); // 1 Stunde her (3600s)
      const yieldPerSec = 10; // 10 Mneme/s

      const result = calculateOfflineProgress(lastSave, now, yieldPerSec, 12 * 3600);
      expect(result.elapsedSeconds).toBe(3600);
      expect(result.clampedSeconds).toBe(3600);
      expect(result.totalYield).toBe(36000); // 3600s * 10 = 36000
    });

    it('clamps offline time to maxOfflineSeconds (12h limit)', () => {
      const now = Date.now();
      const lastSave = now - (24 * 3600 * 1000); // 24 Stunden her
      const yieldPerSec = 5;

      const result = calculateOfflineProgress(lastSave, now, yieldPerSec, 12 * 3600);
      expect(result.elapsedSeconds).toBe(86400);
      expect(result.clampedSeconds).toBe(43200); // max 12h = 43200s
      expect(result.totalYield).toBe(43200 * 5); // 216,000
    });
  });
});
