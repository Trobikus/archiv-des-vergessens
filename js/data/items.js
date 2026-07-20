// ============================================================
// FILE: js/data/items.js – Item-Templates & Prestige-Items
// ============================================================
export const ITEM_TEMPLATES = {
    'Staubige Klinge': { slot: 'weapon', rarity: 'common', stats: { attack: 3 } },
    'Flickwerk-Rüstung': { slot: 'armor', rarity: 'common', stats: { defense: 2 } },
    'Amulett der Dämmerung': { slot: 'amulet', rarity: 'uncommon', stats: { attack: 2, stamina: 1 } },
    'Ring der Einkehr': { slot: 'ring', rarity: 'uncommon', stats: { defense: 1, agility: 1 } },
    'Schattenklinge': { slot: 'weapon', rarity: 'rare', stats: { attack: 6, agility: 2 } },
    'Abgrundplatte': { slot: 'armor', rarity: 'rare', stats: { defense: 5, stamina: 2 } },
    'Amulett der Namenlosen': { slot: 'amulet', rarity: 'rare', stats: { attack: 4, defense: 2 } },
    'Ring der Leere': { slot: 'ring', rarity: 'rare', stats: { agility: 3, stamina: 2 } },
    'Archiv-Klinge': { slot: 'weapon', rarity: 'epic', stats: { attack: 10, agility: 4 } },
    'Chronisten-Robe': { slot: 'armor', rarity: 'epic', stats: { defense: 8, stamina: 4 } },
    'Mneme-Amulett': { slot: 'amulet', rarity: 'epic', stats: { attack: 6, defense: 4, stamina: 2 } },
    'Ring der Erinnerung': { slot: 'ring', rarity: 'epic', stats: { agility: 5, stamina: 3, attack: 2 } },
    'Klinge der Ersten': { slot: 'weapon', rarity: 'legendary', stats: { attack: 15, agility: 6 } },
    'Ur-Rüstung': { slot: 'armor', rarity: 'legendary', stats: { defense: 12, stamina: 6 } },
    'Amulett der Ewigkeit': { slot: 'amulet', rarity: 'legendary', stats: { attack: 8, defense: 6, stamina: 4 } },
    'Ring der Unendlichkeit': { slot: 'ring', rarity: 'legendary', stats: { agility: 8, stamina: 6, attack: 4 } },
    'Architekten-Klinge': { slot: 'weapon', rarity: 'legendary', stats: { attack: 20, agility: 8, defense: 2 } },
    'Gestalter-Robe': { slot: 'armor', rarity: 'legendary', stats: { defense: 16, stamina: 8, agility: 4 } },
    'Gott-Klinge': { slot: 'weapon', rarity: 'legendary', stats: { attack: 30, agility: 12, defense: 4 } },
    'Gott-Rüstung': { slot: 'armor', rarity: 'legendary', stats: { defense: 25, stamina: 12, attack: 4 } },
    'Mneme-Krone': { slot: 'amulet', rarity: 'legendary', stats: { attack: 15, defense: 10, stamina: 10, agility: 10 } }
};

export const PRESTIGE_ITEMS = [
    { level: 1, name: 'Ewige Mneme-Klinge', slot: 'weapon', rarity: 'legendary', stats: { attack: 16, agility: 6 }, desc: 'Exklusives Prestige-Item.' },
    { level: 1, name: 'Ur-Archiv-Rüstung', slot: 'armor', rarity: 'legendary', stats: { defense: 14, stamina: 7 }, desc: 'Exklusives Prestige-Item.' },
    { level: 2, name: 'Mneme-Krone der Wiederkehr', slot: 'amulet', rarity: 'legendary', stats: { attack: 10, defense: 8, stamina: 8, agility: 6 }, desc: 'Exklusives Prestige-Item.' },
    { level: 2, name: 'Ring der Wiedergeburt', slot: 'ring', rarity: 'legendary', stats: { agility: 8, stamina: 6, attack: 4 }, desc: 'Exklusives Prestige-Item.' }
];