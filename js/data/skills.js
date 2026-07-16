// --- START OF FILE data/skills.js (ERWEITERT) ---

export const SKILL_TREE = {
  warrior_1: { id: 'warrior_1', name: 'Pfad des Kriegers I', desc: '+10% Angriff', cost: 1, req: [] },
  warrior_2: { id: 'warrior_2', name: 'Pfad des Kriegers II', desc: '+20% Boss-Schaden', cost: 2, req: ['warrior_1'] },
  auto_boss: { id: 'auto_boss', name: 'Ewiger Kampf (Auto)', desc: 'Startet Bosskämpfe automatisch, wenn möglich.', cost: 3, req: ['warrior_2'] },

  scholar_1: { id: 'scholar_1', name: 'Pfad des Gelehrten I', desc: '-10% Schmiedekosten', cost: 1, req: [] },
  scholar_2: { id: 'scholar_2', name: 'Pfad des Gelehrten II', desc: '+20% Offline-Produktion', cost: 2, req: ['scholar_1'] },
  auto_salvage: { id: 'auto_salvage', name: 'Rost-Schredder (Auto)', desc: 'Gewöhnliche Schmiede-Items werden automatisch zu Staub verwertet.', cost: 2, req: ['scholar_2'] },

  explorer_1: { id: 'explorer_1', name: 'Pfad des Entdeckers I', desc: '+10% Expeditions-Erfolg', cost: 1, req: [] },
  explorer_2: { id: 'explorer_2', name: 'Pfad des Entdeckers II', desc: '+20% Expeditions-Belohnung', cost: 2, req: ['explorer_1'] },
  auto_expedition: { id: 'auto_expedition', name: 'Rastlose Sucher (Auto)', desc: 'Freie Mitglieder starten endlos automatisch Expeditionen.', cost: 3, req: ['explorer_2'] },

  // NEU: Audio & Cloud
  master_crafter: { id: 'master_crafter', name: 'Meisterschmied', desc: '+15% Qualität beim Craften', cost: 2, req: ['scholar_1'] },
  auto_craft: { id: 'auto_craft', name: 'Automatischer Katalysator', desc: 'Produziert passiv Katalysator.', cost: 2, req: ['master_crafter'] }
};