import { describe, it, expect } from 'vitest';
import {
  clamp,
  sanitizeNumber,
  sanitizeString,
  sanitizeArray,
  sanitizeObject,
  escapeHtml
} from '../utils/sanitizer.js';

describe('Sanitizer Utility', () => {
  describe('clamp', () => {
    it('clamps values within min and max boundaries', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('sanitizeNumber', () => {
    it('parses valid numbers and returns fallbacks for invalid values', () => {
      expect(sanitizeNumber(42)).toBe(42);
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber('abc', 0)).toBe(0);
      expect(sanitizeNumber(null, 10)).toBe(10);
      expect(sanitizeNumber(undefined, 5)).toBe(5);
    });
  });

  describe('sanitizeString', () => {
    it('trims and limits length of strings', () => {
      expect(sanitizeString('  hello world  ', 10)).toBe('hello worl');
      expect(sanitizeString('', 100, 'fallback')).toBe('fallback');
      expect(sanitizeString(123, 100, 'fallback')).toBe('fallback');
    });
  });

  describe('sanitizeArray & sanitizeObject', () => {
    it('returns arrays or objects if valid, or fallbacks if invalid', () => {
      expect(sanitizeArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(sanitizeArray('not an array', [1])).toEqual([1]);

      expect(sanitizeObject({ a: 1 })).toEqual({ a: 1 });
      expect(sanitizeObject(null, { default: true })).toEqual({ default: true });
      expect(sanitizeObject([1, 2], { default: true })).toEqual({ default: true });
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters to prevent XSS', () => {
      const input = `<script>alert('XSS & "test"')</script>`;
      const expected = `&lt;script&gt;alert(&#39;XSS &amp; &quot;test&quot;&#39;)&lt;/script&gt;`;
      expect(escapeHtml(input)).toBe(expected);
    });

    it('returns empty string for non-string inputs', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('');
    });
  });

  describe('Server Sanitize behavior', () => {
    function serverSanitize(str, maxLength = 200) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .trim()
        .substring(0, maxLength);
    }

    it('escapes &, <, >, ", \' characters, trims and limits string length', () => {
      const input = `  <img src="x" onerror='alert("&1")'>  `;
      const result = serverSanitize(input, 100);
      expect(result).toBe(`&lt;img src=&quot;x&quot; onerror=&#39;alert(&quot;&amp;1&quot;)&#39;&gt;`);
    });

    it('handles non-string values gracefully', () => {
      expect(serverSanitize(null)).toBe('');
      expect(serverSanitize(12345)).toBe('');
      expect(serverSanitize({})).toBe('');
    });
  });
});
