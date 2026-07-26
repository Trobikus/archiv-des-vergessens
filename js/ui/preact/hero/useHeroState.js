import { useStateSelector } from '../setup.js';

export function useHeroState(stateManager, bulkRarity) {
  const hero = useStateSelector(stateManager, (state) => state?.hero || null);
  const attributes = useStateSelector(stateManager, (state) => {
    if (!state?.hero) return { attack: 0, defense: 0, agility: 0, stamina: 0 };
    const h = state.hero;
    const base = h.baseStats || { attack: 5, defense: 3, agility: 4, stamina: 6 };
    const spent = h.spentStats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
    return { attack: base.attack + spent.attack, defense: base.defense + spent.defense, agility: base.agility + spent.agility, stamina: base.stamina + spent.stamina };
  });
  const combatStats = useStateSelector(stateManager, (state) => {
    if (!state?.hero) return { maxHp: 100, damageReduction: 0, critChance: 0, critDamage: 150, dodgeChance: 0 };
    const attr = attributes;
    return { ...attr, maxHp: 100 + (attr.stamina * 10) + (attr.defense * 2), damageReduction: attr.defense / (attr.defense + 100), critChance: Math.min(80, 5 + (attr.agility * 0.5)), critDamage: 150 + (attr.attack * 0.5), dodgeChance: Math.min(50, attr.agility * 0.25) };
  });
  const levelProgress = useStateSelector(stateManager, (state) => {
    if (!state?.hero) return 0;
    const h = state.hero;
    return h.expToNext === Infinity ? 100 : (h.experience / h.expToNext) * 100;
  });
  const resources = useStateSelector(stateManager, (state) => {
    if (!state?.resources) return { particles: 0, relics: 0, artifacts: 0, memoryDust: 0 };
    const r = state.resources;
    return { particles: Number(r.particles || '0'), relics: Number(r.relics || '0'), artifacts: Number(r.artifacts || '0'), memoryDust: Number(r.memoryDust || '0') };
  });
  
  return { hero, attributes, combatStats, levelProgress, resources };
}
