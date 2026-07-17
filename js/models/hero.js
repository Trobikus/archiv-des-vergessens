// ============================================================
// FILE: js/models/hero.js – Zentrales Heldenmodell
// ============================================================
import { Item } from './item.js';
import { PRESTIGE_ITEMS } from '../data/items.js';
import { generateStoryBosses } from '../data/bosses.js';
import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';
import { Sanitizer } from '../core/security.js';

export default class Hero {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.name = 'Der Mneme-Bund';
        this.level = 1;
        this.experience = 0;
        this.expToNext = CONFIG.HERO.BASE_EXP_TO_NEXT;

        this.baseStats = { attack: 5, defense: 3, agility: 4, stamina: 6 };
        this.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
        this.unspentStatPoints = 0;

        // 13 Equipment-Slots (AAA-RPG)
        this.equipment = {
            weapon: null,
            shield: null,
            helmet: null,
            shoulders: null,
            armor: null,
            gloves: null,
            belt: null,
            boots: null,
            amulet: null,
            ring: null,
            ring2: null
        };
        this._inventory = { equipment: [], loot: [] };

        this.bossProgress = 0;
        this.defeatedBosses = [];
        this.prestigeLevel = 0;
        this.prestigePoints = 0;
        this.unlockedSkills = [];
        this.clickPowerLevel = 0;

        // Flags für Achievements
        this._bossNoEquipmentWins = 0;
        this._craftedRecipeCount = 0;
        this._successfulExpeditions = 0;
        this.titles = [];
        this.title = '';

        this._prestigeStartTime = Date.now();
        this._lastLevelUpTime = Date.now();

        // Cache für Stats (Performance)
        this._statsCache = null;
        this._combatStatsCache = null;
        this._statsDirty = true;

        // Maximalwerte (Sicherheit)
        this.MAX_LEVEL = 9999;
        this.MAX_BOSS_PROGRESS = 200;
        this.MAX_PRESTIGE_LEVEL = 999;

        // Event-Subscriptions
        if (this.eventBus) {
            this.eventBus.subscribe(EVENTS.CMD_HERO_ADD_BASE_STAT, this._onAddBaseStat.bind(this));
            this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._markDirty());
            this.eventBus.subscribe(EVENTS.FORGE_CRAFTED, () => this._markDirty());
            this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => this._markDirty());
        }
    }

    // ---- INTERNE HELFER ----
    _markDirty() {
        this._statsDirty = true;
        this._statsCache = null;
        this._combatStatsCache = null;
    }

    _clamp(value, min, max) {
        return Sanitizer.clamp(value, min, max);
    }

    // ---- BASIS-STATS & LEVEL ----
    _onAddBaseStat(data) {
        if (this.baseStats[data.stat] !== undefined) {
            const amount = Sanitizer.sanitizeNumber(data.amount, 0);
            this.baseStats[data.stat] += amount;
            this._markDirty();
            this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
    }

    addExperience(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0) return;
        this.experience += safeAmount;

        while (this.experience >= this.expToNext && this.level < this.MAX_LEVEL) {
            this.experience -= this.expToNext;
            this.level++;
            this.unspentStatPoints += CONFIG.HERO.STAT_POINTS_PER_LEVEL;
            this.expToNext = Math.floor(this.expToNext * CONFIG.HERO.EXP_MULTIPLIER);
            this._lastLevelUpTime = Date.now();
            this._markDirty();
        }
        if (this.level >= this.MAX_LEVEL) {
            this.experience = 0;
            this.expToNext = Infinity;
        }
    }

    spendStatPoint(statKey) {
        if (this.unspentStatPoints > 0 && this.spentStats[statKey] !== undefined) {
            this.spentStats[statKey]++;
            this.unspentStatPoints--;
            this._markDirty();
            this.eventBus.publish(EVENTS.HERO_UPDATED);
            return true;
        }
        return false;
    }

    getLevelProgress() {
        if (this.expToNext === Infinity) return 100;
        return (this.experience / this.expToNext) * 100;
    }

    // ---- STATS & KAMPF ----
    getStats() {
        if (!this._statsDirty && this._statsCache) {
            return this._statsCache;
        }

        const stats = {
            attack: this.baseStats.attack + this.spentStats.attack,
            defense: this.baseStats.defense + this.spentStats.defense,
            agility: this.baseStats.agility + this.spentStats.agility,
            stamina: this.baseStats.stamina + this.spentStats.stamina
        };

        const setCounts = {};
        for (const slot of Object.values(this.equipment)) {
            if (slot) {
                if (slot.stats.attack) stats.attack += slot.stats.attack;
                if (slot.stats.defense) stats.defense += slot.stats.defense;
                if (slot.stats.agility) stats.agility += slot.stats.agility;
                if (slot.stats.stamina) stats.stamina += slot.stats.stamina;
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
        if (this.unlockedSkills.includes('warrior_1')) {
            stats.attack += Math.floor(stats.attack * 0.1);
        }

        this._statsCache = stats;
        return stats;
    }

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
        this._statsDirty = false;
        return combatStats;
    }

    getTotalPower() {
        const s = this.getStats();
        return s.attack + s.defense + s.agility + s.stamina;
    }

    // ---- AUSRÜSTUNG & INVENTAR ----
    get inventory() {
        return this._inventory;
    }

    equipItem(item, targetSlot = null, hasPacifistRing = false) {
        if (!item || !item.slot) return false;
        let slotToEquip = targetSlot || item.slot;

        // Ring-Slot-Automatik
        if (item.slot === 'ring' && !targetSlot) {
            if (!this.equipment.ring) slotToEquip = 'ring';
            else if (hasPacifistRing && !this.equipment.ring2) slotToEquip = 'ring2';
            else slotToEquip = 'ring';
        }

        if (!this.equipment.hasOwnProperty(slotToEquip)) return false;

        const oldItem = this.equipment[slotToEquip];
        if (oldItem) this._inventory.equipment.push(oldItem);
        this.equipment[slotToEquip] = item;
        this._markDirty();
        return true;
    }

    unequipItem(slot) {
        if (!this.equipment.hasOwnProperty(slot)) return null;
        const item = this.equipment[slot];
        if (item) {
            this.equipment[slot] = null;
            this._inventory.equipment.push(item);
            this._markDirty();
            return item;
        }
        return null;
    }

    getEquippedItem(slot) {
        return this.equipment[slot] || null;
    }

    addEquipmentItem(item) {
        if (!item) return false;
        this._inventory.equipment.push(item);
        this._markDirty();
        return true;
    }

    addLootItem(item) {
        if (!item) return false;
        this._inventory.loot.push(item);
        return true;
    }

    removeEquipmentItem(index) {
        const item = (index < 0 || index >= this._inventory.equipment.length)
            ? null
            : this._inventory.equipment.splice(index, 1)[0];
        if (item) this._markDirty();
        return item;
    }

    removeLootItem(index) {
        if (index < 0 || index >= this._inventory.loot.length) return null;
        return this._inventory.loot.splice(index, 1)[0];
    }

    removeEquipmentItemByRef(item) {
        const index = this._inventory.equipment.indexOf(item);
        if (index !== -1) {
            this._inventory.equipment.splice(index, 1);
            this._markDirty();
            return item;
        }
        return null;
    }

    removeLootItemByRef(item) {
        const index = this._inventory.loot.indexOf(item);
        if (index !== -1) return this._inventory.loot.splice(index, 1)[0];
        return null;
    }

    sellLootItem(index, resourceManager) {
        const item = this.removeLootItem(index);
        if (!item) return false;
        const baseValue = 5;
        const rarityBonus = { common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 };
        const value = baseValue + (rarityBonus[item.rarity] || 0);
        resourceManager.addParticles(value);
        return value;
    }

    // ---- STORY & PRESTIGE ----
    getChapter() {
        if (this.bossProgress === 0) return 1;
        const allBosses = generateStoryBosses();
        const boss = allBosses[Math.min(this.bossProgress, allBosses.length - 1)];
        return boss ? boss.chapter : 1;
    }

    getBossProgressText() {
        return `${this.bossProgress} / ${generateStoryBosses().length}`;
    }

    getPrestigeBonus(type) {
        if (this.prestigeLevel <= 0) return 0;
        switch (type) {
            case 'particleStart': return CONFIG.HERO.PRESTIGE_PARTICLE_BONUS * this.prestigeLevel;
            case 'jobRate': return CONFIG.HERO.PRESTIGE_JOB_RATE_BONUS * this.prestigeLevel;
            case 'relicChance': return CONFIG.HERO.PRESTIGE_RELIC_CHANCE_BONUS * this.prestigeLevel;
            default: return 0;
        }
    }

    getPrestigeBonusPercent(type) {
        if (type === 'jobRate') return this.getPrestigeBonus('jobRate');
        if (type === 'relicChance') return this.getPrestigeBonus('relicChance');
        return this.getPrestigeBonus(type);
    }

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

    performPrestigeReset(resourceManager, clanManager = null) {
        if (this.bossProgress < generateStoryBosses().length) {
            return { success: false, message: 'Verewigung erst nach dem letzten Boss möglich.' };
        }

        const timeSinceLastPrestige = (Date.now() - this._prestigeStartTime) / 1000;

        this.prestigeLevel = Math.min(this.prestigeLevel + 1, this.MAX_PRESTIGE_LEVEL);
        this.prestigePoints += 1;
        this.level = 1;
        this.experience = 0;
        this.expToNext = CONFIG.HERO.BASE_EXP_TO_NEXT;
        this.unspentStatPoints = 0;
        this.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
        this.equipment = {
            weapon: null, shield: null, helmet: null, shoulders: null,
            armor: null, gloves: null, belt: null, boots: null,
            amulet: null, ring: null, ring2: null
        };
        this._inventory = { equipment: [], loot: [] };
        this.bossProgress = 0;
        this.defeatedBosses = [];
        this.clickPowerLevel = 0;

        this._prestigeStartTime = Date.now();
        this._markDirty();

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
        if (clanManager) {
            clanManager.fromJSON({ members: [], nextId: 10, expeditionStatus: [] });
        }

        if (this.eventBus) {
            this.eventBus.publish(EVENTS.HERO_PRESTIGE, {
                prestigeLevel: this.prestigeLevel,
                timeSinceLastPrestige: timeSinceLastPrestige
            });
            this.eventBus.publish(EVENTS.HERO_UPDATED);
            this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
            this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: clanManager ? clanManager.members : [] });
            this.eventBus.publish(EVENTS.UI_ADD_LOG, {
                text: `🌌 Dein Held wurde verewigt (Prestige Stufe ${this.prestigeLevel}).`,
                type: 'event'
            });
            this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
        }

        return {
            success: true,
            message: `Dein Held wurde verewigt. Prestige Stufe ${this.prestigeLevel} erreicht.`
        };
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
            equipment: {
                weapon: this.equipment.weapon ? this.equipment.weapon.toJSON() : null,
                shield: this.equipment.shield ? this.equipment.shield.toJSON() : null,
                helmet: this.equipment.helmet ? this.equipment.helmet.toJSON() : null,
                shoulders: this.equipment.shoulders ? this.equipment.shoulders.toJSON() : null,
                armor: this.equipment.armor ? this.equipment.armor.toJSON() : null,
                gloves: this.equipment.gloves ? this.equipment.gloves.toJSON() : null,
                belt: this.equipment.belt ? this.equipment.belt.toJSON() : null,
                boots: this.equipment.boots ? this.equipment.boots.toJSON() : null,
                amulet: this.equipment.amulet ? this.equipment.amulet.toJSON() : null,
                ring: this.equipment.ring ? this.equipment.ring.toJSON() : null,
                ring2: this.equipment.ring2 ? this.equipment.ring2.toJSON() : null
            },
            inventory: {
                equipment: this._inventory.equipment.map(item => item.toJSON()),
                loot: this._inventory.loot.map(item => item.toJSON())
            },
            bossProgress: this.bossProgress,
            defeatedBosses: [...this.defeatedBosses],
            prestigeLevel: this.prestigeLevel,
            prestigePoints: this.prestigePoints,
            _bossNoEquipmentWins: this._bossNoEquipmentWins || 0,
            _craftedRecipeCount: this._craftedRecipeCount || 0,
            _successfulExpeditions: this._successfulExpeditions || 0,
            titles: this.titles || [],
            title: this.title || '',
            unlockedSkills: this.unlockedSkills,
            clickPowerLevel: this.clickPowerLevel || 0,
            _prestigeStartTime: this._prestigeStartTime,
            _lastLevelUpTime: this._lastLevelUpTime
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
        if (data.equipment) {
            const slots = ['weapon', 'shield', 'helmet', 'shoulders', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring', 'ring2'];
            for (const slot of slots) {
                this.equipment[slot] = data.equipment[slot] ? Item.fromJSON(data.equipment[slot]) : null;
            }
        }
        if (data.inventory) {
            this._inventory.equipment = (Array.isArray(data.inventory.equipment) ? data.inventory.equipment : [])
                .map(i => Item.fromJSON(i));
            this._inventory.loot = (Array.isArray(data.inventory.loot) ? data.inventory.loot : [])
                .map(i => Item.fromJSON(i));
        }

        this.bossProgress = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.bossProgress, 0), 0, this.MAX_BOSS_PROGRESS);
        this.defeatedBosses = Sanitizer.sanitizeArray(data.defeatedBosses, []);
        this.prestigeLevel = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.prestigeLevel, 0), 0, this.MAX_PRESTIGE_LEVEL);
        this.prestigePoints = Sanitizer.sanitizeNumber(data.prestigePoints, 0);
        this._bossNoEquipmentWins = Sanitizer.sanitizeNumber(data._bossNoEquipmentWins, 0);
        this._craftedRecipeCount = Sanitizer.sanitizeNumber(data._craftedRecipeCount, 0);
        this._successfulExpeditions = Sanitizer.sanitizeNumber(data._successfulExpeditions, 0);
        this.titles = Sanitizer.sanitizeArray(data.titles, []);
        this.title = Sanitizer.sanitizeString(data.title, 50, '');
        this.unlockedSkills = Sanitizer.sanitizeArray(data.unlockedSkills, []);
        this.clickPowerLevel = Sanitizer.sanitizeNumber(data.clickPowerLevel, 0);

        this._prestigeStartTime = data._prestigeStartTime || Date.now();
        this._lastLevelUpTime = data._lastLevelUpTime || Date.now();
        this._markDirty();
    }
}