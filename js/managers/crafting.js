// --- START OF FILE managers/crafting.js ---

import { EVENTS } from '../core/events.js';
import { Item } from '../models/item.js';
import { MASTER_RECIPES } from '../data/crafting_recipes.js';
import RNG from '../utils/rng.js';

export default class CraftingManager {
    constructor(context) {
        this.eventBus = context.eventBus;
        this.hero = context.hero;
        this.resourceManager = context.resourceManager;
        this.clanManager = context.clanManager;
        this.forgeManager = context.forgeManager;

        this.craftingLevel = 0;
        this.craftingExp = 0;
        this.craftingExpToNext = 100;
        this.unlockedRecipes = ['basic_weapon', 'basic_armor'];
        this.autoOrders = [];

        // Binde Event-Handler
        this._onBossDefeated = this._onBossDefeated.bind(this);
        this._onPrestige = this._onPrestige.bind(this);
        this._onTick = this._onTick.bind(this);

        this.eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, this._onBossDefeated);
        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige);
        this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, this._onTick);
    }

    _onBossDefeated(data) {
        const boss = data.boss;
        const recipes = Object.values(MASTER_RECIPES).filter(r => r.unlockBoss === boss.id);
        recipes.forEach(r => {
            if (!this.unlockedRecipes.includes(r.id)) {
                this.unlockedRecipes.push(r.id);
                this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🔓 Neues Meister-Rezept: ${r.name}`, type: 'event' });
            }
        });
    }

    _onPrestige() {
        // Rezepte bleiben erhalten
    }

    getCraftingLevel() { return this.craftingLevel; }

    addCraftingExp(amount) {
        this.craftingExp += amount;
        while (this.craftingExp >= this.craftingExpToNext) {
            this.craftingExp -= this.craftingExpToNext;
            this.craftingLevel++;
            this.craftingExpToNext = Math.floor(this.craftingExpToNext * 1.2);
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🛠️ Handwerks-Skill auf Stufe ${this.craftingLevel} gestiegen!`, type: 'event' });
        }
        this.eventBus.publish(EVENTS.HERO_UPDATED);
    }

    _calculateQuality(baseQuality = 50) {
        let quality = baseQuality + (RNG.random() - 0.5) * 30;
        quality += this.craftingLevel * 1.0;
        if (this.hero.unlockedSkills.includes('master_crafter')) {
            quality += 15;
        }
        const critChance = 5 + this.craftingLevel * 0.5;
        if (RNG.random() * 100 < critChance) {
            quality *= 1.5;
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `✨ Kritischer Erfolg! Qualität verdoppelt!`, type: 'event' });
        }
        return Math.min(100, Math.max(0, Math.floor(quality)));
    }

    getAvailableRecipes() {
        return Object.values(MASTER_RECIPES).filter(r => this.unlockedRecipes.includes(r.id));
    }

    getRecipeCost(recipe) {
        const cost = {};
        for (const [res, amount] of Object.entries(recipe.cost)) {
            cost[res] = amount;
        }
        return cost;
    }

    craftMasterRecipe(recipeId) {
        const recipe = MASTER_RECIPES[recipeId];
        if (!recipe) return { success: false, message: 'Rezept nicht gefunden.' };
        if (!this.unlockedRecipes.includes(recipeId)) {
            return { success: false, message: 'Rezept noch nicht freigeschaltet.' };
        }

        const cost = this.getRecipeCost(recipe);
        const res = this.resourceManager.getResources();

        for (const [key, amount] of Object.entries(cost)) {
            if ((res[key] || 0) < amount) {
                return { success: false, message: `Nicht genug ${key}. (${amount} benötigt)` };
            }
        }

        for (const [key, amount] of Object.entries(cost)) {
            if (key === 'particles') this.resourceManager.removeParticles(amount);
            else if (key === 'relics') this.resourceManager.removeRelics(amount);
            else if (key === 'artifacts') this.resourceManager.removeArtifacts(amount);
            else if (key === 'memoryDust') this.resourceManager.removeMemoryDust(amount);
            else if (key === 'catalyst') this.resourceManager.removeCatalyst(amount);
            else if (key === 'essence') this.resourceManager.removeEssence(amount);
        }

        const quality = this._calculateQuality(recipe.baseQuality || 50);

        if (recipe.isResourceRecipe && recipe.resourceResult) {
            for (const [key, amount] of Object.entries(recipe.resourceResult)) {
                if (key === 'catalyst') this.resourceManager.addCatalyst(amount);
                else if (key === 'essence') this.resourceManager.addEssence(amount);
            }
            this.addCraftingExp(recipe.difficulty * 3);
            this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
            this.eventBus.publish(EVENTS.CRAFTING_MASTERWORK, { recipe, quality });
            return {
                success: true,
                quality,
                message: `Erfolgreich ${recipe.resultName} hergestellt (Qualität ${quality}%)`
            };
        }

        const item = new Item(
            recipe.resultName,
            recipe.resultSlot,
            recipe.resultRarity,
            { ...recipe.baseStats },
            `Meisterwerk-Qualität: ${quality}%`,
            false,
            1
        );
        item.quality = quality;
        item.isMasterwork = true;

        const statMultiplier = 0.5 + (quality / 100) * 0.5;
        for (const key in item.stats) {
            item.stats[key] = Math.floor(item.stats[key] * statMultiplier);
        }

        if (quality >= 90 && RNG.random() < 0.3) {
            const extraStat = ['attack', 'defense', 'agility', 'stamina'][Math.floor(RNG.random() * 4)];
            item.stats[extraStat] += Math.floor(3 + quality / 10);
            item.description += ` +${extraStat} Bonus`;
        }

        this.hero.addEquipmentItem(item);

        const expGain = 10 + recipe.difficulty * 2 + Math.floor(quality / 10);
        this.addCraftingExp(expGain);

        if (recipe.unlocks) {
            recipe.unlocks.forEach(id => {
                if (!this.unlockedRecipes.includes(id)) {
                    this.unlockedRecipes.push(id);
                    this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🔓 Neues Rezept freigeschaltet: ${MASTER_RECIPES[id].name}`, type: 'event' });
                }
            });
        }

        this.eventBus.publish(EVENTS.FORGE_CRAFTED, { recipe, item, quality });
        this.eventBus.publish(EVENTS.CRAFTING_MASTERWORK, { recipe, item, quality });
        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.RESOURCES_UPDATED);

        return {
            success: true,
            item,
            quality,
            message: `${item.name} (Qualität ${quality}%) hergestellt!`
        };
    }

    salvageToCatalyst(item) {
        let catalystGain = 0;
        if (item.rarity === 'epic') catalystGain = 2 + Math.floor(item.level / 2);
        else if (item.rarity === 'legendary') catalystGain = 5 + item.level;
        else return { success: false, message: 'Nur epische oder legendäre Items können zu Katalysator zerlegt werden.' };

        this.resourceManager.addCatalyst(catalystGain);
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `⚗️ ${item.name} zerlegt → +${catalystGain} Katalysator`, type: 'event' });
        return { success: true, catalystGain };
    }

    _onTick({ delta }) {
        if (this.hero.unlockedSkills.includes('auto_craft')) {
            this.resourceManager.addParticles(delta / 10000);
            this.resourceManager.addCatalyst(delta / 100000);
        }
    }

    toJSON() {
        return {
            craftingLevel: this.craftingLevel,
            craftingExp: this.craftingExp,
            craftingExpToNext: this.craftingExpToNext,
            unlockedRecipes: this.unlockedRecipes,
            autoOrders: this.autoOrders
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.craftingLevel = data.craftingLevel || 0;
        this.craftingExp = data.craftingExp || 0;
        this.craftingExpToNext = data.craftingExpToNext || 100;
        this.unlockedRecipes = data.unlockedRecipes || ['basic_weapon', 'basic_armor'];
        this.autoOrders = data.autoOrders || [];
    }
}