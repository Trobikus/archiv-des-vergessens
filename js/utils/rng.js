/**
 * ============================================================
 * FILE: core/utils/rng.js – Zufallszahlen-Generator
 * ============================================================
 */

export default class RNG {
  static seed = Math.floor(Math.random() * 2147483647);
  
  static setSeed(s) { 
    this.seed = s; 
  }
  
  static getSeed() { 
    return this.seed; 
  }
  
  static next() {
    this.seed = this.seed * 16807 % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  
  static random() { 
    return this.next(); 
  }
  
  /**
   * Gibt eine zufällige Ganzzahl zwischen min (inklusiv) und max (exklusiv) zurück.
   */
  static randomInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
  
  /**
   * Gibt ein zufälliges Element aus einem Array zurück.
   */
  static randomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[this.randomInt(0, arr.length)];
  }
  
  /**
   * Mischet ein Array (Fisher-Yates).
   */
  static shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Gibt eine deterministische Pseudozufallszahl zwischen 0 und 1 basierend auf einem Seed zurück.
 */
export function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}