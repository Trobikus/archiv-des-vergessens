// ============================================================
// FILE: services/CombatService.js – Deterministic Combat
// ============================================================

import { CONFIG } from '../di/config.js';

/**
 * Combat Service – berechnet Boss-Kämpfe deterministisch.
 * Mit Caching für wiederholte Berechnungen.
 */
export class CombatService {
    constructor(eventBus, heroService) {
        this._eventBus = eventBus;
        this._heroService = heroService;
        this._cache = new Map();
        this._maxCacheSize = 100;
    }

    /**
     * Simuliert einen Kampf zwischen Held und Boss.
     * @param {Object} boss – Boss-Daten (hp, attack, defense)
     * @param {Object} heroStats – Hero-Kampfstats (optional)
     * @returns {Object} – { victory, rounds, heroHP, bossHP, damageDealt, damageTaken }
     */
    simulateBattle(boss, heroStats = null) {
        const stats = heroStats || this._heroService.getCombatStats();
        const cacheKey = this._getCacheKey(boss, stats);

        // Cache-Check
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        const heroDamageMultiplier = this._heroService._hero.unlockedSkills.includes('warrior_2') ? 1.2 : 1;

        const bossDamageReduction = boss.defense / (boss.defense + 100);
        const baseHeroDamage = (stats.attack * heroDamageMultiplier) * (1 - bossDamageReduction);
        const expectedHeroDamage = Math.max(1, baseHeroDamage * (1 + (stats.critChance / 100) * ((stats.critDamage / 100) - 1)));

        const baseBossDamage = boss.attack * (1 - stats.damageReduction);
        const expectedBossDamage = Math.max(1, baseBossDamage * (1 - (stats.dodgeChance / 100)));

        const roundsToKillBoss = Math.ceil(boss.hp / expectedHeroDamage);
        const roundsToKillHero = Math.ceil(stats.maxHp / expectedBossDamage);

        const victory = roundsToKillBoss <= roundsToKillHero;
        const rounds = victory ? roundsToKillBoss : roundsToKillHero;

        const result = {
            victory,
            rounds,
            heroHP: victory ? Math.max(0, Math.floor(stats.maxHp - (rounds * expectedBossDamage))) : 0,
            bossHP: victory ? 0 : Math.max(0, Math.floor(boss.hp - (rounds * expectedHeroDamage))),
            damageDealt: Math.floor(rounds * expectedHeroDamage),
            damageTaken: Math.floor(rounds * expectedBossDamage)
        };

        // Cache
        this._cache.set(cacheKey, result);
        if (this._cache.size > this._maxCacheSize) {
            const firstKey = this._cache.keys().next().value;
            this._cache.delete(firstKey);
        }

        return result;
    }

    _getCacheKey(boss, stats) {
        return `${boss.id}|${boss.hp}|${boss.attack}|${boss.defense}|${stats.attack}|${stats.defense}|${stats.agility}|${stats.stamina}|${stats.critChance}|${stats.dodgeChance}`;
    }

    /**
     * Validiert, ob der Held einen Boss besiegen kann.
     */
    canDefeatBoss(boss) {
        const result = this.simulateBattle(boss);
        return result.victory;
    }

    /**
     * Cache zurücksetzen (z.B. bei Equipment-Änderungen).
     */
    invalidateCache() {
        this._cache.clear();
    }

    /**
     * Gibt die Cache-Größe zurück.
     */
    getCacheSize() {
        return this._cache.size;
    }
}