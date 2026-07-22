import { describe, it, expect, beforeEach } from 'vitest';
import { CombatAnalyticsService } from '../core/services/combat-analytics-service.js';
import EventBus from '../core/events/bus.js';

describe('CombatAnalyticsService', () => {
  let eventBus;
  let analyticsService;

  beforeEach(() => {
    eventBus = new EventBus();
    analyticsService = new CombatAnalyticsService(eventBus);
  });

  it('records hits and critical hits correctly', () => {
    analyticsService.recordHit(100, false, 'physical');
    analyticsService.recordHit(250, true, 'physical');

    const stats = analyticsService.getStats();
    expect(stats.totalDamage).toBe(350);
    expect(stats.totalHits).toBe(2);
    expect(stats.critHits).toBe(1);
    expect(stats.critRatePercent).toBe(50);
    expect(stats.maxHit).toBe(250);
    expect(stats.avgHit).toBe(175);
  });

  it('calculates current rolling DPS correctly', () => {
    analyticsService.recordHit(100, false, 'physical');
    analyticsService.recordHit(100, false, 'physical');

    const dps = analyticsService.getCurrentDPS();
    expect(dps).toBeGreaterThan(0);
  });

  it('records mneme gained and healing separately', () => {
    analyticsService.recordHit(50, false, 'heal');
    analyticsService.recordMnemeGained(120);

    const stats = analyticsService.getStats();
    expect(stats.totalHeal).toBe(50);
    expect(stats.totalMneme).toBe(120);
    expect(stats.totalDamage).toBe(0);
  });

  it('resets statistics properly', () => {
    analyticsService.recordHit(100, true, 'physical');
    analyticsService.reset();

    const stats = analyticsService.getStats();
    expect(stats.totalDamage).toBe(0);
    expect(stats.totalHits).toBe(0);
  });
});
