/**
 * ============================================================
 * FILE: __tests__/HeroService.test.js – HeroService Unit-Tests
 * ============================================================
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import EventBus from '../core/events/bus.js';
import StateManager from '../core/state/manager.js';
import HeroService from '../core/services/hero-service.js';
import ResourceService from '../core/services/resource-service.js';

describe('HeroService', () => {
  let eventBus;
  let stateManager;
  let heroService;
  let resourceService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    resourceService = new ResourceService(stateManager, eventBus);
    heroService = new HeroService(stateManager, eventBus);
    // State initialisieren
    stateManager.init(null, null, null);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial hero state is correct', () => {
    const hero = heroService.getHero();
    expect(hero.name).toBe('Der Mneme-Bund');
    expect(hero.level).toBe(1);
    expect(hero.experience).toBe(0);
    expect(hero.prestige.level).toBe(0);
  });

  test('addExperience increases experience and levels up', () => {
    heroService.addExperience(30);
    let hero = heroService.getHero();
    expect(hero.experience).toBe(30);
    expect(hero.level).toBe(1);

    heroService.addExperience(20);
    hero = heroService.getHero();
    expect(hero.level).toBe(2);
    expect(hero.experience).toBe(0);
    expect(hero.unspentStatPoints).toBe(3);
  });

  test('spendStatPoint works correctly', () => {
    heroService.addExperience(100); // Level 2
    expect(heroService.getHero().unspentStatPoints).toBe(3);

    const result = heroService.spendStatPoint('attack');
    expect(result).toBe(true);
    const hero = heroService.getHero();
    expect(hero.unspentStatPoints).toBe(2);
    expect(hero.spentStats.attack).toBe(1);
  });

  test('spendStatPoint fails if no points', () => {
    const result = heroService.spendStatPoint('attack');
    expect(result).toBe(false);
  });

  test('getAttributes returns combined stats', () => {
    heroService.addExperience(100);
    heroService.spendStatPoint('attack');
    heroService.spendStatPoint('defense');

    const stats = heroService.getAttributes();
    expect(stats.attack).toBe(6); // base 5 + 1
    expect(stats.defense).toBe(4); // base 3 + 1
    expect(stats.agility).toBe(4);
    expect(stats.stamina).toBe(6);
  });

  test('getCombatStats returns calculated combat stats', () => {
    const cStats = heroService.getCombatStats();
    expect(cStats.maxHp).toBeGreaterThan(100);
    expect(cStats.damageReduction).toBeGreaterThan(0);
    expect(cStats.critChance).toBeGreaterThan(0);
  });

  test('setTitle sets active title correctly', () => {
    // Add some titles to mock unlocked titles
    stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        titles: ['Sammler', 'Reliktwächter']
      }
    }), 'hero/mockTitles');

    // Set title
    heroService.setTitle('Sammler');
    expect(heroService.getHero().title).toBe('Sammler');

    // Set empty title
    heroService.setTitle('');
    expect(heroService.getHero().title).toBe('');
  });
});