// Unit-Test für Hero
import Hero from '../models/hero.js';
import EventBus from '../core/eventbus.js';

describe('Hero', () => {
  let eventBus;
  let hero;
  let updateCount;

  beforeEach(() => {
    eventBus = new EventBus();
    updateCount = 0;
    hero = new Hero(eventBus);

    eventBus.subscribe('hero:updated', () => {
      updateCount++;
    });
  });

  afterEach(() => {
    eventBus.destroy();
  });

  test('initial state is correct', () => {
    expect(hero.name).toBe('Der Mneme-Bund');
    expect(hero.level).toBe(1);
    expect(hero.experience).toBe(0);
    expect(hero.prestigeLevel).toBe(0);
    expect(hero.prestigePoints).toBe(0);
    expect(hero.unspentStatPoints).toBe(0);
  });

  test('addExperience increases experience and levels up', () => {
    hero.addExperience(50);
    expect(hero.experience).toBe(50);
    expect(hero.level).toBe(1);

    hero.addExperience(50);
    expect(hero.level).toBe(2);
    expect(hero.experience).toBe(0);
    expect(hero.unspentStatPoints).toBe(3);
    expect(updateCount).toBeGreaterThan(0);
  });

  test('getLevelProgress returns correct percentage', () => {
    hero.addExperience(25);
    expect(hero.getLevelProgress()).toBe(50);
  });

  test('spendStatPoint works correctly', () => {
    hero.addExperience(100); // Level 2
    expect(hero.unspentStatPoints).toBe(3);

    const result = hero.spendStatPoint('attack');
    expect(result).toBe(true);
    expect(hero.unspentStatPoints).toBe(2);
    expect(hero.spentStats.attack).toBe(1);
    expect(updateCount).toBeGreaterThan(0);
  });

  test('spendStatPoint fails if no points', () => {
    const result = hero.spendStatPoint('defense');
    expect(result).toBe(false);
    expect(hero.spentStats.defense).toBe(0);
  });

  test('getStats returns combined stats', () => {
    hero.addExperience(100);
    hero.spendStatPoint('attack');
    hero.spendStatPoint('defense');

    const stats = hero.getStats();
    expect(stats.attack).toBe(6); // base 5 + 1
    expect(stats.defense).toBe(4); // base 3 + 1
    expect(stats.agility).toBe(4);
    expect(stats.stamina).toBe(6);
  });

  test('getCombatStats returns calculated combat stats', () => {
    const cStats = hero.getCombatStats();
    expect(cStats.maxHp).toBeGreaterThan(100);
    expect(cStats.damageReduction).toBeGreaterThan(0);
    expect(cStats.critChance).toBeGreaterThan(0);
  });

  test('getTotalPower sums all stats', () => {
    hero.addExperience(100);
    hero.spendStatPoint('attack');
    hero.spendStatPoint('defense');
    hero.spendStatPoint('agility');

    const power = hero.getTotalPower();
    expect(power).toBe(5 + 3 + 4 + 6 + 3); // base sum + 3 spent
  });

  test('getChapter returns correct chapter based on bossProgress', () => {
    expect(hero.getChapter()).toBe(1);
    hero.bossProgress = 5;
    expect(hero.getChapter()).toBe(1); // chapter 1 has bosses 1-10
    hero.bossProgress = 10;
    expect(hero.getChapter()).toBe(2);
  });

  test('getPrestigeBonus returns correct values', () => {
    hero.prestigeLevel = 3;
    expect(hero.getPrestigeBonus('particleStart')).toBe(30);
    expect(hero.getPrestigeBonus('jobRate')).toBe(6);
    expect(hero.getPrestigeBonus('relicChance')).toBe(3);
  });

  test('toJSON / fromJSON roundtrip preserves state', () => {
    hero.name = 'Testheld';
    hero.addExperience(150);
    hero.spendStatPoint('attack');
    hero.spendStatPoint('defense');
    hero.prestigeLevel = 2;
    hero.prestigePoints = 1;
    hero.bossProgress = 5;
    hero.defeatedBosses = [1, 2, 3];

    const json = hero.toJSON();
    const newHero = new Hero(eventBus);
    newHero.fromJSON(json);

    expect(newHero.name).toBe('Testheld');
    expect(newHero.level).toBe(2);
    expect(newHero.prestigeLevel).toBe(2);
    expect(newHero.prestigePoints).toBe(1);
    expect(newHero.bossProgress).toBe(5);
    expect(newHero.defeatedBosses).toEqual([1, 2, 3]);
    expect(newHero.spentStats.attack).toBe(1);
    expect(newHero.spentStats.defense).toBe(1);
  });

  test('performPrestigeReset resets state correctly', () => {
    hero.addExperience(100);
    hero.bossProgress = 20;
    hero.prestigeLevel = 0;

    const result = hero.performPrestigeReset(null, null);
    expect(result.success).toBe(true);
    expect(hero.prestigeLevel).toBe(1);
    expect(hero.prestigePoints).toBe(1);
    expect(hero.level).toBe(1);
    expect(hero.bossProgress).toBe(0);
    expect(hero.defeatedBosses).toEqual([]);
  });

  test('performPrestigeReset fails if not enough bosses defeated', () => {
    hero.bossProgress = 5;
    const result = hero.performPrestigeReset(null, null);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Verewigung erst nach dem letzten Boss');
  });
});