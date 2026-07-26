/**
 * Custom Hook für Item-Anzeige und -Übersetzung im Helden-UI.
 *
 * @param {string} lang Aktuelle Sprache ('de' oder 'en')
 * @returns {Object} Helper-Funktionen
 */
export function useItemDisplay(lang) {
  const getLocText = (obj, prop = 'text') => {
    if (!obj) return '';
    if (lang === 'en' && obj[prop + '_en']) {
      return obj[prop + '_en'];
    }
    return obj[prop] || '';
  };

  const translateItemName = (name) => {
    if (!name) return '';
    if (lang !== 'en') return name;
    const dict = {
      'Schattenklinge': 'Shadow Blade',
      'Abgrundplatte': 'Abyss Plate',
      'Amulett der Namenlosen': 'Amulet of the Nameless',
      'Ring der Leere': 'Ring of the Void',
      'Archiv-Klinge': 'Archive Blade',
      'Chronisten-Robe': 'Chronicle Robe',
      'Mneme-Amulett': 'Mneme Amulet',
      'Ring der Erinnerung': 'Ring of Memory',
      'Klinge der Ersten': 'Blade of the First',
      'Ur-Rüstung': 'Ancient Armor',
      'Amulett der Ewigkeit': 'Amulet of Eternity',
      'Ring der Unendlichkeit': 'Ring of Infinity',
      'Gott-Klinge': 'God Blade',
      'Gott-Rüstung': 'God Armor',
      'Mneme-Krone': 'Mneme Crown',
      'Mneme-Krone der Wiederkehr': 'Mneme Crown of Return',
      'Ring der Wiedergeburt': 'Ring of Rebirth',
      'Amulett der Dämmerung': 'Amulet of Dawn',
      'Amulett der Dämmerung ': 'Amulet of Dawn',
      'Staubige Klinge': 'Dusty Blade',
      'Architekten-Klinge': 'Architect Blade',
      'Grundlegende Klinge': 'Basic Blade',
      'Stahlklinge': 'Steel Blade',
      'Dämonenklinge': 'Demon Blade',
      'Göttliche Klinge': 'Divine Blade',
      'Schicksalsklinge der Raids': 'Fate Blade of Raids',
      'Schmuck-Katalysator': 'Jewelry Catalyst',
      'Katalysator': 'Catalyst',
      'Erinnerungssplitter': 'Memory Shard'
    };
    return dict[name.trim()] || name;
  };

  const translateItemDescription = (desc) => {
    if (!desc) return '';
    if (lang !== 'en') return desc;
    let res = desc;
    res = res.replace('Ein Werk der Artefakt-Schmiede.', 'A work of the Artifact Forge.');
    res = res.replace('Gewonnen aus einem heroischen Clan-Raid.', 'Won from a heroic Clan Raid.');
    res = res.replace('Meisterwerk-Qualität:', 'Masterwork Quality:');
    res = res.replace('Ein Ausrüstungsgegenstand.', 'An equipment item.');
    return res;
  };

  const getRarityLabel = (rarity) => {
    if (lang === 'en') {
      return {
        common: 'Common',
        uncommon: 'Uncommon',
        rare: 'Rare',
        epic: 'Epic',
        legendary: 'Legendary'
      }[rarity] || rarity;
    }
    return {
      common: 'Gewöhnlich',
      uncommon: 'Ungewöhnlich',
      rare: 'Selten',
      epic: 'Episch',
      legendary: 'Legendär'
    }[rarity] || rarity;
  };

  const getSlotLabel = (slot) => {
    if (lang === 'en') {
      return {
        weapon: 'Weapon',
        shield: 'Shield',
        helmet: 'Helmet',
        shoulders: 'Shoulders',
        armor: 'Armor',
        gloves: 'Gloves',
        belt: 'Belt',
        boots: 'Boots',
        amulet: 'Amulet',
        ring: 'Ring (left)',
        ring2: 'Ring (right)'
      }[slot] || slot;
    }
    return {
      weapon: 'Waffe',
      shield: 'Schild',
      helmet: 'Helm',
      shoulders: 'Schultern',
      armor: 'Rüstung',
      gloves: 'Handschuhe',
      belt: 'Gürtel',
      boots: 'Stiefel',
      amulet: 'Amulett',
      ring: 'Ring (links)',
      ring2: 'Ring (rechts)'
    }[slot] || slot;
  };

  // Hilfsfunktion für Custom-Icons
  const getItemIcon = (item) => {
    if (!item) return null;
    const name = item.name || "";
    const nameLower = name.toLowerCase();

    if (name === "Amulett der Dämmerung") {
      return "icons/Amulett der Dämmerung .png";
    }
    if (name === "Mneme-Krone" || name === "Mneme-Krone der Wiederkehr") {
      return "icons/Die Mneme-Krone.png";
    }
    if (
      name === "Klinge der Ersten" || 
      name === "Ewige Mneme-Klinge" || 
      name === "Archiv-Klinge" || 
      name === "Architekten-Klinge" || 
      name === "Gott-Klinge" || 
      name === "Göttliche Klinge"
    ) {
      return "icons/Die Klinge der Ersten.png";
    }

    // Fallbacks based on name keywords or slot
    if (nameLower.includes("hammer") || nameLower.includes("streitkolben")) {
      return "icons/Magmahammer.png";
    }
    if (nameLower.includes("schwert") || nameLower.includes("klinge") || item.slot === "weapon") {
      return "icons/Flammenschwert.png";
    }
    if (nameLower.includes("rüstung") || nameLower.includes("panzer") || item.slot === "armor") {
      return "icons/Knochenruestung.png";
    }
    if (nameLower.includes("helm") || nameLower.includes("krone") || item.slot === "helmet") {
      return "icons/Knochenhelm.png";
    }
    if (nameLower.includes("juwel") || nameLower.includes("stein") || item.slot === "amulet" || (item.slot && item.slot.startsWith("ring"))) {
      return "icons/Feuerjuwel.png";
    }

    return null;
  };

  return {
    getLocText,
    translateItemName,
    translateItemDescription,
    getRarityLabel,
    getSlotLabel,
    getItemIcon
  };
}
