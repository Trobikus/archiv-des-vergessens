// ============================================================
// FILE: js/data/gems_enchants.js – Gems & Enchantments Data
// ============================================================

export const GEMS = {
  ruby_flawless: {
    id: 'ruby_flawless',
    name: 'Makelloser Rubin',
    type: 'ruby',
    color: '#ff4d4d',
    icon: '💎',
    stats: { damagePercent: 15 },
    description: '+15% Physikalischer Schaden',
    costMneme: 500
  },
  sapphire_flawless: {
    id: 'sapphire_flawless',
    name: 'Makelloser Saphir',
    type: 'sapphire',
    color: '#3399ff',
    icon: '🔷',
    stats: { maxHpPercent: 20 },
    description: '+20% Maximale Gesundheit',
    costMneme: 500
  },
  emerald_flawless: {
    id: 'emerald_flawless',
    name: 'Makelloser Smaragd',
    type: 'emerald',
    color: '#33cc66',
    icon: '🟢',
    stats: { critChancePercent: 12, attackSpeedPercent: 5 },
    description: '+12% Krit-Chance & +5% Angriffsgeschwindigkeit',
    costMneme: 500
  },
  topaz_flawless: {
    id: 'topaz_flawless',
    name: 'Makelloser Topas',
    type: 'topaz',
    color: '#ffcc00',
    icon: '🟡',
    stats: { mnemeGainPercent: 25 },
    description: '+25% Mneme-Ertrag',
    costMneme: 500
  }
};

export const ENCHANTMENTS = {
  scroll_mneme_power: {
    id: 'scroll_mneme_power',
    name: 'Rolle des Mnemischen Zorns',
    icon: '📜',
    enchantName: 'Mnemischer Zorn',
    stats: { flatDamage: 25, damagePercent: 10 },
    description: '+25 Flat-Schaden & +10% Schaden',
    costMneme: 1000
  },
  scroll_aegis_shield: {
    id: 'scroll_aegis_shield',
    name: 'Rolle des Titanenschutzes',
    icon: '📜',
    enchantName: 'Titanenschutz',
    stats: { flatDefense: 30, maxHpPercent: 15 },
    description: '+30 Flat-Rüstung & +15% Max HP',
    costMneme: 1000
  },
  scroll_swift_wind: {
    id: 'scroll_swift_wind',
    name: 'Rolle des Rückenwinds',
    icon: '📜',
    enchantName: 'Rückenwind',
    stats: { attackSpeedPercent: 12, critMultiplierPercent: 15 },
    description: '+12% Angriffsgeschwindigkeit & +15% Krit-Schaden',
    costMneme: 1000
  }
};
