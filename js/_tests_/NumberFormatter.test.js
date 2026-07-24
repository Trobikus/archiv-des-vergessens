import { describe, it, expect } from 'vitest';
import { formatNumber } from '../utils/formatters.js';

describe('Number Formatting Utility (js/utils/formatters.js)', () => {
  it('formats numbers below 1000 correctly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(950)).toBe('950');
    expect(formatNumber(12.345, { decimals: 1 })).toBe('12,3');
  });

  it('formats thousands (Tsd.)', () => {
    expect(formatNumber(1000)).toBe('1,0 Tsd.');
    expect(formatNumber(1500)).toBe('1,5 Tsd.');
    expect(formatNumber(999900)).toBe('999,9 Tsd.');
  });

  it('formats millions (Mio.)', () => {
    expect(formatNumber(1000000)).toBe('1,0 Mio.');
    expect(formatNumber(2300000)).toBe('2,3 Mio.');
  });

  it('formats billions (Mrd.)', () => {
    expect(formatNumber(1000000000)).toBe('1,0 Mrd.');
    expect(formatNumber(4000000000)).toBe('4,0 Mrd.');
  });

  it('formats trillions (Bio.) and quadrillions (Brd.)', () => {
    expect(formatNumber(1e12)).toBe('1,0 Bio.');
    expect(formatNumber(1e15)).toBe('1,0 Brd.');
  });

  it('formats scientific notation for >= 1e18', () => {
    expect(formatNumber(1e18)).toBe('1,0e+18');
    expect(formatNumber(1e20)).toBe('1,0e+20');
  });

  it('handles strings and BigInt inputs correctly', () => {
    expect(formatNumber('2500')).toBe('2,5 Tsd.');
    expect(formatNumber(BigInt(1000000))).toBe('1,0 Mio.');
  });

  it('handles negative numbers correctly', () => {
    expect(formatNumber(-1500)).toBe('-1,5 Tsd.');
    expect(formatNumber(-500)).toBe('-500');
  });

  it('handles invalid or empty inputs gracefully', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
    expect(formatNumber('')).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });
});
