// ============================================================
// FILE: models/hero/HeroEquipment.js – Equipment & Inventar
// ============================================================

import { Item } from '../item.js';
import { Sanitizer } from '../../core/security.js';

/**
 * Verwaltet die 13 Equipment-Slots und das Inventar.
 */
export class HeroEquipment {
    constructor(hero) {
        this._hero = hero;
        // 13 Slots
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
        this._statsDirty = true;
    }

    // ---- INVENTAR-ZUGRIFF ----

    get inventory() {
        return this._inventory;
    }

    // ---- AUSRÜSTUNG ----

    /**
     * Legt ein Item an (in den passenden Slot).
     * @param {Item} item – Das Item
     * @param {string} targetSlot – Optionaler Slot (wenn nicht auto-detected)
     * @param {boolean} hasPacifistRing – Ob der zweite Ring-Slot freigeschaltet ist
     * @returns {boolean} – Erfolg
     */
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

    /**
     * Legt ein Item ab (in den entsprechenden Slot).
     * @param {string} slot – Slot-Name
     * @returns {Item|null} – Das abgelegte Item oder null
     */
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

    /**
     * Holt ein ausgerüstetes Item.
     */
    getEquippedItem(slot) {
        return this.equipment[slot] || null;
    }

    // ---- INVENTAR-MANIPULATION ----

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

    /**
     * Verkauft ein Loot-Item und gibt Partikel zurück.
     */
    sellLootItem(index, resourceManager) {
        const item = this.removeLootItem(index);
        if (!item) return false;
        const baseValue = 5;
        const rarityBonus = { common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 };
        const value = baseValue + (rarityBonus[item.rarity] || 0);
        resourceManager.addParticles(value);
        return value;
    }

    // ---- INTERN ----

    _markDirty() {
        this._statsDirty = true;
        if (this._hero._stats) this._hero._stats.markDirty();
    }

    // ---- PERSISTENZ ----

    toJSON() {
        const eq = {};
        for (const slot of Object.keys(this.equipment)) {
            eq[slot] = this.equipment[slot] ? this.equipment[slot].toJSON() : null;
        }
        return {
            equipment: eq,
            inventory: {
                equipment: this._inventory.equipment.map(i => i.toJSON()),
                loot: this._inventory.loot.map(i => i.toJSON())
            }
        };
    }

    fromJSON(data) {
        if (!data) return;
        const slots = ['weapon', 'shield', 'helmet', 'shoulders', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring', 'ring2'];
        if (data.equipment) {
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
        this._markDirty();
    }
}