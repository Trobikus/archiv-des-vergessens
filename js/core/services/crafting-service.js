/**
 * ============================================================
 * FILE: core/services/crafting-service.js – Meisterwerkstatt
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Meister-Rezepte verwalten
 * - Crafting mit Qualitätsberechnung
 * - Ressourcen-Kosten
 * - Skill-Level und Erfahrung
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import { EVENTS } from '../events/definitions.js';
import { MASTER_RECIPES } from '../../data/crafting_recipes.js';
import { Item } from '../../models/item.js';
import RNG from '../../utils/rng.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */
/** @typedef {import('./clan-service.js').default} ClanService */
/** @typedef {import('./forge-service.js').default} ForgeService */

export class CraftingService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   * @param {HeroService} heroService
   * @param {ClanService} clanService
   * @param {ForgeService} forgeService
   */
  constructor(stateManager, eventBus, resourceService, heroService, clanService, forgeService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
    this._clanService = clanService;
    this._forgeService = forgeService;

    this._recipes = MASTER_RECIPES;
    this._expToNextBase = 100;
    this._expMultiplier = 1.2;
  }

  /**
   * Gibt alle verfügbaren Rezepte zurück.
   */
  getAvailableRecipes() {
    const state = this._stateManager.getState();
    const unlocked = state.crafting.unlockedRecipes || ['basic_weapon', 'basic_armor'];
    const bossProgress = state.hero.prestige.bossProgress;

    return Object.values(this._recipes).filter(r => {
      if (!unlocked.includes(r.id)) return false;
      if (r.unlockBoss && bossProgress < r.unlockBoss) return false;
      return true;
    });
  }

  /**
   * Gibt die Kosten für ein Rezept zurück.
   */
  getRecipeCost(recipe) {
    const cost = {};
    for (const [res, amount] of Object.entries(recipe.cost)) {
      let multiplier = 1;
      
      // Rabatt durch Bibliothek
      const state = this._stateManager.getState();
      const discount = (state.library.upgrades?.forge_discount || 0) * 0.01;
      multiplier = Math.max(0.1, 1 - discount);
      
      // Rabatt durch Talent
      if ((state.hero.unlockedSkills || []).includes('scholar_1')) {
        multiplier *= 0.9;
      }
      
      cost[res] = Math.max(1, Math.floor(amount * multiplier));
    }
    return cost;
  }

  /**
   * Führt ein Master-Crafting durch.
   */
  craftMasterRecipe(recipeId) {
    const recipe = this._recipes[recipeId];
    if (!recipe) {
      return { success: false, message: 'Rezept nicht gefunden.' };
    }

    const state = this._stateManager.getState();
    const unlocked = state.crafting.unlockedRecipes || [];
    if (!unlocked.includes(recipeId)) {
      return { success: false, message: 'Rezept noch nicht freigeschaltet.' };
    }

    const cost = this.getRecipeCost(recipe);
    const resources = state.resources;

    // Kosten prüfen
    for (const [key, amount] of Object.entries(cost)) {
      const current = Number(resources[key] || '0');
      if (current < amount) {
        return { success: false, message: `Nicht genug ${key}. (${amount} benötigt)` };
      }
    }

    // Kosten abziehen
    for (const [key, amount] of Object.entries(cost)) {
      if (key === 'particles') this._resourceService.removeParticles(amount);
      else if (key === 'relics') this._resourceService.removeRelics(amount);
      else if (key === 'artifacts') {
        this._resourceService._stateManager.dispatch((state) => ({
          ...state,
          resources: {
            ...state.resources,
            artifacts: String(Number(state.resources.artifacts || '0') - amount)
          }
        }), 'crafting/payArtifacts');
      } else if (key === 'memoryDust') {
        this._resourceService._stateManager.dispatch((state) => ({
          ...state,
          resources: {
            ...state.resources,
            memoryDust: String(Number(state.resources.memoryDust || '0') - amount)
          }
        }), 'crafting/payDust');
      } else if (key === 'catalyst') {
        this._resourceService._stateManager.dispatch((state) => ({
          ...state,
          resources: {
            ...state.resources,
            catalyst: String(Number(state.resources.catalyst || '0') - amount)
          }
        }), 'crafting/payCatalyst');
      } else if (key === 'essence') {
        this._resourceService._stateManager.dispatch((state) => ({
          ...state,
          resources: {
            ...state.resources,
            essence: String(Number(state.resources.essence || '0') - amount)
          }
        }), 'crafting/payEssence');
      }
    }

    // Qualität berechnen
    const quality = this._calculateQuality(recipe.baseQuality || 50);
    const craftingLevel = state.crafting.level || 0;

    // Ressourcen-Rezepte
    if (recipe.isResourceRecipe && recipe.resourceResult) {
      for (const [key, amount] of Object.entries(recipe.resourceResult)) {
        if (key === 'catalyst') {
          this._resourceService._stateManager.dispatch((state) => ({
            ...state,
            resources: {
              ...state.resources,
              catalyst: String(Number(state.resources.catalyst || '0') + amount)
            }
          }), 'crafting/addCatalyst');
        } else if (key === 'essence') {
          this._resourceService._stateManager.dispatch((state) => ({
            ...state,
            resources: {
              ...state.resources,
              essence: String(Number(state.resources.essence || '0') + amount)
            }
          }), 'crafting/addEssence');
        }
      }
      
      this._addCraftingExp(recipe.difficulty * 3);
      this._eventBus.publish('crafting:masterwork', { recipe, quality });
      
      return {
        success: true,
        quality,
        message: `✅ ${recipe.resultName} hergestellt (Qualität ${quality}%)`
      };
    }

    // Item-Rezepte
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

    // Stats anpassen basierend auf Qualität
    const statMultiplier = 0.5 + (quality / 100) * 0.5;
    for (const key in item.stats) {
      item.stats[key] = Math.floor(item.stats[key] * statMultiplier);
    }

    // Bonus für sehr hohe Qualität
    if (quality >= 90 && RNG.random() < 0.3) {
      const extraStat = ['attack', 'defense', 'agility', 'stamina'][Math.floor(RNG.random() * 4)];
      item.stats[extraStat] += Math.floor(3 + quality / 10);
      item.description += ` +${extraStat} Bonus`;
    }

    // Item zum Inventar hinzufügen
    this._heroService._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        inventory: {
          ...state.hero.inventory,
          equipment: [...state.hero.inventory.equipment, item.toJSON()]
        }
      }
    }), 'crafting/addItem');

    // Rezepte freischalten
    if (recipe.unlocks) {
      this._stateManager.dispatch((state) => {
        const unlocked = [...(state.crafting.unlockedRecipes || ['basic_weapon', 'basic_armor'])];
        const newlyUnlocked = [];
        for (const unlockId of recipe.unlocks) {
          if (!unlocked.includes(unlockId)) {
            unlocked.push(unlockId);
            newlyUnlocked.push(unlockId);
          }
        }
        if (newlyUnlocked.length > 0) {
          const names = newlyUnlocked.map((unlockId) => this._recipes[unlockId]?.name || unlockId).join(', ');
          this._eventBus.publish('ui:showToast', {
            message: `🔓 Neues Rezept freigeschaltet: ${names}`,
            type: 'success',
            duration: 3000
          });
        }
        return {
          ...state,
          crafting: {
            ...state.crafting,
            unlockedRecipes: unlocked
          }
        };
      }, 'crafting/unlockRecipe');
    }

    // Erfahrung
    const expGain = 10 + recipe.difficulty * 2 + Math.floor(quality / 10);
    this._addCraftingExp(expGain);

    // Events
    this._eventBus.publish('crafting:masterwork', { recipe, item, quality });
    this._eventBus.publish('forge:crafted', { recipe, item, quality });
    this._eventBus.publish('ui:showToast', {
      message: `⚒️ ${item.name} (Qualität ${quality}%) hergestellt!`,
      type: 'success',
      duration: 3000
    });

    return {
      success: true,
      item,
      quality,
      message: `${item.name} (Qualität ${quality}%) hergestellt!`
    };
  }

  /**
   * Berechnet die Crafting-Qualität.
   */
  _calculateQuality(baseQuality = 50) {
    let quality = baseQuality + (RNG.random() - 0.5) * 30;
    
    // Skill-Bonus
    const state = this._stateManager.getState();
    const level = state.crafting.level || 0;
    quality += level * 1.0;

    // Lore-Bonus (Lehre des Erzes)
    if (state.lore?.decrypted?.node_prologue === 'metal') {
      quality *= 1.10;
    }
    
    // Talent-Bonus
    const unlocked = state.hero.unlockedSkills || [];
    if (unlocked.includes('master_crafter')) {
      quality += 15;
    }
    
    // Kritischer Erfolg
    const critChance = 5 + level * 0.5;
    if (RNG.random() * 100 < critChance) {
      quality *= 1.5;
      this._eventBus.publish('ui:showToast', {
        message: `✨ Kritischer Erfolg! Qualität verdoppelt!`,
        type: 'success',
        duration: 2000
      });
    }
    
    return clamp(Math.floor(quality), 0, 100);
  }

  /**
   * Fügt Crafting-Erfahrung hinzu.
   */
  _addCraftingExp(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;

    this._stateManager.dispatch((state) => {
      const crafting = state.crafting;
      let exp = crafting.exp + safeAmount;
      let level = crafting.level || 0;
      let expToNext = crafting.expToNext || this._expToNextBase;

      while (exp >= expToNext) {
        exp -= expToNext;
        level++;
        expToNext = Math.floor(expToNext * this._expMultiplier);
        
        this._eventBus.publish('ui:showToast', {
          message: `🛠️ Handwerks-Skill auf Stufe ${level} gestiegen!`,
          type: 'success',
          duration: 3000
        });
      }

      return {
        ...state,
        crafting: {
          ...crafting,
          exp,
          level,
          expToNext
        }
      };
    }, 'crafting/addExp');

    this._eventBus.publish('hero:updated', {});
  }

  /**
   * Gibt das aktuelle Crafting-Level zurück.
   */
  getCraftingLevel() {
    return this._stateManager.getState().crafting.level || 0;
  }

  /**
   * Gibt den Fortschritt zum nächsten Level zurück.
   */
  getLevelProgress() {
    const state = this._stateManager.getState();
    const crafting = state.crafting;
    const exp = crafting.exp || 0;
    const expToNext = crafting.expToNext || this._expToNextBase;
    return Math.min(100, (exp / expToNext) * 100);
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    this._stateManager.dispatch((state) => ({
      ...state,
      crafting: {
        level: data.craftingLevel || 0,
        exp: data.craftingExp || 0,
        expToNext: data.craftingExpToNext || this._expToNextBase,
        unlockedRecipes: data.unlockedRecipes || ['basic_weapon', 'basic_armor']
      }
    }), 'crafting/load');
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    const state = this._stateManager.getState();
    return {
      craftingLevel: state.crafting.level || 0,
      craftingExp: state.crafting.exp || 0,
      craftingExpToNext: state.crafting.expToNext || this._expToNextBase,
      unlockedRecipes: state.crafting.unlockedRecipes || ['basic_weapon', 'basic_armor']
    };
  }
}

export default CraftingService;