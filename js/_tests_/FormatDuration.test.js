import { describe, it, expect } from 'vitest';
import { formatDuration } from '../utils/formatters.js';

describe('formatDuration Utility', () => {
  it('formats 0s correctly', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(999)).toBe('0s');
  });

  it('formats only seconds correctly', () => {
    expect(formatDuration(45000)).toBe('45s');
    expect(formatDuration(59999)).toBe('59s');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(65000)).toBe('1m 5s');
  });

  it('formats hours, minutes, and seconds correctly', () => {
    // Die Original-Logik lässt Minuten weg, wenn sie 0 sind (if minutes > 0)
    expect(formatDuration(3600000)).toBe('1h 0s'); 
    expect(formatDuration(3661000)).toBe('1h 1m 1s');
  });
});
