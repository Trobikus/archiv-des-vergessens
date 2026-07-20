/**
 * ============================================================
 * FILE: core/utils/object-utils.js – Tiefe Objektoperationen
 * ============================================================
 */

/**
 * Erstellt eine tiefe Kopie eines Objekts (JSON-basiert).
 * Achtung: Verliert Funktionen, BigInt, etc.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return structuredClone(obj);
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return { ...obj };
    }
  }
}

/**
 * Führt zwei Objekte tief zusammen (überschreibt).
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Friert ein Objekt tief ein (unveränderlich).
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

/**
 * Prüft, ob ein Wert ein einfaches Objekt ist (kein Array, kein Date, etc.).
 */
export function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object;
}

/**
 * Gibt einen verschachtelten Wert aus einem Objekt zurück (Punkt-Notation).
 */
export function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Setzt einen verschachtelten Wert in einem Objekt (Punkt-Notation).
 */
export function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let current = obj;
  for (const part of parts) {
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  current[last] = value;
  return obj;
}