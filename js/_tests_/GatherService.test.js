import { calculateGatherAmount, calculateClickPowerUpgradeCost } from '../core/services/gather-service.js';
import { CONFIG } from '../data/config.js';

describe('GatherService', () => {
  describe('calculateGatherAmount', () => {
    it('should calculate base gather amount correctly', () => {
      const state = {
        hero: { clickPowerLevel: 0 },
        library: { upgrades: { gather_boost: 0 } }
      };
      const amount = calculateGatherAmount(state);
      expect(amount).toBe(CONFIG.GATHER.BASE_AMOUNT);
    });

    it('should include click power level in calculation', () => {
      const state = {
        hero: { clickPowerLevel: 2 },
        library: { upgrades: { gather_boost: 0 } }
      };
      const expected = CONFIG.GATHER.BASE_AMOUNT + 2 * CONFIG.GATHER.POWER_MULT;
      const amount = calculateGatherAmount(state);
      expect(amount).toBe(expected);
    });

    it('should include library gather_boost in calculation', () => {
      const state = {
        hero: { clickPowerLevel: 0 },
        library: { upgrades: { gather_boost: 1 } }
      };
      const base = CONFIG.GATHER.BASE_AMOUNT;
      const expected = Math.floor(base * 1.1);
      const amount = calculateGatherAmount(state);
      expect(amount).toBe(expected);
    });

    it('should apply solitary_wanderer pact multiplier (+150%)', () => {
      const state = {
        hero: { 
          clickPowerLevel: 0,
          prestige: { activePact: 'solitary_wanderer' }
        },
        library: { upgrades: { gather_boost: 0 } }
      };
      const base = CONFIG.GATHER.BASE_AMOUNT;
      const expected = Math.floor(base * 2.5);
      const amount = calculateGatherAmount(state);
      expect(amount).toBe(expected);
    });
    
    it('should apply all multipliers together', () => {
        const state = {
          hero: { 
            clickPowerLevel: 3,
            prestige: { activePact: 'solitary_wanderer' }
          },
          library: { upgrades: { gather_boost: 2 } }
        };
        const base = CONFIG.GATHER.BASE_AMOUNT + 3 * CONFIG.GATHER.POWER_MULT;
        const withLibrary = Math.floor(base * 1.2);
        const expected = Math.floor(withLibrary * 2.5);
        const amount = calculateGatherAmount(state);
        expect(amount).toBe(expected);
      });
  });

  describe('calculateClickPowerUpgradeCost', () => {
    it('should calculate base upgrade cost correctly', () => {
      const state = {
        hero: { clickPowerLevel: 0 }
      };
      const cost = calculateClickPowerUpgradeCost(state);
      expect(cost).toBe(CONFIG.GATHER.UPGRADE_BASE_COST);
    });

    it('should calculate cost correctly for higher levels', () => {
      const state = {
        hero: { clickPowerLevel: 3 }
      };
      const expected = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, 3));
      const cost = calculateClickPowerUpgradeCost(state);
      expect(cost).toBe(expected);
    });

    it('should apply ancient_folios pact penalty (+50% cost)', () => {
      const state = {
        hero: { 
          clickPowerLevel: 1,
          prestige: { activePact: 'ancient_folios' }
        }
      };
      const baseCost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, 1));
      const expected = Math.floor(baseCost * 1.5);
      const cost = calculateClickPowerUpgradeCost(state);
      expect(cost).toBe(expected);
    });
  });
});
