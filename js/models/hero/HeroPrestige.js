// ============================================================
// FILE: models/hero/HeroPrestige.js – Prestige-Logik
// ============================================================

import { CONFIG } from '../../core/di/config.js';
import { PRESTIGE_ITEMS } from '../../data/items.js';
import { generateStoryBosses } from '../../data/bosses.js';
import { EVENTS } from '../../core/events.js';
import { Sanitizer } from '../../core/security.js';

/**
 * Verwaltet Prestige, Boni und die damit verbundenen Reset-Logiken.
 */
export class HeroPrestige {
    constructor(hero, eventBus) {
        this._hero = hero;
        this._eventBus = eventBus;
        this.prestigeLevel = 0;
        this.prestigePoints = 0;
        this.bossProgress = 0;
        this.defeatedBosses = [];
        this._prestigeStartTime = Date.now();
        this.MAX_PRESTIGE_LEVEL = 999;
        this.MAX_BOSS_PROGRESS = 200;
    }

    /**
     * Gibt das aktuelle Kapitel basierend auf dem Boss-Fortschritt zurück.
     */
    getChapter() {
        if (this.bossProgress === 0) return 1;
        const allBosses = generateStoryBosses();
        const boss = allBosses[Math.min(this.bossProgress, allBosses.length - 1)];
        return boss ? boss.chapter : 1;
    }

    /**
     * Textuelle Anzeige des Boss-Fortschritts.
     */
    getBossProgressText() {
        return `${this.bossProgress} / ${generateStoryBosses().length}`;
    }

    /**
     * Berechnet den Prestige-Bonus für einen bestimmten Typ.
     */
    getPrestigeBonus(type) {
        if (this.prestigeLevel <= 0) return 0;
        switch (type) {
            case 'particleStart':
                return CONFIG.HERO.PRESTIGE_PARTICLE_BONUS * this.prestigeLevel;
            case 'jobRate':
                return CONFIG.HERO.PRESTIGE_JOB_RATE_BONUS * this.prestigeLevel;
            case 'relicChance':
                return CONFIG.HERO.PRESTIGE_RELIC_CHANCE_BONUS * this.prestigeLevel;
            default:
                return 0;
        }
    }

    /**
     * Gibt den Bonus als Prozent zurück (für UI).
     */
    getPrestigeBonusPercent(type) {
        if (type === 'jobRate') return this.getPrestigeBonus('jobRate');
        if (type === 'relicChance') return this.getPrestigeBonus('relicChance');
        return this.getPrestigeBonus(type);
    }

    /**
     * Liefert die durch Prestige freigeschalteten Items.
     */
    getUnlockedPrestigeItems() {
        return PRESTIGE_ITEMS
            .filter(item => this.prestigeLevel >= item.level)
            .map(item => new Item(
                item.name,
                item.slot,
                item.rarity,
                { ...item.stats },
                item.desc,
                false
            ));
    }

    /**
     * Führt die Verewigung (Prestige-Reset) durch.
     * @param {object} resourceManager – ResourceManager für Reset der Ressourcen
     * @param {object} clanManager – ClanManager für Reset der Mitglieder
     * @returns {object} – { success, message }
     */
    performPrestigeReset(resourceManager, clanManager = null) {
        const totalBosses = generateStoryBosses().length;
        if (this.bossProgress < totalBosses) {
            return { success: false, message: 'Verewigung erst nach dem letzten Boss möglich.' };
        }

        const timeSinceLastPrestige = (Date.now() - this._prestigeStartTime) / 1000;

        this.prestigeLevel = Math.min(this.prestigeLevel + 1, this.MAX_PRESTIGE_LEVEL);
        this.prestigePoints += 1;

        // Hero-Reset (Level, XP, Stats)
        const hero = this._hero;
        hero.level = 1;
        hero.experience = 0;
        hero.expToNext = CONFIG.HERO.BASE_EXP_TO_NEXT;
        hero.unspentStatPoints = 0;
        hero.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
        hero.clickPowerLevel = 0;

        // Equipment zurücksetzen (über Equipment-Modul)
        if (hero._equipment) {
            hero._equipment.equipment = {
                weapon: null, shield: null, helmet: null, shoulders: null,
                armor: null, gloves: null, belt: null, boots: null,
                amulet: null, ring: null, ring2: null
            };
            hero._equipment._inventory = { equipment: [], loot: [] };
            hero._equipment._markDirty();
        }

        this.bossProgress = 0;
        this.defeatedBosses = [];
        this._prestigeStartTime = Date.now();

        // Ressourcen zurücksetzen
        if (resourceManager) {
            const startParticles = this.getPrestigeBonus('particleStart');
            resourceManager.fromJSON({
                particles: startParticles,
                relics: 0,
                artifacts: 0,
                memoryDust: resourceManager.memoryDust || 0,
                timeBank: 0,
                catalyst: 0,
                essence: 0
            });
        }

        // Clan zurücksetzen
        if (clanManager) {
            clanManager.fromJSON({ members: [], nextId: 10, expeditionStatus: [] });
        }

        // Events auslösen
        if (this._eventBus) {
            this._eventBus.publish(EVENTS.HERO_PRESTIGE, {
                prestigeLevel: this.prestigeLevel,
                timeSinceLastPrestige: timeSinceLastPrestige
            });
            this._eventBus.publish(EVENTS.HERO_UPDATED);
            this._eventBus.publish(EVENTS.RESOURCES_UPDATED);
            this._eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: clanManager ? clanManager.members : [] });
            this._eventBus.publish(EVENTS.UI_ADD_LOG, {
                text: `🌌 Dein Held wurde verewigt (Prestige Stufe ${this.prestigeLevel}).`,
                type: 'event'
            });
            this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
        }

        return {
            success: true,
            message: `Dein Held wurde verewigt. Prestige Stufe ${this.prestigeLevel} erreicht.`
        };
    }

    // ---- PERSISTENZ ----

    toJSON() {
        return {
            bossProgress: this.bossProgress,
            defeatedBosses: [...this.defeatedBosses],
            prestigeLevel: this.prestigeLevel,
            prestigePoints: this.prestigePoints,
            _prestigeStartTime: this._prestigeStartTime
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.bossProgress = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.bossProgress, 0), 0, this.MAX_BOSS_PROGRESS);
        this.defeatedBosses = Sanitizer.sanitizeArray(data.defeatedBosses, []);
        this.prestigeLevel = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.prestigeLevel, 0), 0, this.MAX_PRESTIGE_LEVEL);
        this.prestigePoints = Sanitizer.sanitizeNumber(data.prestigePoints, 0);
        this._prestigeStartTime = data._prestigeStartTime || Date.now();
    }
}