// ============================================================
// FILE: js/models/item.js – Ausrüstung & Loot
// ============================================================

export class Item {
    constructor(name, slot, rarity, stats, description = '', isLoot = false, level = 1) {
        this.name = name;
        this.slot = slot;
        this.rarity = rarity;
        this.baseStats = stats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
        this.description = description;
        this.isLoot = isLoot;
        this.level = level;
        this.setName = this._determineSetName(name);
        this.quality = 100; // Wird beim Crafting überschrieben
        this.isMasterwork = false;
    }

    /**
     * Berechnet die tatsächlichen Stats basierend auf Level.
     */
    get stats() {
        const multiplier = 1 + (this.level - 1) * 0.2;
        return {
            attack: Math.floor(this.baseStats.attack * multiplier),
            defense: Math.floor(this.baseStats.defense * multiplier),
            agility: Math.floor(this.baseStats.agility * multiplier),
            stamina: Math.floor(this.baseStats.stamina * multiplier)
        };
    }

    /**
     * Bestimmt den Set-Namen basierend auf dem Item-Namen.
     */
    _determineSetName(name) {
        if (['Schattenklinge', 'Abgrundplatte', 'Amulett der Namenlosen', 'Ring der Leere'].includes(name)) {
            return 'Schatten';
        }
        if (['Archiv-Klinge', 'Chronisten-Robe', 'Mneme-Amulett', 'Ring der Erinnerung'].includes(name)) {
            return 'Archiv';
        }
        if (['Klinge der Ersten', 'Ur-Rüstung', 'Amulett der Ewigkeit', 'Ring der Unendlichkeit'].includes(name)) {
            return 'Ur';
        }
        if (['Gott-Klinge', 'Gott-Rüstung', 'Mneme-Krone', 'Ring der Wiedergeburt'].includes(name)) {
            return 'Gott';
        }
        return null;
    }

    /**
     * Gibt die Farbe basierend auf der Seltenheit zurück.
     */
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

    /**
     * Gibt das lesbare Label der Seltenheit zurück.
     */
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

    // ---- PERSISTENZ ----
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
            isMasterwork: this.isMasterwork
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const item = new Item(
            data.name,
            data.slot,
            data.rarity,
            data.stats,
            data.description,
            data.isLoot || false,
            data.level || 1
        );
        item.quality = data.quality || 100;
        item.isMasterwork = data.isMasterwork || false;
        return item;
    }
}