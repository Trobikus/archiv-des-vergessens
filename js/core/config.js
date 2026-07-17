// ============================================================
// FILE: js/core/config.js – Zentrale Konfiguration
// ============================================================

export const CONFIG = {
    GATHER: {
        BASE_AMOUNT: 1,
        UPGRADE_BASE_COST: 50,
        UPGRADE_COST_MULT: 1.5,
        POWER_MULT: 2,
        COOLDOWN_MS: 40
    },
    RELIC_HUNT: {
        COST: 25,
        COOLDOWN_MS: 5000,
        BASE_CHANCE: 0.4,
        LEVEL_BONUS: 0.02,
        POWER_BONUS: 0.001,
        MIN_CHANCE: 0.05,
        MAX_CHANCE: 0.95
    },
    HERO: {
        BASE_EXP_TO_NEXT: 50,
        EXP_MULTIPLIER: 1.2,
        STAT_POINTS_PER_LEVEL: 3,
        PRESTIGE_PARTICLE_BONUS: 10,
        PRESTIGE_JOB_RATE_BONUS: 2,
        PRESTIGE_RELIC_CHANCE_BONUS: 1
    },
    STORY: {
        AUTO_BOSS_INTERVAL_MS: 4000,
        BATTLE_DURATION_MS: 2500,
        BASE_EXP_REWARD: 20
    },
    CLAN: {
        TICK_RATE_MS: 10000,
        COLLECTOR_RATE: 2.0,
        WEAVER_RATE: 1.2,
        GUARDIAN_RATE: 0.8,
        EXP_PER_CYCLE: 1,
        EXP_MULTIPLIER: 1.15
    },
    SYSTEM: {
        LOGIC_TICK_MS: 100,
        SLOW_TICK_MS: 500,
        MAX_OFFLINE_MS: 12 * 60 * 60 * 1000
    }
};

// Freeze für Unveränderlichkeit
Object.freeze(CONFIG);
Object.freeze(CONFIG.GATHER);
Object.freeze(CONFIG.RELIC_HUNT);
Object.freeze(CONFIG.HERO);
Object.freeze(CONFIG.STORY);
Object.freeze(CONFIG.CLAN);
Object.freeze(CONFIG.SYSTEM);