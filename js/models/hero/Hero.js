// ============================================================
// FILE: models/hero/Hero.js – Zentrales Heldenmodell (aggregiert)
// ============================================================

import { CONFIG } from '../../core/di/config.js';
import { EVENTS } from '../../core/events.js';
import { Sanitizer } from '../../core/security.js';
import { HeroStats } from './HeroStats.js';
import { HeroEquipment } from './HeroEquipment.js';
import { HeroPrestige } from './HeroPrestige.js';

export default class Hero {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // ---- Basis-Daten ----
        this.name = 'Der Mneme-Bund';
        this.level = 1;
        this.experience = 0;
        this.expToNext = CONFIG.HERO.BASE_EXP_TO_NEXT;

        // ---- Attribute & Stat-Punkte ----
        this.baseStats = { attack: 5, defense: 3, agility: 4, stamina: 6 };
        this.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
        this.unspentStatPoints = 0;

        // ---- Equipment & Inventar (delegiert) ----
        this._equipment = new HeroEquipment(this);

        // ---- Prestige & Story (delegiert) ----
        this._prestige = new HeroPrestige(this, eventBus);

        // ---- Stat-Berechnung (delegiert) ----
        this._stats = new HeroStats(this);

        // ---- Weitere Daten ----
        this.unlockedSkills = [];
        this.clickPowerLevel = 0;
        this.titles = [];
        this.title = '';

        // ---- Flags für Achievements ----
        this._bossNoEquipmentWins = 0;
        this._craftedRecipeCount = 0;
        this._successfulExpeditions = 0;

        // ---- Maximalwerte (Sicherheit) ----
        this.MAX_LEVEL = 9999;

        // ---- Event-Subscriptions ----
        if (this.eventBus) {
            this.eventBus.subscribe(EVENTS.CMD_HERO_ADD_BASE_STAT, this._onAddBaseStat.bind(this));
            this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._stats.markDirty());
            this.eventBus.subscribe(EVENTS.FORGE_CRAFTED, () => this._stats.markDirty());
            this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => this._stats.markDirty());
        }
    }

    // ---- DELEGATION: Equipment ----

    get equipment() { return this._equipment.equipment; }
    get inventory() { return this._equipment.inventory; }

    equipItem(item, targetSlot, hasPacifistRing) {
        return this._equipment.equipItem(item, targetSlot, hasPacifistRing);
    }
    unequipItem(slot) { return this._equipment.unequipItem(slot); }
    getEquippedItem(slot) { return this._equipment.getEquippedItem(slot); }
    addEquipmentItem(item) { return this._equipment.addEquipmentItem(item); }
    addLootItem(item) { return this._equipment.addLootItem(item); }
    removeEquipmentItem(index) { return this._equipment.removeEquipmentItem(index); }
    removeLootItem(index) { return this._equipment.removeLootItem(index); }
    removeEquipmentItemByRef(item) { return this._equipment.removeEquipmentItemByRef(item); }
    removeLootItemByRef(item) { return this._equipment.removeLootItemByRef(item); }
    sellLootItem(index, resourceManager) {
        return this._equipment.sellLootItem(index, resourceManager);
    }

    // ---- DELEGATION: Stats ----

    getStats() { return this._stats.getStats(); }
    getCombatStats() { return this._stats.getCombatStats(); }
    getTotalPower() { return this._stats.getTotalPower(); }
    getLevelProgress() { return this._stats.getLevelProgress(); }

    // ---- DELEGATION: Prestige ----

    get prestigeLevel() { return this._prestige.prestigeLevel; }
    get prestigePoints() { return this._prestige.prestigePoints; }
    get bossProgress() { return this._prestige.bossProgress; }
    get defeatedBosses() { return this._prestige.defeatedBosses; }

    set bossProgress(val) { this._prestige.bossProgress = val; }
    set defeatedBosses(val) { this._prestige.defeatedBosses = val; }
    set prestigeLevel(val) { this._prestige.prestigeLevel = val; }
    set prestigePoints(val) { this._prestige.prestigePoints = val; }

    getChapter() { return this._prestige.getChapter(); }
    getBossProgressText() { return this._prestige.getBossProgressText(); }
    getPrestigeBonus(type) { return this._prestige.getPrestigeBonus(type); }
    getPrestigeBonusPercent(type) { return this._prestige.getPrestigeBonusPercent(type); }
    getUnlockedPrestigeItems() { return this._prestige.getUnlockedPrestigeItems(); }
    performPrestigeReset(resourceManager, clanManager) {
        return this._prestige.performPrestigeReset(resourceManager, clanManager);
    }

    // ---- EIGENE METHODEN: Level & Stat-Punkte ----

    addExperience(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0) return;
        this.experience += safeAmount;

        while (this.experience >= this.expToNext && this.level < this.MAX_LEVEL) {
            this.experience -= this.expToNext;
            this.level++;
            this.unspentStatPoints += CONFIG.HERO.STAT_POINTS_PER_LEVEL;
            this.expToNext = Math.floor(this.expToNext * CONFIG.HERO.EXP_MULTIPLIER);
            this._stats.markDirty();
            if (this.eventBus) {
                this.eventBus.publish(EVENTS.HERO_LEVEL_UP, { level: this.level });
            }
        }
        if (this.level >= this.MAX_LEVEL) {
            this.experience = 0;
            this.expToNext = Infinity;
        }
        this._stats.markDirty();
        if (this.eventBus) this.eventBus.publish(EVENTS.HERO_UPDATED);
    }

    spendStatPoint(statKey) {
        if (this.unspentStatPoints > 0 && this.spentStats[statKey] !== undefined) {
            this.spentStats[statKey]++;
            this.unspentStatPoints--;
            this._stats.markDirty();
            if (this.eventBus) this.eventBus.publish(EVENTS.HERO_UPDATED);
            return true;
        }
        return false;
    }

    // ---- INTERNE EVENT-HANDLER ----

    _onAddBaseStat(data) {
        if (this.baseStats[data.stat] !== undefined) {
            const amount = Sanitizer.sanitizeNumber(data.amount, 0);
            this.baseStats[data.stat] += amount;
            this._stats.markDirty();
            if (this.eventBus) this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
    }

    // ---- PERSISTENZ ----

    toJSON() {
        return {
            name: this.name,
            level: this.level,
            experience: this.experience,
            expToNext: this.expToNext,
            baseStats: { ...this.baseStats },
            spentStats: { ...this.spentStats },
            unspentStatPoints: this.unspentStatPoints,
            equipment: this._equipment.toJSON().equipment,
            inventory: this._equipment.toJSON().inventory,
            ...this._prestige.toJSON(),
            _bossNoEquipmentWins: this._bossNoEquipmentWins || 0,
            _craftedRecipeCount: this._craftedRecipeCount || 0,
            _successfulExpeditions: this._successfulExpeditions || 0,
            titles: this.titles || [],
            title: this.title || '',
            unlockedSkills: this.unlockedSkills || [],
            clickPowerLevel: this.clickPowerLevel || 0
        };
    }

    fromJSON(data) {
        if (!data) return;

        this.name = Sanitizer.sanitizeString(data.name, 50, 'Der Mneme-Bund');
        this.level = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.level, 1), 1, this.MAX_LEVEL);
        this.experience = Sanitizer.sanitizeNumber(data.experience, 0);
        this.expToNext = Math.max(1, Sanitizer.sanitizeNumber(data.expToNext, CONFIG.HERO.BASE_EXP_TO_NEXT));

        this.baseStats = Sanitizer.sanitizeObject(data.baseStats, { attack: 5, defense: 3, agility: 4, stamina: 6 });
        this.spentStats = Sanitizer.sanitizeObject(data.spentStats, { attack: 0, defense: 0, agility: 0, stamina: 0 });
        this.unspentStatPoints = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.unspentStatPoints, 0), 0, 1000);

        // Stat-Punkte plausibilisieren
        const expectedPoints = (this.level - 1) * CONFIG.HERO.STAT_POINTS_PER_LEVEL;
        const totalSpent = this.spentStats.attack + this.spentStats.defense +
                           this.spentStats.agility + this.spentStats.stamina;
        const currentTotal = this.unspentStatPoints + totalSpent;
        if (currentTotal < expectedPoints - 5) {
            this.unspentStatPoints += expectedPoints - currentTotal;
        } else if (currentTotal > expectedPoints + 5) {
            this.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
            this.unspentStatPoints = expectedPoints;
        }

        // Equipment laden
        this._equipment.fromJSON({ equipment: data.equipment, inventory: data.inventory });

        // Prestige laden
        this._prestige.fromJSON(data);

        // Weitere Daten
        this._bossNoEquipmentWins = Sanitizer.sanitizeNumber(data._bossNoEquipmentWins, 0);
        this._craftedRecipeCount = Sanitizer.sanitizeNumber(data._craftedRecipeCount, 0);
        this._successfulExpeditions = Sanitizer.sanitizeNumber(data._successfulExpeditions, 0);
        this.titles = Sanitizer.sanitizeArray(data.titles, []);
        this.title = Sanitizer.sanitizeString(data.title, 50, '');
        this.unlockedSkills = Sanitizer.sanitizeArray(data.unlockedSkills, []);
        this.clickPowerLevel = Sanitizer.sanitizeNumber(data.clickPowerLevel, 0);

        this._stats.markDirty();
    }
}