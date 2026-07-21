/**
 * ============================================================
 * FILE: models/item.js – Item (Ausrüstung & Loot mit Sockeln)
 * ============================================================
 */

export class Item {
  constructor(name, slot, rarity, stats = {}, description = '', isLoot = false, level = 1) {
    this.name = name;
    this.slot = slot;
    this.rarity = rarity;
    this.baseStats = stats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
    this.description = description;
    this.isLoot = isLoot;
    this.level = level || 1;
    this.setName = this._determineSetName(name);
    this.quality = 100;
    this.isMasterwork = false;
    this.sockets = []; // Liste von Sockel-Objekten (null = leerer Sockel, oder Catalyst-Objekt)
    if (this.rarity === 'rare' || this.rarity === 'epic') {
      this.sockets = [null];
    } else if (this.rarity === 'legendary') {
      this.sockets = [null, null];
    }
  }

  get stats() {
    const multiplier = 1 + (this.level - 1) * 0.2;
    const base = {
      attack: Math.floor(this.baseStats.attack * multiplier),
      defense: Math.floor(this.baseStats.defense * multiplier),
      agility: Math.floor(this.baseStats.agility * multiplier),
      stamina: Math.floor(this.baseStats.stamina * multiplier)
    };

    // Sockel-Katalysator-Boni hinzurechnen
    if (this.sockets && Array.isArray(this.sockets)) {
      for (const socket of this.sockets) {
        if (socket && typeof socket === 'object' && socket.effects) {
          for (const key in socket.effects) {
            if (base[key] !== undefined) {
              base[key] += socket.effects[key];
            }
          }
        }
      }
    }

    return base;
  }

  _determineSetName(name) {
    const setMap = {
      'Schattenklinge': 'Schatten',
      'Abgrundplatte': 'Schatten',
      'Amulett der Namenlosen': 'Schatten',
      'Ring der Leere': 'Schatten',
      'Archiv-Klinge': 'Archiv',
      'Chronisten-Robe': 'Archiv',
      'Mneme-Amulett': 'Archiv',
      'Ring der Erinnerung': 'Archiv',
      'Klinge der Ersten': 'Ur',
      'Ur-Rüstung': 'Ur',
      'Amulett der Ewigkeit': 'Ur',
      'Ring der Unendlichkeit': 'Ur',
      'Gott-Klinge': 'Gott',
      'Gott-Rüstung': 'Gott',
      'Mneme-Krone': 'Gott',
      'Ring der Wiedergeburt': 'Gott'
    };
    return setMap[name] || null;
  }

  getColor() {
    const colors = {
      common: '#aaa',
      uncommon: '#5a9a5a',
      rare: '#4a7aaa',
      epic: '#9a4aaa',
      legendary: '#d4af37'
    };
    return colors[this.rarity] || '#aaa';
  }

  getRarityLabel() {
    const labels = {
      common: 'Gewöhnlich',
      uncommon: 'Ungewöhnlich',
      rare: 'Selten',
      epic: 'Episch',
      legendary: 'Legendär'
    };
    return labels[this.rarity] || this.rarity;
  }

  toJSON() {
    return {
      name: this.name,
      slot: this.slot,
      rarity: this.rarity,
      stats: { ...this.baseStats },
      description: this.description,
      isLoot: this.isLoot,
      level: this.level,
      quality: this.quality,
      isMasterwork: this.isMasterwork,
      sockets: this.sockets
    };
  }

  static fromJSON(data) {
    if (!data) return null;
    const item = new Item(
      data.name,
      data.slot,
      data.rarity,
      data.stats || {},
      data.description || '',
      data.isLoot || false,
      data.level || 1
    );
    item.quality = data.quality || 100;
    item.isMasterwork = data.isMasterwork || false;
    item.sockets = data.sockets || [];
    return item;
  }
}

export default Item;