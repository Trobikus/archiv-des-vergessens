import { Item } from './item.js';
import { PRESTIGE_ITEMS } from '../data/items.js';
import { generateStoryBosses } from '../data/bosses.js';
import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';

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

    this.equipment = { weapon: null, armor: null, amulet: null, ring: null, ring2: null };
    this._inventory = { equipment: [], loot: [] };
    this.bossProgress = 0;
    this.defeatedBosses = [];
    this.prestigeLevel = 0;
    this.prestigePoints = 0;
    this.unlockedSkills = [];
    this.clickPowerLevel = 0;

    this._prestigeStartTime = Date.now();
    this._lastLevelUpTime = Date.now();

    // Cache-Invaliderung
    this._statsCache = null;
    this._combatStatsCache = null;
    this._statsDirty = true;

    if (this.eventBus) {
      this.eventBus.subscribe(EVENTS.CMD_HERO_ADD_BASE_STAT, this._onAddBaseStat.bind(this));
      this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._markDirty());
      this.eventBus.subscribe(EVENTS.FORGE_CRAFTED, () => this._markDirty());
      this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => this._markDirty());
    }
  }

  _markDirty() {
    this._statsDirty = true;
    this._statsCache = null;
    this._combatStatsCache = null;
  }

  get inventory() {
    return this._inventory;
  }

  _onAddBaseStat(data) {
    if (this.baseStats[data.stat] !== undefined) {
      this.baseStats[data.stat] += data.amount;
      this._markDirty();
      this.eventBus.publish(EVENTS.HERO_UPDATED);
    }
  }

  addExperience(amount) {
    if (isNaN(amount) || amount <= 0) return;
    this.experience += amount;
    while (this.experience >= this.expToNext) {
      this.experience -= this.expToNext;
      this.level++;
      this.unspentStatPoints += CONFIG.HERO.STAT_POINTS_PER_LEVEL;
      this.expToNext = Math.floor(this.expToNext * CONFIG.HERO.EXP_MULTIPLIER);
      this._lastLevelUpTime = Date.now();
      this._markDirty();
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
    return (this.experience / this.expToNext) * 100;
  }

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
        if (slot.setName) setCounts[slot.setName] = (setCounts[slot.setName] || 0) + 1;
      }
    }

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

  equipItem(item, targetSlot = null, hasPacifistRing = false) {
    if (!item || !item.slot) return false;
    let slotToEquip = targetSlot || item.slot;
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
    const item = index < 0 || index >= this._inventory.equipment.length ? null : this._inventory.equipment.splice(index, 1)[0];
    if (item) this._markDirty();
    return item;
  }

  removeLootItem(index) {
    return index < 0 || index >= this._inventory.loot.length ? null : this._inventory.loot.splice(index, 1)[0];
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
      .map(item => new Item(item.name, item.slot, item.rarity, { ...item.stats }, item.desc, false));
  }

  performPrestigeReset(resourceManager, clanManager = null) {
    if (this.bossProgress < generateStoryBosses().length) {
      return { success: false, message: 'Verewigung erst nach dem letzten Boss möglich.' };
    }

    const timeSinceLastPrestige = (Date.now() - this._prestigeStartTime) / 1000;

    this.prestigeLevel += 1;
    this.prestigePoints += 1;
    this.level = 1;
    this.experience = 0;
    this.expToNext = CONFIG.HERO.BASE_EXP_TO_NEXT;
    this.unspentStatPoints = 0;
    this.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
    this.equipment = { weapon: null, armor: null, amulet: null, ring: null, ring2: null };
    this._inventory = { equipment: [], loot: [] };
    this.bossProgress = 0;
    this.defeatedBosses = [];
    this.clickPowerLevel = 0;

    this._prestigeStartTime = Date.now();
    this._markDirty();

    if (resourceManager) {
      resourceManager.fromJSON({
        particles: this.getPrestigeBonus('particleStart'),
        relics: 0,
        artifacts: 0,
        memoryDust: resourceManager.memoryDust
      });
    }
    if (clanManager) clanManager.fromJSON({ members: [], nextId: 10, expeditionStatus: [] });

    if (this.eventBus) {
      this.eventBus.publish(EVENTS.HERO_PRESTIGE, {
        prestigeLevel: this.prestigeLevel,
        timeSinceLastPrestige: timeSinceLastPrestige
      });
      this.eventBus.publish(EVENTS.HERO_UPDATED);
      this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
      this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: clanManager ? clanManager.members : [] });
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🌌 Dein Held wurde verewigt (Prestige Stufe ${this.prestigeLevel}).`, type: 'event' });
      this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
    }
    return { success: true, message: `Dein Held wurde verewigt. Prestige Stufe ${this.prestigeLevel} erreicht.` };
  }

  toJSON() {
    return {
      name: this.name, level: this.level, experience: this.experience, expToNext: this.expToNext,
      baseStats: { ...this.baseStats },
      spentStats: { ...this.spentStats },
      unspentStatPoints: this.unspentStatPoints,
      equipment: {
        weapon: this.equipment.weapon ? this.equipment.weapon.toJSON() : null,
        armor: this.equipment.armor ? this.equipment.armor.toJSON() : null,
        amulet: this.equipment.amulet ? this.equipment.amulet.toJSON() : null,
        ring: this.equipment.ring ? this.equipment.ring.toJSON() : null,
        ring2: this.equipment.ring2 ? this.equipment.ring2.toJSON() : null
      },
      inventory: {
        equipment: this._inventory.equipment.map(item => item.toJSON()),
        loot: this._inventory.loot.map(item => item.toJSON())
      },
      bossProgress: this.bossProgress, defeatedBosses: [...this.defeatedBosses],
      prestigeLevel: this.prestigeLevel, prestigePoints: this.prestigePoints,
      _bossNoEquipmentWins: this._bossNoEquipmentWins || 0,
      _craftedRecipeCount: this._craftedRecipeCount || 0,
      _successfulExpeditions: this._successfulExpeditions || 0,
      titles: this.titles || [], title: this.title || '',
      unlockedSkills: this.unlockedSkills,
      clickPowerLevel: this.clickPowerLevel || 0,
      _prestigeStartTime: this._prestigeStartTime,
      _lastLevelUpTime: this._lastLevelUpTime
    };
  }

  fromJSON(data) {
    if (!data) return;

    this.name = data.name || 'Der Mneme-Bund';
    this.level = Number(data.level) || 1;
    this.experience = Number(data.experience) || 0;
    this.expToNext = Number(data.expToNext) || CONFIG.HERO.BASE_EXP_TO_NEXT;

    this.baseStats = data.baseStats || { attack: 5, defense: 3, agility: 4, stamina: 6 };
    this.spentStats = data.spentStats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
    this.unspentStatPoints = Number(data.unspentStatPoints) || 0;

    const expectedPoints = (this.level - 1) * CONFIG.HERO.STAT_POINTS_PER_LEVEL;
    const totalSpent = this.spentStats.attack + this.spentStats.defense + this.spentStats.agility + this.spentStats.stamina;
    if (this.unspentStatPoints + totalSpent < expectedPoints) {
      this.unspentStatPoints += expectedPoints - (this.unspentStatPoints + totalSpent);
    }

    if (data.equipment) {
      for (const slot of ['weapon', 'armor', 'amulet', 'ring', 'ring2']) {
        this.equipment[slot] = data.equipment[slot] ? Item.fromJSON(data.equipment[slot]) : null;
      }
    }
    if (data.inventory) {
      this._inventory.equipment = (Array.isArray(data.inventory.equipment) ? data.inventory.equipment : []).map(i => Item.fromJSON(i));
      this._inventory.loot = (Array.isArray(data.inventory.loot) ? data.inventory.loot : []).map(i => Item.fromJSON(i));
    }

    this.bossProgress = Number(data.bossProgress) || 0;
    this.defeatedBosses = Array.isArray(data.defeatedBosses) ? [...data.defeatedBosses] : [];
    this.prestigeLevel = Number(data.prestigeLevel) || 0;
    this.prestigePoints = Number(data.prestigePoints) || 0;
    this._bossNoEquipmentWins = Number(data._bossNoEquipmentWins) || 0;
    this._craftedRecipeCount = Number(data._craftedRecipeCount) || 0;
    this._successfulExpeditions = Number(data._successfulExpeditions) || 0;
    this.titles = Array.isArray(data.titles) ? data.titles : [];
    this.title = data.title || '';
    this.unlockedSkills = Array.isArray(data.unlockedSkills) ? data.unlockedSkills : [];
    this.clickPowerLevel = Number(data.clickPowerLevel) || 0;

    this._prestigeStartTime = data._prestigeStartTime || Date.now();
    this._lastLevelUpTime = data._lastLevelUpTime || Date.now();
    this._markDirty();
  }
}