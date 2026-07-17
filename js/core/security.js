// ============================================================
// FILE: js/core/security.js – Verschlüsselung, Prüfsummen, Sanitizer
// ============================================================

/**
 * Einfache XOR-Verschlüsselung für Save-Daten.
 */
export class SimpleCrypto {
    static #key = 'Mn3m3_Arch1v_2026!';

    static encrypt(text) {
        if (!text) return '';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ this.#key.charCodeAt(i % this.#key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }

    static decrypt(encoded) {
        if (!encoded) return '';
        try {
            const text = atob(encoded);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ this.#key.charCodeAt(i % this.#key.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch {
            return '';
        }
    }
}

/**
 * Prüfsummen-Berechnung für Integritätschecks.
 */
export class Checksum {
    static calculate(data) {
        const json = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

/**
 * Sanitizer – bereinigt und validiert Werte.
 */
export class Sanitizer {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static sanitizeNumber(value, fallback = 0) {
        const num = Number(value);
        return isNaN(num) ? fallback : num;
    }

    static sanitizeString(value, maxLength = 100, fallback = '') {
        if (typeof value !== 'string') return fallback;
        const trimmed = value.trim();
        if (trimmed.length === 0) return fallback;
        return trimmed.slice(0, maxLength);
    }

    static sanitizeArray(value, fallback = []) {
        return Array.isArray(value) ? value : fallback;
    }

    static sanitizeObject(value, fallback = {}) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
    }
}

/**
 * Integritäts-Checker für Spielzustände.
 */
export class IntegrityChecker {
    static checkResourceState(resources) {
        const errors = [];
        if (resources.particles < 0) errors.push('particles negativ');
        if (resources.relics < 0) errors.push('relics negativ');
        if (resources.artifacts < 0) errors.push('artifacts negativ');
        if (resources.memoryDust < 0) errors.push('memoryDust negativ');
        if (resources.particles > 1e15) errors.push('particles > 1e15');
        if (resources.relics > 1e12) errors.push('relics > 1e12');
        return errors;
    }

    static checkHeroState(hero) {
        const errors = [];
        if (hero.level < 1) errors.push('level < 1');
        if (hero.prestigeLevel < 0) errors.push('prestigeLevel negativ');
        if (hero.bossProgress > 200) errors.push('bossProgress > 200');
        return errors;
    }

    static checkAll(context) {
        const allErrors = [];
        const res = context.resourceManager.getResources();
        allErrors.push(...this.checkResourceState(res));
        allErrors.push(...this.checkHeroState(context.hero));
        return allErrors;
    }

    static repair(context) {
        const hero = context.hero;
        const res = context.resourceManager;
        res.particles = Math.max(0, Math.min(1e15, res.particles));
        res.relics = Math.max(0, Math.min(1e12, res.relics));
        hero.level = Math.max(1, Math.min(9999, hero.level));
        hero.bossProgress = Math.max(0, Math.min(200, hero.bossProgress));
        // Stat-Punkte plausibilisieren
        const expectedPoints = (hero.level - 1) * 3;
        const totalSpent = hero.spentStats.attack + hero.spentStats.defense +
                           hero.spentStats.agility + hero.spentStats.stamina;
        const currentTotal = hero.unspentStatPoints + totalSpent;
        if (currentTotal < expectedPoints) {
            hero.unspentStatPoints += expectedPoints - currentTotal;
        }
        return true;
    }
}