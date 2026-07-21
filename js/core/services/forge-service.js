/**
 * ============================================================
 * FILE: core/services/forge-service.js – Artefakt-Schmiede
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Rezepte bereitstellen
 * - Crafting mit Rarity-Roll
 * - Upgrading von ausgerüsteten Items
 * - Salvage-Logik
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectResources } from '../state/selectors.js';
import { FORGE_RECIPES } from '../../data/recipes.js';
import { Item } from '../../models/item.js';
import RNG from '../../utils/rng.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */

export class ForgeService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, resourceService, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
  }

  /**
   * Gibt alle Schmiede-Rezepte zurück.
   */
  getRecipes() {
    return FORGE_RECIPES;
  }

  /**
   * Berechnet die Kosten für ein Rezept (mit Rabatten).
   */
  getRecipeCost(recipe) {
    const state = this._stateManager.getState();
    const libraryBoost = state.library.upgrades.forge_discount * 0.01;
    const discount = Math.min(0.5, 0.1 + libraryBoost);
    const multiplier = 1 - discount;

    const cost = {};
    for (const [key, amount] of Object.entries(recipe.cost)) {
      cost[key] = Math.max(1, Math.floor(amount * multiplier));
    }
    return cost;
  }

  /**
   * Schmiedet ein Item.
   */
  craft(recipeId) {
    const recipe = FORGE_RECIPES.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, message: 'Rezept nicht gefunden.' };
    }

    const state = this._stateManager.getState();
    const hero = state.hero;
    const resources = selectResources(state);

    // Prestige-Level-Prüfung
    if (recipe.unlockLevel && hero.prestige.level < recipe.unlockLevel) {
      return { success: false, message: 'Nur über Prestige freischaltbar.' };
    }

    // Kosten prüfen
    const cost = this.getRecipeCost(recipe);
    for (const [key, amount] of Object.entries(cost)) {
      if ((resources[key] || 0) < amount) {
        return { success: false, message: `Nicht genug ${key}. (${amount} benötigt)` };
      }
    }

    // Kosten abziehen
    for (const [key, amount] of Object.entries(cost)) {
      if (key === 'particles') this._resourceService.removeParticles(amount);
      else if (key === 'relics') this._resourceService.removeRelics(amount);
      // Weitere Ressourcen hier ergänzen
    }

    // Rarity rollen
    const roll = RNG.next();
    let rarity = 'common';
    let statMult = 1.0;
    const isMasterpiece = recipe.id === 'craft_master';

    if (roll > (isMasterpiece ? 0.85 : 0.96)) {
      rarity = 'legendary';
      statMult = 4.0;
    } else if (roll > (isMasterpiece ? 0.60 : 0.85)) {
      rarity = 'epic';
      statMult = 2.8;
    } else if (roll > (isMasterpiece ? 0.30 : 0.65)) {
      rarity = 'rare';
      statMult = 1.8;
    } else if (roll > (isMasterpiece ? 0.00 : 0.40)) {
      rarity = 'uncommon';
      statMult = 1.3;
    }

    // Slot bestimmen
    const slots = ['weapon', 'armor', 'amulet', 'ring'];
    const finalSlot = recipe.slot === 'random'
      ? slots[Math.floor(RNG.next() * slots.length)]
      : recipe.slot;

    // Stats generieren
    let stats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
    const basePower = isMasterpiece ? 8 : 4;
    const power = Math.floor(basePower * statMult) + Math.floor(RNG.next() * 3);

    switch (finalSlot) {
      case 'weapon':
        stats.attack = power + 2;
        if (RNG.next() > 0.5) stats.agility = Math.floor(power / 2);
        break;
      case 'armor':
        stats.defense = power + 2;
        if (RNG.next() > 0.5) stats.stamina = Math.floor(power / 2);
        break;
      case 'amulet':
        stats.attack = Math.floor(power / 1.5);
        stats.stamina = Math.floor(power / 1.5);
        break;
      case 'ring':
        stats.defense = Math.floor(power / 1.5);
        stats.agility = Math.floor(power / 1.5);
        break;
    }

    // Item erstellen
    const prefixes = {
      common: 'Einfacher ',
      uncommon: 'Guter ',
      rare: 'Verstärkter ',
      epic: 'Meisterhafter ',
      legendary: 'Göttlicher '
    };
    const baseNames = {
      weapon: 'Schmiede-Stahl',
      armor: 'Schmiede-Panzer',
      amulet: 'Schmiede-Kristall',
      ring: 'Schmiede-Reif'
    };
    const itemName = prefixes[rarity] + baseNames[finalSlot];
    const item = new Item(itemName, finalSlot, rarity, stats, 'Ein Werk der Artefakt-Schmiede.', false, 1);

    // Item zum Inventar hinzufügen (oder Auto-Salvage)
    const hasAutoSalvage = hero.unlockedSkills.includes('auto_salvage');
    if (hasAutoSalvage && rarity === 'common') {
      const dustAmount = 1 * item.level;
      this._resourceService._stateManager.dispatch(Actions.addMemoryDust(dustAmount));
      this._eventBus.publish('forge:crafted', { recipe, item, autoSalvaged: true });
      return {
        success: true,
        message: `⚙️ ${item.name} wurde automatisch zu ${dustAmount} Staub verwertet.`
      };
    }

    // Item zum Inventar hinzufügen
    this._heroService._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        inventory: {
          ...state.hero.inventory,
          equipment: [...state.hero.inventory.equipment, item.toJSON()]
        },
        _craftedRecipeCount: (state.hero._craftedRecipeCount || 0) + 1
      }
    }), 'forge/addItem');

    this._eventBus.publish('forge:crafted', { recipe, item, autoSalvaged: false });
    this._eventBus.publish('ui:showToast', {
      message: `⚒️ ${item.name} (${item.getRarityLabel()}) geschmiedet!`,
      type: 'success',
      duration: 3000
    });

    return { success: true, item, message: `${item.name} erfolgreich geschmiedet.` };
  }

  /**
   * Wertet ein ausgerüstetes Item auf.
   */
  upgradeEquipped(slot) {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const itemData = hero.equipment[slot];
    if (!itemData) return { success: false, message: 'Kein Item in diesem Slot.' };

    const item = Item.fromJSON(itemData);
    if (item.level >= 10) return { success: false, message: 'Maximales Level erreicht.' };

    const cost = item.level * 10 * (item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 3 : item.rarity === 'rare' ? 2 : 1);
    const resources = selectResources(state);
    if (resources.memoryDust < cost) {
      return { success: false, message: `Nicht genug Staub (${cost} benötigt).` };
    }

    // Staub abziehen
    this._resourceService._stateManager.dispatch(Actions.removeMemoryDust(cost));

    // Item upgraden
    item.level++;
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        equipment: {
          ...state.hero.equipment,
          [slot]: item.toJSON()
        }
      }
    }), 'forge/upgrade');

    this._eventBus.publish('forge:upgraded', { slot, item });
    return { success: true, message: `${item.name} auf Level ${item.level} aufgewertet!` };
  }

  /**
   * Zerlegt ein Inventar-Item zu Staub.
   */
  salvageItem(index, isLoot = false) {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const inventory = isLoot ? hero.inventory.loot : hero.inventory.equipment;
    if (index < 0 || index >= inventory.length) {
      return { success: false, message: 'Item nicht gefunden.' };
    }

    const itemData = inventory[index];
    const item = Item.fromJSON(itemData);
    const dustAmounts = { common: 1, uncommon: 3, rare: 10, epic: 25, legendary: 100 };
    const amount = (dustAmounts[item.rarity] || 1) * item.level;

    // Item entfernen
    this._stateManager.dispatch((state) => {
      const inventory = { ...state.hero.inventory };
      if (isLoot) {
        inventory.loot = state.hero.inventory.loot.filter((_, i) => i !== index);
      } else {
        inventory.equipment = state.hero.inventory.equipment.filter((_, i) => i !== index);
      }
      return {
        ...state,
        hero: {
          ...state.hero,
          inventory
        }
      };
    }, 'forge/salvage');

    // Staub hinzufügen
    this._resourceService._stateManager.dispatch(Actions.addMemoryDust(amount));

    this._eventBus.publish('forge:salvaged', { item, amount });
    return { success: true, message: `${item.name} zerlegt. +${amount} Staub.` };
  }

  /**
   * Setzt einen Katalysator in einen Gegenstandssockel ein.
   */
  socketCatalyst(isEquipped, slotOrIndex, socketIndex, choiceId) {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const resources = selectResources(state);

    // Prüfen, ob Katalysator vorhanden ist
    const currentCatalyst = BigInt(resources.catalyst || '0');
    if (currentCatalyst < BigInt(1)) {
      return { success: false, message: 'Nicht genügend Katalysatoren vorhanden.' };
    }

    // Item abrufen
    let itemData = null;
    if (isEquipped) {
      itemData = hero.equipment[slotOrIndex];
    } else {
      const index = Number(slotOrIndex);
      itemData = hero.inventory.equipment[index];
    }

    if (!itemData) {
      return { success: false, message: 'Gegenstand nicht gefunden.' };
    }

    const item = Item.fromJSON(itemData);
    if (!item.sockets || socketIndex < 0 || socketIndex >= item.sockets.length) {
      return { success: false, message: 'Dieser Gegenstand besitzt keinen entsprechenden Sockel.' };
    }

    if (item.sockets[socketIndex] !== null) {
      return { success: false, message: 'Dieser Sockel ist bereits belegt.' };
    }

    // Katalysator-Effekte definieren
    const effectsMap = {
      attack: { title: 'Rubin der Glut', color: '#ff4d4d', effects: { attack: 5 } },
      defense: { title: 'Saphir des Schutzes', color: '#4d79ff', effects: { defense: 5 } },
      agility: { title: 'Smaragd der Schnelligkeit', color: '#33cc33', effects: { agility: 5 } },
      stamina: { title: 'Bernstein des Lebens', color: '#ffaa00', effects: { stamina: 5 } }
    };

    const catalyst = effectsMap[choiceId];
    if (!catalyst) {
      return { success: false, message: 'Ungültiger Katalysator-Typ.' };
    }

    // Sockel belegen
    item.sockets[socketIndex] = {
      id: choiceId,
      ...catalyst
    };

    // Im State abspeichern und Katalysator abziehen
    this._stateManager.dispatch((state) => {
      const updatedHero = { ...state.hero };
      if (isEquipped) {
        updatedHero.equipment = {
          ...updatedHero.equipment,
          [slotOrIndex]: item.toJSON()
        };
      } else {
        const index = Number(slotOrIndex);
        const newEquip = [...updatedHero.inventory.equipment];
        newEquip[index] = item.toJSON();
        updatedHero.inventory = {
          ...updatedHero.inventory,
          equipment: newEquip
        };
      }

      const updatedResources = {
        ...state.resources,
        catalyst: String(currentCatalyst - BigInt(1) >= BigInt(0) ? currentCatalyst - BigInt(1) : BigInt(0))
      };

      return {
        ...state,
        hero: updatedHero,
        resources: updatedResources
      };
    }, 'forge/socketCatalyst');

    this._eventBus.publish('forge:socketed', { item, socketIndex, catalyst });
    this._eventBus.publish('ui:showToast', {
      message: `✨ ${catalyst.title} erfolgreich gesockelt!`,
      type: 'success',
      duration: 3000
    });

    return { success: true, item, message: 'Katalysator erfolgreich gesockelt!' };
  }
}

export default ForgeService;