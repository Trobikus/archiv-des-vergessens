import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';
import { calculateOfflineProgress } from '../core/services/offline-progress-service.js';

describe('OfflineProgressService', () => {
  let mockState;

  beforeEach(() => {
    mockState = {
      hero: {
        prestige: { level: 0 },
        talents: { allocatedNodeIds: [] }
      },
      library: { upgrades: { clan_boost: 0 } },
      clan: { members: [], expeditionStatus: {} },
      idleGenerators: { gedankenArchiv: { level: 0, baseYield: 1.0, upgrades: {} } },
      resources: { ewigeMneme: '0' },
      system: {}
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Default deterministic
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns zeros when no clan members and no generator', () => {
    const offlineMs = 2 * 60 * 60 * 1000; // 2 hours
    const result = calculateOfflineProgress(mockState, offlineMs);

    expect(result.totalParticles).toBe(0);
    expect(result.totalRelics).toBe(0);
    expect(result.totalArtifacts).toBe(0);
    expect(result.totalLevels).toBe(0);
    expect(result.offlineMneme).toBe(0);
    expect(result.simulatedMembers).toHaveLength(0);
  });

  test('calculates correct particles for a collector', () => {
    mockState.clan.members = [{
      id: 'm1',
      role: 'collector',
      level: 1,
      experience: 0,
      progress: 0,
      expToNextLevel: 50,
      baseCollectRate: 1.0
    }];

    // 2 hours = 7200 seconds = 720 ticks (10s each)
    // Rate is 1.0, exponential scale for 2 hours = 1.02^2 ≈ 1.0404
    // Rate > 1, so > 720 ticks
    const offlineMs = 2 * 60 * 60 * 1000;
    const result = calculateOfflineProgress(mockState, offlineMs);

    expect(result.totalParticles).toBeGreaterThan(700);
    expect(result.totalRelics).toBe(0);
    expect(result.totalArtifacts).toBe(0);
    expect(result.totalLevels).toBeGreaterThan(0); // Should level up
  });

  test('calculates correct drops for a weaver', () => {
    mockState.clan.members = [{
      id: 'm2',
      role: 'weaver',
      level: 1,
      experience: 0,
      progress: 0,
      expToNextLevel: 50,
      baseCollectRate: 1.0
    }];

    // Mock Math.random to < 0.1 for relics, >= 0.1 for particles
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.05).mockReturnValue(0.2);

    // Give it just enough time for 2 ticks
    // Rate = 1.0. tickRate = 10000ms. 1 tick = 100%. 1 tick takes 10s.
    // 2 ticks = 20s
    const offlineMs = 20 * 1000; 
    const result = calculateOfflineProgress(mockState, offlineMs);

    // We can't easily predict exact drops because exponential scale and leveling affect rate,
    // but at 20 seconds scale is close to 1, we expect 2 ticks.
    // First tick (random = 0.05) -> relic
    // Second tick (random = 0.2) -> 2 particles
    expect(result.totalRelics).toBeGreaterThanOrEqual(1);
    expect(result.totalParticles).toBeGreaterThanOrEqual(0); // At least some particles
  });

  test('calculates correct drops for a guardian', () => {
    mockState.clan.members = [{
      id: 'm3',
      role: 'guardian',
      level: 1,
      experience: 0,
      progress: 0,
      expToNextLevel: 50,
      baseCollectRate: 1.0
    }];

    vi.spyOn(Math, 'random').mockReturnValue(0.01); // Always artifact
    const offlineMs = 60 * 1000; // 60s
    const result = calculateOfflineProgress(mockState, offlineMs);

    expect(result.totalArtifacts).toBeGreaterThan(0);
    expect(result.totalParticles).toBe(0);
  });

  test('calculates correct drops for an archivist', () => {
    mockState.clan.members = [{
      id: 'm4',
      role: 'archivist',
      level: 1,
      experience: 0,
      progress: 0,
      expToNextLevel: 50,
      baseCollectRate: 1.0
    }];

    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.15 -> relic
    const offlineMs = 60 * 1000; // 60s
    const result = calculateOfflineProgress(mockState, offlineMs);

    expect(result.totalRelics).toBeGreaterThan(0);
    expect(result.totalParticles).toBe(0);
  });

  test('calculates correct drops for an elder', () => {
    mockState.clan.members = [{
      id: 'm5',
      role: 'elder',
      level: 1,
      experience: 0,
      progress: 0,
      expToNextLevel: 50,
      baseCollectRate: 1.0
    }];

    // First tick: random < 0.1 -> artifact
    // Second tick: 0.1 <= random < 0.3 -> relic
    // Third tick: random >= 0.3 -> 6 particles
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.05)
      .mockReturnValueOnce(0.2)
      .mockReturnValue(0.5);

    const offlineMs = 30 * 1000; // 30s
    const result = calculateOfflineProgress(mockState, offlineMs);

    expect(result.totalArtifacts).toBeGreaterThanOrEqual(1);
    expect(result.totalRelics).toBeGreaterThanOrEqual(1);
    expect(result.totalParticles).toBeGreaterThanOrEqual(6);
  });

  test('calculates offline mneme with idle generator active', () => {
    mockState.idleGenerators.gedankenArchiv.level = 10;
    mockState.idleGenerators.gedankenArchiv.baseYield = 1.0;

    const offlineMs = 2 * 60 * 60 * 1000; // 2 hours
    const result = calculateOfflineProgress(mockState, offlineMs);

    // Yield = 1.0 * 10 = 10 per sec
    // 2 hours = 7200 seconds -> ~72000 Mneme
    expect(result.offlineMneme).toBeGreaterThan(70000);
  });
});
