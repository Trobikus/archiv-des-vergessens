// ============================================================
// FILE: models/hero/HeroStats.js – Stat-Berechnungen
// ============================================================

import { CONFIG } from '../../core/di/config.js';
import { Sanitizer } from '../../core/security.js';

/**
 * Berechnet alle Helden-Statistiken.
 * Wird von der Hero-Hauptklasse verwendet.
 */
export class HeroStats {
    /**
     * @param {object} hero – Referenz auf die Hero-Instanz (für Equipment-Zugriff)
     */
    constructor(hero) {
        this._hero = hero;
        this._statsCache = null;
        this._combatStatsCache = null;
        this._statsDirty = true;
    }

    /**
     * Markiert die Caches als veraltet.
     */
    markDirty() {
        this._statsDirty = true;
        this._statsCache = null;
        this._combatStatsCache = null;
    }

    /**
     * Berechnet die aktuellen Attribute (Angriff, Verteidigung, Geschick, Vitalität).
     * Berücksichtigt Basiswerte, verbrauchte Stat-Punkte und Equipment-Boni.
     */
    getStats() {
        if (!this._statsDirty && this._statsCache) {
            return this._statsCache;
        }

        const hero = this._hero;
        const base = hero.baseStats || { attack: 5, defense: 3, agility: 4, stamina: 6 };
        const spent = hero.spentStats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
        const equipment = hero.equipment || {};

        const stats = {
            attack: base.attack + spent.attack,
            defense: base.defense + spent.defense,
            agility: base.agility + spent.agility,
            stamina: base.stamina + spent.stamina
        };

        // Equipment-Boni
        const setCounts = {};
        for (const slot of Object.values(equipment)) {
            if (slot) {
                if (slot.stats?.attack) stats.attack += slot.stats.attack;
                if (slot.stats?.defense) stats.defense += slot.stats.defense;
                if (slot.stats?.agility) stats.agility += slot.stats.agility;
                if (slot.stats?.stamina) stats.stamina += slot.stats.stamina;
                if (slot.setName) {
                    setCounts[slot.setName] = (setCounts[slot.setName] || 0) + 1;
                }
            }
        }

        // Set-Boni
        if (setCounts['Schatten'] >= 4) {
            stats.agility += Math.floor(stats.agility * 0.2);
            stats.attack += Math.floor(stats.attack * 0.1);
        }
        if (setCounts['Archiv'] >= 4) {
            stats.defense += Math.floor(stats.defense * 0.2);
            stats.stamina += Math.floor(stats.stamina * 0.2);
        }
        if (setCounts['Ur'] >= 4) {
            stats.attack += Math.floor(stats.attack * 0.3);
            stats.defense += Math.floor(stats.defense * 0.3);
            stats.agility += Math.floor(stats.agility * 0.3);
            stats.stamina += Math.floor(stats.stamina * 0.3);
        }
        if (setCounts['Gott'] >= 4) {
            stats.attack += Math.floor(stats.attack * 0.5);
            stats.defense += Math.floor(stats.defense * 0.5);
            stats.agility += Math.floor(stats.agility * 0.5);
            stats.stamina += Math.floor(stats.stamina * 0.5);
        }

        // Skill-Boni
        const unlockedSkills = hero.unlockedSkills || [];
        if (unlockedSkills.includes('warrior_1')) {
            stats.attack += Math.floor(stats.attack * 0.1);
        }

        this._statsCache = stats;
        this._statsDirty = false;
        return stats;
    }

    /**
     * Berechnet die Kampfstatistiken (maxHP, Schadensreduktion, Krit, Ausweichen).
     */
    getCombatStats() {
        if (!this._statsDirty && this._combatStatsCache) {
            return this._combatStatsCache;
        }

        const attr = this.getStats();
        const damageReduction = attr.defense / (attr.defense + 100);

        const combatStats = {
            ...attr,
            maxHp: 100 + (attr.stamina * 10) + (attr.defense * 2),
            damageReduction: damageReduction,
            critChance: Math.min(80, 5 + (attr.agility * 0.5)),
            critDamage: 150 + (attr.attack * 0.5),
            dodgeChance: Math.min(50, attr.agility * 0.25)
        };

        this._combatStatsCache = combatStats;
        return combatStats;
    }

    /**
     * Gibt die Gesamtkampfkraft (Summe aller Attribute) zurück.
     */
    getTotalPower() {
        const s = this.getStats();
        return s.attack + s.defense + s.agility + s.stamina;
    }

    /**
     * Berechnet den Fortschritt zum nächsten Level (Prozent).
     */
    getLevelProgress() {
        const hero = this._hero;
        if (hero.expToNext === Infinity) return 100;
        return (hero.experience / hero.expToNext) * 100;
    }
}