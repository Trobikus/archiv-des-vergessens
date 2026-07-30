/**
 * ============================================================
 * FILE: server/modules/crypto.js - Kryptografie & Password Hashing
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Sicheres Password-Hashing mit PBKDF2
 * - Token-Generierung
 * - Timing-safe Vergleiche
 * ============================================================
 */

import crypto from 'node:crypto';

// ---- KONSTANTEN ----
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const MAX_PASSWORD_LENGTH = 128;

/**
 * Generiert einen kryptografisch sicheren Salt
 * @returns {string} Hex-codierter Salt
 */
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hasht ein Passwort mit PBKDF2
 * @param {string} password - Das zu hashende Passwort
 * @param {string} salt - Der Salt-Wert
 * @returns {string} Hex-codierter Hash
 */
export function hashPassword(password, salt) {
  const safePassword = typeof password === 'string' ? password.substring(0, MAX_PASSWORD_LENGTH) : '';
  const safeSalt = typeof salt === 'string' ? salt : '';
  return crypto.pbkdf2Sync(safePassword, safeSalt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
}

/**
 * Verifiziert ein Passwort gegen einen gespeicherten Hash (timing-safe)
 * @param {string} password - Das zu prüfende Passwort
 * @param {string} salt - Der Salt-Wert
 * @param {string} storedHash - Der gespeicherte Hash
 * @returns {boolean} True wenn Passwort korrekt ist
 */
export function verifyPassword(password, salt, storedHash) {
  if (typeof password !== 'string' || typeof salt !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  const computedHash = hashPassword(password, salt);
  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generiert einen kryptografisch sicheren Session-Token
 * @returns {string} Token mit Prefix 'tok_'
 */
export function generateToken() {
  return 'tok_' + crypto.randomBytes(24).toString('hex');
}
