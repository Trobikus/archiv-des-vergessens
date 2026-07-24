/**
 * ============================================================
 * FILE: __tests__/IdleService.test.js – IdleService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import ResourceService from '../core/services/resource-service.js';
import IdleService from '../core/services/idle-service.js';
import { EVENTS } from '../core/events/definitions.js';

describe('IdleService & Standard Idle Game Formulas', () => {
  let eventBus;
  let stateManager;
  let resourceService;
  let idleService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    idleService = new IdleService(stateManager, eventBus, resourceService);
    stateManager.init();
  });

  afterEach(() => {
    eventBus.destroy();
  });

  describe('Formel 1: Kostenformel (Exponentieller Anstieg)', () => {
    test('berechnet die Kosten korrekt mit 1.15 Multiplikator', () => {
      // BasisKosten = 10, Multiplikator = 1.15
      expect(IdleService.calculateBuildingCost(10, 1.15, 0)).toBe(10);
      expect(IdleService.calculateBuildingCost(10, 1.15, 1)).toBe(11);
      expect(IdleService.calculateBuildingCost(10, 1.15, 2)).toBe(13);
      expect(IdleService.calculateBuildingCost(10, 1.15, 5)).toBe(20);
      expect(IdleService.calculateBuildingCost(10, 1.15, 10)).toBe(40);
    });

    test('handhabt unzulässige oder negative Level/Kosten sicher', () => {
      expect(IdleService.calculateBuildingCost(-10, 1.15, 0)).toBe(0);
      expect(IdleService.calculateBuildingCost(10, 0.5, 2)).toBe(10);
      expect(IdleService.calculateBuildingCost(10, 1.15, -5)).toBe(10);
    });
  });

  describe('Formel 2: Ertragsformel (Ressourcen pro Sekunde)', () => {
    test('berechnet den Ertrag ohne Boni korrekt', () => {
      // BasisErtrag = 1.0, Level = 5, Boni = 0, Prestige = 1.0
      expect(IdleService.calculateYieldPerSecond(1.0, 5, 0, 1.0)).toBe(5.0);
    });

    test('skaliert mit Upgrade-Bonus und Prestige-Multiplikator', () => {
      // Level = 10, UpgradeBonus = 0.50 (+50%), Prestige = 1.20 (+20%)
      // 1.0 * 10 * (1 + 0.5) * 1.2 = 10 * 1.5 * 1.2 = 18.0
      const yieldPerSec = IdleService.calculateYieldPerSecond(1.0, 10, 0.5, 1.2);
      expect(yieldPerSec).toBeCloseTo(18.0, 5);
    });
  });

  describe('Formel 3: Prestige-Formel (Wurzel-Skalierung)', () => {
    test('gibt 0 zurück, wenn Schwellenwert nicht erreicht ist', () => {
      expect(IdleService.calculatePrestigeCurrency(500, 1000)).toBe(0);
      expect(IdleService.calculatePrestigeCurrency(999, 1000)).toBe(0);
    });

    test('berechnet Währung korrekt nach der Wurzel-Formel floor(sqrt(Gesamt / Schwellenwert))', () => {
      expect(IdleService.calculatePrestigeCurrency(1000, 1000)).toBe(1);  // sqrt(1) = 1
      expect(IdleService.calculatePrestigeCurrency(4000, 1000)).toBe(2);  // sqrt(4) = 2
      expect(IdleService.calculatePrestigeCurrency(9000, 1000)).toBe(3);  // sqrt(9) = 3
      expect(IdleService.calculatePrestigeCurrency(10000, 1000)).toBe(3); // sqrt(10) = 3.16 -> floor 3
      expect(IdleService.calculatePrestigeCurrency(16000, 1000)).toBe(4); // sqrt(16) = 4
    });

    test('unterstützt BigInt Eingaben', () => {
      expect(IdleService.calculatePrestigeCurrency(BigInt(4000), 1000)).toBe(2);
    });
  });

  describe('GedankenArchiv Integration & State Management', () => {
    test('Startzustand des GedankenArchivs ist korrekt', () => {
      const gen = idleService.getGedankenArchiv();
      expect(gen.level).toBe(0);
      expect(idleService.getGedankenArchivCost()).toBe(10);
      expect(idleService.getGedankenArchivYieldPerSecond()).toBe(0);
    });

    test('Kauf von GedankenArchiv-Stufen zieht mnemeFragmente ab', () => {
      resourceService.addMnemeFragmente(50);
      expect(resourceService.getResources().mnemeFragmente).toBe(50);

      const success = idleService.buyGedankenArchivLevel();
      expect(success).toBe(true);

      const gen = idleService.getGedankenArchiv();
      expect(gen.level).toBe(1);
      // 50 - 10 = 40
      expect(resourceService.getResources().mnemeFragmente).toBe(40);
      // Nächste Stufe kostet floor(10 * 1.15^1) = 11
      expect(idleService.getGedankenArchivCost()).toBe(11);
    });

    test('GedankenArchiv generiert mnemeFragmente pro Tick', () => {
      resourceService.addMnemeFragmente(100);
      idleService.buyGedankenArchivLevel(); // Level 1 (Yield = 1/s)

      // 1000ms = 1 Sekunde Tick -> +1 Mneme-Fragment
      eventBus.publish(EVENTS.GAME_SLOW_TICK, { delta: 1000 });
      // Level 1 gekauf: 100 - 10 + 1 = 91
      expect(resourceService.getResources().mnemeFragmente).toBe(91);
    });

    test('Ewige-Mneme Prestige setzt Generatoren zurück und erhöht den Prestige-Multiplikator', () => {
      resourceService.addMnemeFragmente(40000);
      idleService.buyGedankenArchivLevel(); // Level 1

      expect(idleService.getPendingEwigeMneme()).toBe(2); // totalMneme >= 40000 -> floor(sqrt(40000/10000)) = 2

      const result = idleService.performEwigeMnemePrestige();
      expect(result.success).toBe(true);
      expect(result.reward).toBe(2);

      // State Prüfungen
      expect(resourceService.getResources().mnemeFragmente).toBe(0);
      expect(resourceService.getResources().ewigeMneme).toBe(2);
      expect(idleService.getGedankenArchiv().level).toBe(0);
      // Multiplikator = 1.0 + (2 * 0.10) = 1.20
      expect(idleService.getPrestigeMultiplier()).toBe(1.20);
    });
  });
});
