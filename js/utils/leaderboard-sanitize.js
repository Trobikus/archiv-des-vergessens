/**
 * ============================================================
 * FILE: utils/leaderboard-sanitize.js – Bestenliste Zeitfelder
 * ============================================================
 * JSON.stringify wandelt Infinity → null. Diese Helfer stellen
 * Zeitrekorde wieder her und sind die einzige Quelle der Wahrheit
 * für Boot-/Cloud-Hydrate, State-Migration und LeaderboardService.
 * ============================================================
 */

/** @type {readonly string[]} */
export const TIME_RECORD_KEYS = Object.freeze([
  'fastestBossKill',
  'fastestPrestige',
  'fastestLevelUp'
]);

/**
 * Stellt Zeitrekorde wieder her: null/NaN → Infinity, gültige Zahlen bleiben.
 * @param {*} value
 * @returns {number}
 */
export function sanitizeTimeRecord(value) {
  if (value == null || value === '' || value === 'Infinity') return Infinity;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return Infinity;
  return n;
}

/**
 * @param {*} elapsed
 * @param {*} currentBest
 * @returns {boolean}
 */
export function isBetterTime(elapsed, currentBest) {
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < sanitizeTimeRecord(currentBest);
}

/**
 * @param {*} value
 * @returns {string}
 */
export function formatTimeRecord(value) {
  const v = sanitizeTimeRecord(value);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v * 10) / 10}s`;
}

/**
 * Heilt Zeitfelder eines Leaderboard-Slices (mutiert nicht das Original).
 * @param {Object|null|undefined} leaderboard
 * @returns {Object|null|undefined} neues Objekt, oder Eingabe wenn kein Objekt
 */
export function sanitizeLeaderboardSlice(leaderboard) {
  if (!leaderboard || typeof leaderboard !== 'object') return leaderboard;
  const sanitized = { ...leaderboard };
  for (const key of TIME_RECORD_KEYS) {
    sanitized[key] = sanitizeTimeRecord(sanitized[key]);
  }
  return sanitized;
}
