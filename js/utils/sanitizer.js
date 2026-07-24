/**
 * ============================================================
 * FILE: core/utils/sanitizer.js – Sanitizer für sichere Datenverarbeitung
 * ============================================================
 */

/**
 * Clamp einen Wert zwischen min und max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitisiert einen Number-Wert.
 */
export function sanitizeNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Sanitisiert einen String.
 */
export function sanitizeString(value, maxLength = 100, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.slice(0, maxLength);
}

/**
 * Sanitisiert ein Array.
 */
export function sanitizeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

/**
 * Sanitisiert ein Objekt.
 */
export function sanitizeObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

/**
 * Escapet HTML-Sonderzeichen (<, >, &, ", ') zur XSS-Prävention.
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}