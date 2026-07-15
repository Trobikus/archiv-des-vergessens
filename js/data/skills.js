export const SKILL_TREE = {
  warrior_1: { id: 'warrior_1', name: 'Pfad des Kriegers I', desc: '+10% Angriff', cost: 1, req: [] },
  warrior_2: { id: 'warrior_2', name: 'Pfad des Kriegers II', desc: '+20% Boss-Schaden', cost: 2, req: ['warrior_1'] },
  scholar_1: { id: 'scholar_1', name: 'Pfad des Gelehrten I', desc: '-10% Schmiedekosten', cost: 1, req: [] },
  scholar_2: { id: 'scholar_2', name: 'Pfad des Gelehrten II', desc: '+20% Offline-Produktion', cost: 2, req: ['scholar_1'] },
  explorer_1: { id: 'explorer_1', name: 'Pfad des Entdeckers I', desc: '+10% Expeditions-Erfolg', cost: 1, req: [] },
  explorer_2: { id: 'explorer_2', name: 'Pfad des Entdeckers II', desc: '+20% Expeditions-Belohnung', cost: 2, req: ['explorer_1'] }
};