/**
 * ============================================================
 * FILE: core/services/hero-service.js – Helden-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Alle Helden-bezogenen Aktionen (Level-Up, Stat-Punkte, Prestige)
 * - Keine direkte State-Mutation – dispatched Actions
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectHero, selectHeroAttributes, selectHeroCombatStats, selectHeroLevelProgress } from '../state/selectors.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import { CONFIG } from '../../data/config.js';

/** @typedef {import('../events/bus.js').default} EventBus */

export class HeroService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   */
  constructor(stateManager, eventBus) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
  }
  
  /**
   * Gibt den Helden-State zurück.
   */
  getHero() {
    return selectHero(this._stateManager.getState());
  }
  
  /**
   * Gibt die Helden-Attribute zurück.
   */
  getAttributes() {
    return selectHeroAttributes(this._stateManager.getState());
  }
  
  /**
   * Gibt die Kampf-Statistiken zurück.
   */
  getCombatStats() {
    return selectHeroCombatStats(this._stateManager.getState());
  }
  
  /**
   * Gibt den Level-Fortschritt zurück.
   */
  getLevelProgress() {
    return selectHeroLevelProgress(this._stateManager.getState());
  }
  
  /**
   * Setzt den Helden-Namen.
   */
  setName(name) {
    this._stateManager.dispatch(Actions.setHeroName(name), 'hero/setName');
    this._eventBus.publish('hero:updated', { name });
  }
  
  /**
   * Setzt den aktiven Titel des Helden.
   */
  setTitle(title) {
    this._stateManager.dispatch(Actions.setHeroTitle(title), 'hero/setTitle');
    this._eventBus.publish('hero:updated', { title });
  }
  
  /**
   * Fügt Erfahrung hinzu (löst Level-Up aus).
   */
  addExperience(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;
    
    const oldLevel = this.getHero().level;
    this._stateManager.dispatch(Actions.addHeroExperience(safeAmount), 'hero/addExperience');
    const newLevel = this.getHero().level;
    
    if (newLevel > oldLevel) {
      this._eventBus.publish('hero:levelUp', { 
        oldLevel, 
        newLevel, 
        statPoints: (newLevel - oldLevel) * 3 
      });
    }
    
    this._eventBus.publish('hero:updated', { experience: safeAmount });
  }
  
  /**
   * Verteilt einen Stat-Punkt.
   */
  spendStatPoint(statKey) {
    const pointsBefore = this.getHero().unspentStatPoints;
    if (pointsBefore <= 0) return false;

    this._stateManager.dispatch(
      Actions.spendStatPoint(statKey),
      'hero/spendStatPoint'
    );
    this._eventBus.publish('hero:updated', { statKey });
    return true;
  }
  
  /**
   * Führt ein Prestige (Verewigung) durch.
   */
  performPrestige(resourceService, clanService) {
    const hero = this.getHero();
    const totalBosses = 20; // Aus Boss-Daten
    
    if (hero.prestige.bossProgress < totalBosses) {
      this._eventBus.publish('ui:showToast', {
        message: '⚔️ Verewigung erst nach dem letzten Boss möglich.',
        type: 'warning',
        duration: 3000
      });
      return { success: false, message: 'Nicht genug Bosse besiegt.' };
    }
    
    // Prestige durchführen
    const newPrestigeLevel = hero.prestige.level + 1;
    const startParticles = 10 * newPrestigeLevel;
    
    // Hero-Reset
    this._stateManager.dispatch((state) => {
      const hero = { ...state.hero };
      hero.level = 1;
      hero.experience = 0;
      hero.expToNext = CONFIG.HERO.BASE_EXP_TO_NEXT;
      hero.unspentStatPoints = 0;
      hero.spentStats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
      hero.equipment = { weapon: null, shield: null, helmet: null, shoulders: null, armor: null, gloves: null, belt: null, boots: null, amulet: null, ring: null, ring2: null };
      hero.inventory = { equipment: [], loot: [] };
      hero.prestige = {
        level: newPrestigeLevel,
        points: hero.prestige.points + 1,
        bossProgress: 0,
        defeatedBosses: []
      };
      hero.clickPowerLevel = 0;
      return { ...state, hero };
    }, 'hero/prestige');
    
    // Ressourcen zurücksetzen (mit Start-Partikeln)
    resourceService.reset(startParticles);
    
    // Clan zurücksetzen
    if (clanService) {
      clanService.reset();
    }
    
    this._eventBus.publish('hero:prestige', { 
      prestigeLevel: newPrestigeLevel,
      startParticles 
    });
    this._eventBus.publish('ui:showToast', {
      message: `🌌 Verewigung abgeschlossen! Prestige Stufe ${newPrestigeLevel}`,
      type: 'success',
      duration: 4000
    });
    
    return { success: true, prestigeLevel: newPrestigeLevel };
  }
}

// ============================================================
// EXPORT
// ============================================================

export default HeroService;