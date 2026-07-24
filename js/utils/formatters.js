/**
 * ============================================================
 * FILE: utils/formatters.js – Zahlenformatierung für Idle Games
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Formatierung von großen Zahlen in deutschem Idle-Game Standard
 * - Suffixe: Tsd., Mio., Mrd., Bio., Brd., wissenschaftliche Notation
 * - Unterstützung von Number, String und BigInt
 * ============================================================
 */

import { sanitizeNumber } from './sanitizer.js';

const SUFFIXES_DE = [
  { value: 1e18, suffix: 'e' }, // Ab 1e18 wissenschaftliche Notation
  { value: 1e15, suffix: ' Brd.' },
  { value: 1e12, suffix: ' Bio.' },
  { value: 1e9,  suffix: ' Mrd.' },
  { value: 1e6,  suffix: ' Mio.' },
  { value: 1e3,  suffix: ' Tsd.' }
];

/**
 * Formatiert eine Zahl oder ein BigInt in die deutsche Idle-Game Notierung.
 * Beispiele:
 * - 950 -> "950"
 * - 1500 -> "1,5 Tsd."
 * - 2300000 -> "2,3 Mio."
 * - 4000000000 -> "4,0 Mrd."
 * - 1e20 -> "1,00e20"
 * 
 * @param {number|string|BigInt} val - Der zu formatierende Wert
 * @param {Object} [options={}]
 * @param {number} [options.decimals=1] - Nachkommastellen für Suffix-Werte
 * @param {string} [options.locale='de'] - Sprachcode ('de' verwendet Komma)
 * @returns {string}
 */
export function formatNumber(val, options = {}) {
  if (val === null || val === undefined || val === '') return '0';

  const decimals = typeof options.decimals === 'number' ? options.decimals : 1;
  const locale = options.locale || 'de';

  let num = 0;
  if (typeof val === 'bigint') {
    if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
      // Für extrem große BigInts wissenschaftliche Notation berechnen
      const str = val.toString();
      const exponent = str.length - 1;
      const mantissa = parseFloat(str[0] + '.' + str.slice(1, 4));
      const formattedMantissa = mantissa.toFixed(decimals).replace('.', locale === 'de' ? ',' : '.');
      return `${formattedMantissa}e${exponent}`;
    }
    num = Number(val);
  } else if (typeof val === 'string') {
    num = Number(val);
  } else {
    num = val;
  }

  if (isNaN(num)) return '0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (absNum < 1000) {
    // Kleine Zahlen direkt formatieren
    const formatted = Number.isInteger(absNum) ? absNum.toString() : absNum.toFixed(decimals);
    const result = locale === 'de' ? formatted.replace('.', ',') : formatted;
    return isNegative ? `-${result}` : result;
  }

  // Für Wissenschaftliche Notation ab 1e18
  if (absNum >= 1e18) {
    const expStr = absNum.toExponential(decimals);
    const result = locale === 'de' ? expStr.replace('.', ',') : expStr;
    return isNegative ? `-${result}` : result;
  }

  // Suffix-Suche
  for (const tier of SUFFIXES_DE) {
    if (absNum >= tier.value) {
      const scaled = absNum / tier.value;
      const formatted = scaled.toFixed(decimals);
      const withLocale = locale === 'de' ? formatted.replace('.', ',') : formatted;
      const result = `${withLocale}${tier.suffix}`;
      return isNegative ? `-${result}` : result;
    }
  }

  return num.toString();
}

export default {
  formatNumber
};
