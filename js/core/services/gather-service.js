import { CONFIG } from '../../data/config.js';

export function calculateGatherAmount(state) {
  const clickPowerLevel = state.hero?.clickPowerLevel || 0;
  const base = CONFIG.GATHER.BASE_AMOUNT + clickPowerLevel * CONFIG.GATHER.POWER_MULT;
  const gatherLevel = state.library?.upgrades?.gather_boost || 0;
  const libraryBonus = gatherLevel * 0.10;
  
  let amount = Math.floor(base * (1 + libraryBonus));
  const activePact = state.hero?.prestige?.activePact;
  if (activePact === 'solitary_wanderer') {
    amount = Math.floor(amount * 2.5); // +150% Gather
  }
  
  return amount;
}

export function calculateClickPowerUpgradeCost(state) {
  const clickPowerLevel = state.hero?.clickPowerLevel || 0;
  let cost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, clickPowerLevel));
  
  const activePact = state.hero?.prestige?.activePact;
  if (activePact === 'ancient_folios') {
    cost = Math.floor(cost * 1.5); // +50% Upgrade-Kosten
  }
  
  return cost;
}
