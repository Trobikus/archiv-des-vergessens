/**
 * ============================================================
 * FILE: models/hero/index.js – Hero-Modell (reines Datenobjekt)
 * ============================================================
 * 
 * Dieses Modell wird nur noch für die Item-Konstruktion und
 * für die Kommunikation mit dem Worker verwendet.
 * Die eigentliche State-Haltung erfolgt im StateManager.
 * ============================================================
 */

export class Hero {
  /**
   * Erstellt ein Hero-Objekt aus einem State-Slice.
   */
  static fromState(heroState) {
    return new Hero(heroState);
  }

  constructor(data) {
    this.name = data.name || 'Der Mneme-Bund';
    this.level = data.level || 1;
    this.experience = data.experience || 0;
    this.expToNext = data.expToNext || 50;
    this.baseStats = data.baseStats || { attack: 5, defense: 3, agility: 4, stamina: 6 };
    this.spentStats = data.spentStats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
    this.unspentStatPoints = data.unspentStatPoints || 0;
    this.equipment = data.equipment || {};
    this.inventory = data.inventory || { equipment: [], loot: [] };
    this.prestige = data.prestige || { level: 0, points: 0, bossProgress: 0, defeatedBosses: [] };
    this.unlockedSkills = data.unlockedSkills || [];
    this.clickPowerLevel = data.clickPowerLevel || 0;
    this.titles = data.titles || [];
    this.title = data.title || '';
    this._bossNoEquipmentWins = data._bossNoEquipmentWins || 0;
    this._craftedRecipeCount = data._craftedRecipeCount || 0;
    this._successfulExpeditions = data._successfulExpeditions || 0;
  }

  /**
   * Gibt die Attribute (Basis + verbrauchte Punkte) zurück.
   */
  getAttributes() {
    return {
      attack: this.baseStats.attack + this.spentStats.attack,
      defense: this.baseStats.defense + this.spentStats.defense,
      agility: this.baseStats.agility + this.spentStats.agility,
      stamina: this.baseStats.stamina + this.spentStats.stamina
    };
  }

  /**
   * Gibt die Kampfstatistiken zurück.
   */
  getCombatStats() {
    const attr = this.getAttributes();
    return {
      ...attr,
      maxHp: 100 + (attr.stamina * 10) + (attr.defense * 2),
      damageReduction: attr.defense / (attr.defense + 100),
      critChance: Math.min(80, 5 + (attr.agility * 0.5)),
      critDamage: 150 + (attr.attack * 0.5),
      dodgeChance: Math.min(50, attr.agility * 0.25)
    };
  }

  /**
   * Konvertiert zu JSON (für Save/Load).
   */
  toJSON() {
    return {
      name: this.name,
      level: this.level,
      experience: this.experience,
      expToNext: this.expToNext,
      baseStats: this.baseStats,
      spentStats: this.spentStats,
      unspentStatPoints: this.unspentStatPoints,
      equipment: this.equipment,
      inventory: this.inventory,
      prestige: this.prestige,
      unlockedSkills: this.unlockedSkills,
      clickPowerLevel: this.clickPowerLevel,
      titles: this.titles,
      title: this.title,
      _bossNoEquipmentWins: this._bossNoEquipmentWins,
      _craftedRecipeCount: this._craftedRecipeCount,
      _successfulExpeditions: this._successfulExpeditions
    };
  }
}

export default Hero;