// ============================================================
// FILE: core/PRNG.js – Mulberry32 (robust, deterministic)
// ============================================================

/**
 * Mulberry32 – schneller, deterministischer PRNG mit guter Verteilung.
 * Ersetzt die einfache LCG aus rng.js.
 */
export class PRNG {
    /**
     * @param {number} seed – Initialer Seed (Standard: 0x1F1F1F)
     */
    constructor(seed = 0x1F1F1F) {
        this._seed = seed >>> 0;
        this._initialSeed = this._seed;
    }

    /**
     * Setzt den Seed zurück.
     */
    setSeed(seed) {
        this._seed = (seed >>> 0) || 0x1F1F1F;
        this._initialSeed = this._seed;
    }

    /**
     * Gibt den aktuellen Seed zurück.
     */
    getSeed() {
        return this._seed;
    }

    /**
     * Gibt den initialen Seed zurück (für Persistenz).
     */
    getInitialSeed() {
        return this._initialSeed;
    }

    /**
     * Generiert eine Zufallszahl im Bereich [0, 1).
     */
    next() {
        let z = (this._seed += 0x6D2B79F5);
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Generiert eine Zufallszahl im Bereich [min, max).
     */
    nextRange(min, max) {
        return min + this.next() * (max - min);
    }

    /**
     * Generiert eine Zufallszahl im Bereich [min, max] (inklusive).
     */
    nextInt(min, max) {
        return Math.floor(this.nextRange(min, max + 1));
    }

    /**
     * Gibt einen zufälligen Eintrag aus einem Array zurück.
     */
    pick(arr) {
        if (!arr || arr.length === 0) return undefined;
        return arr[Math.floor(this.next() * arr.length)];
    }

    /**
     * Mischt ein Array (Fisher-Yates).
     */
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
}

// Singleton-Instanz für das gesamte Spiel
export const RNG = new PRNG();

// Export für Kompatibilität mit altem Code
export default RNG;