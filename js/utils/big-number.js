/**
 * ============================================================
 * FILE: core/utils/big-number.js – BigInt-Helfer für Ressourcen
 * ============================================================
 */

/**
 * Konvertiert einen Wert zu BigInt (sicher).
 */
export function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

/**
 * Konvertiert BigInt zu Number (mit Warnung bei Overflow).
 */
export function bigIntToNumber(value) {
  const num = Number(value);
  if (num > Number.MAX_SAFE_INTEGER) {
    console.warn('[BigNumber] Wert überschreitet MAX_SAFE_INTEGER:', value);
  }
  return num;
}

/**
 * Formatiert eine große Zahl mit Kürzel (z.B. 1.2k, 3.4M).
 */
export function formatBigNumber(value) {
  const num = Number(value);
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1) + 'k';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num < 1_000_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  return (num / 1_000_000_000_000).toFixed(1) + 'T';
}

/**
 * Vergleicht zwei BigInt-Werte.
 */
export function compareBigInt(a, b) {
  const aBig = toBigInt(a);
  const bBig = toBigInt(b);
  if (aBig > bBig) return 1;
  if (aBig < bBig) return -1;
  return 0;
}

/**
 * Addiert zwei BigInt-Werte.
 */
export function addBigInt(a, b) {
  return toBigInt(a) + toBigInt(b);
}

/**
 * Subtrahiert zwei BigInt-Werte.
 */
export function subBigInt(a, b) {
  return toBigInt(a) - toBigInt(b);
}