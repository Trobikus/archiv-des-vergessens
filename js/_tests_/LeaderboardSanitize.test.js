/**
 * ============================================================
 * FILE: js/_tests_/LeaderboardSanitize.test.js
 * ============================================================
 */

import { describe, test, expect } from 'vitest';
import {
  TIME_RECORD_KEYS,
  sanitizeTimeRecord,
  isBetterTime,
  formatTimeRecord,
  sanitizeLeaderboardSlice
} from '../utils/leaderboard-sanitize.js';

describe('leaderboard-sanitize', () => {
  test('sanitizeTimeRecord restores null from JSON Infinity loss', () => {
    expect(sanitizeTimeRecord(null)).toBe(Infinity);
    expect(sanitizeTimeRecord(undefined)).toBe(Infinity);
    expect(sanitizeTimeRecord('Infinity')).toBe(Infinity);
    expect(sanitizeTimeRecord(12.5)).toBe(12.5);
    expect(sanitizeTimeRecord(-1)).toBe(Infinity);
    expect(sanitizeTimeRecord(NaN)).toBe(Infinity);
  });

  test('isBetterTime treats null current best as unset', () => {
    expect(isBetterTime(12.34, null)).toBe(true);
    expect(isBetterTime(12.34, Infinity)).toBe(true);
    expect(isBetterTime(12.34, 10)).toBe(false);
    expect(isBetterTime(-1, null)).toBe(false);
  });

  test('formatTimeRecord rounds and shows dash for unset', () => {
    expect(formatTimeRecord(null)).toBe('—');
    expect(formatTimeRecord(Infinity)).toBe('—');
    expect(formatTimeRecord(12.34)).toBe('12.3s');
  });

  test('sanitizeLeaderboardSlice heals all time keys without mutating input', () => {
    const input = {
      highestPrestige: 2,
      fastestBossKill: null,
      fastestPrestige: null,
      fastestLevelUp: 'Infinity',
      highestLevel: 5
    };
    const out = sanitizeLeaderboardSlice(input);
    expect(out).not.toBe(input);
    expect(input.fastestBossKill).toBeNull();
    expect(out.fastestBossKill).toBe(Infinity);
    expect(out.fastestPrestige).toBe(Infinity);
    expect(out.fastestLevelUp).toBe(Infinity);
    expect(out.highestPrestige).toBe(2);
    expect(out.highestLevel).toBe(5);
    for (const key of TIME_RECORD_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(out, key)).toBe(true);
    }
  });

  test('sanitizeLeaderboardSlice passes through non-objects', () => {
    expect(sanitizeLeaderboardSlice(null)).toBeNull();
    expect(sanitizeLeaderboardSlice(undefined)).toBeUndefined();
  });
});
