// ============================================================
// FILE: js/managers/forge.js
// ============================================================
import { Item } from '../models/item.js';
import { FORGE_RECIPES } from '../data/recipes.js';
import { EVENTS } from '../core/events.js';
import RNG from '../utils/rng.js';
import { Sanitizer } from '../core/security.js';

export default class ForgeManager {
    constructor(eventBus, hero, resourceManager) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.resourceManager = resourceManager;
        this.libraryManager = null;

        this.eventBus.subscribe(EVENTS.CMD_FORGE_SALVAGE, this._onSalvageCommand.bind(this));
    }

    getRecipes() {
        return FORGE_RECIPES;
    }

    getRecipeCost(recipe) {
        let multiplier = this.hero.unlockedSkills.includes('scholar_1') ? 0.9 : 1;
        if (this.libraryManager) {
            multiplier -= this.libraryManager.getBonus('forge_discount');
        }
        multiplier = Math.max(0.1, multiplier);

        return {
            particles: recipe.cost.particles ? Math.floor(recipe.cost.particles * multiplier) : 0,
            relics: recipe.cost.relics ? Math.floor(recipe.cost.relics * multiplier) : 0,
            artifacts: recipe.cost.artifacts ? Math.floor(recipe.cost.artifacts * multiplier) : 0
        };
    }

    craft(recipeId) {
        const recipe = FORGE_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return { success: false, message: 'Rezept nicht gefunden.' };
        if (recipe.unlockLevel && this.hero.prestigeLevel < recipe.unlockLevel) {
            return { success: false, message: 'Dieses Rezept ist nur über Prestige verfügbar.' };
        }

        const res = this.resourceManager.getResources();
        const cost = this.getRecipeCost(recipe);

        if ((cost.particles && res.particles < cost.particles) ||
            (cost.relics && res.relics < cost.relics) ||
            (cost.artifacts && res.artifacts < cost.artifacts)) {
            return { success: false, message: 'Nicht genügend Ressourcen für dieses Rezept.' };
        }

        if (cost.particles) this.resourceManager.removeParticles(cost.particles);
        if (cost.relics) this.resourceManager.removeRelics(cost.relics);
        if (cost.artifacts) this.resourceManager.removeArtifacts(cost.artifacts);

        const roll = RNG.next();
        let rarity = 'common';
        let statMult = 1.0;
        const isMasterpiece = recipe.id === 'craft_master';

        if (roll > (isMasterpiece ? 0.85 : 0.96)) { rarity = 'legendary'; statMult = 4.0; }
        else if (roll > (isMasterpiece ? 0.60 : 0.85)) { rarity = 'epic'; statMult = 2.8; }
        else if (roll > (isMasterpiece ? 0.30 : 0.65)) { rarity = 'rare'; statMult = 1.8; }
        else if (roll > (isMasterpiece ? 0.00 : 0.40)) { rarity = 'uncommon'; statMult = 1.3; }

        const slots = ['weapon', 'armor', 'amulet', 'ring'];
        const finalSlot = recipe.slot === 'random' ? slots[Math.floor(RNG.next() * slots.length)] : recipe.slot;

        let stats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
        const basePower = isMasterpiece ? 8 : 4;
        const power = Math.floor(basePower * statMult) + Math.floor(RNG.next() * 3);

        if (finalSlot === 'weapon') {
            stats.attack = power + 2;
            if (RNG.next() > 0.5) stats.agility = Math.floor(power / 2);
        } else if (finalSlot === 'armor') {
            stats.defense = power + 2;
            if (RNG.next() > 0.5) stats.stamina = Math.floor(power / 2);
        } else if (finalSlot === 'amulet') {
            stats.attack = Math.floor(power / 1.5);
            stats.stamina = Math.floor(power / 1.5);
        } else if (finalSlot === 'ring') {
            stats.defense = Math.floor(power / 1.5);
            stats.agility = Math.floor(power / 1.5);
        }

        let newItem;
        if (recipe.id === 'craft_prestige') {
            const prestigeItems = this.hero.getUnlockedPrestigeItems();
            const selected = prestigeItems[Math.floor(RNG.next() * prestigeItems.length)];
            if (!selected) return { success: false, message: 'Keine Prestige-Gegenstände verfügbar.' };
            newItem = new Item(selected.name, selected.slot, selected.rarity, { ...selected.baseStats }, selected.description, false, 1);
        } else {
            const prefixes = { common: 'Einfacher ', uncommon: 'Guter ', rare: 'Verstärkter ', epic: 'Meisterhafter ', legendary: 'Göttlicher ' };
            const baseNames = { weapon: 'Schmiede-Stahl', armor: 'Schmiede-Panzer', amulet: 'Schmiede-Kristall', ring: 'Schmiede-Reif' };
            const itemName = prefixes[rarity] + baseNames[finalSlot];
            newItem = new Item(itemName, finalSlot, rarity, stats, 'Ein Werk aus der Artefakt-Schmiede.', false, 1);
        }

        if (rarity === 'common' && this.hero.unlockedSkills.includes('auto_salvage')) {
            const dustAmount = 1 * newItem.level;
            this.resourceManager.addMemoryDust(dustAmount);
            this.hero._craftedRecipeCount = (this.hero._craftedRecipeCount || 0) + 1;
            this.eventBus.publish(EVENTS.FORGE_CRAFTED, { recipe, item: newItem });
            this.eventBus.publish(EVENTS.HERO_UPDATED);
            return { success: true, item: newItem, message: `Automatisch zu Staub verwertet: ${newItem.name}` };
        }

        this.hero.addEquipmentItem(newItem);
        this.hero._craftedRecipeCount = (this.hero._craftedRecipeCount || 0) + 1;
        this.eventBus.publish(EVENTS.FORGE_CRAFTED, { recipe, item: newItem });
        this.eventBus.publish(EVENTS.HERO_UPDATED);

        return { success: true, item: newItem, message: `Erfolgreich geschmiedet: ${newItem.name} (${newItem.getRarityLabel()})` };
    }

    _onSalvageCommand(data) {
        const { index, isLoot } = data;
        const item = isLoot ? this.hero.removeLootItem(index) : this.hero.removeEquipmentItem(index);
        if (!item) return;

        const dustAmounts = { common: 1, uncommon: 3, rare: 10, epic: 25, legendary: 100 };
        const amount = (dustAmounts[item.rarity] || 1) * item.level;
        this.resourceManager.addMemoryDust(amount);

        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `${item.name} verwertet. +${amount} Erinnerungsstaub.`, type: 'event' });
    }

    upgradeEquipped(slot) {
        const item = this.hero.equipment[slot];
        if (!item) return { success: false, message: 'Kein Item ausgerüstet.' };
        if (item.level >= 10) return { success: false, message: 'Maximales Level erreicht.' };

        const cost = item.level * 10 * (item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 3 : item.rarity === 'rare' ? 2 : 1);
        if (this.resourceManager.memoryDust < cost) return { success: false, message: `Nicht genug Staub (${cost} benötigt).` };

        this.resourceManager.removeMemoryDust(cost);
        item.level++;
        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
        return { success: true, message: `${item.name} auf Level ${item.level} aufgewertet!` };
    }

    toJSON() { return {}; }
    fromJSON(data) {}
}