/**
 * ============================================================
 * FILE: core/services/skilltree-service.js – Talentbaum
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Talente definieren
 * - Voraussetzungen prüfen
 * - Talente freischalten
 * - Prestige-Punkte verwalten
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeArray } from '../../utils/sanitizer.js';
import { EVENTS } from '../events/definitions.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */

export class SkillTreeService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;

    // Talent-Definitionen
    this._skills = {
      warrior_1: {
        id: 'warrior_1',
        name: 'Pfad des Kriegers I',
        desc: '+10% Angriff',
        cost: 1,
        req: [],
        effect: (hero) => {
          // Wird in HeroStats berechnet
        }
      },
      warrior_2: {
        id: 'warrior_2',
        name: 'Pfad des Kriegers II',
        desc: '+20% Boss-Schaden',
        cost: 2,
        req: ['warrior_1']
      },
      auto_boss: {
        id: 'auto_boss',
        name: 'Ewiger Kampf (Auto)',
        desc: 'Startet Bosskämpfe automatisch, wenn möglich.',
        cost: 3,
        req: ['warrior_2']
      },
      scholar_1: {
        id: 'scholar_1',
        name: 'Pfad des Gelehrten I',
        desc: '-10% Schmiedekosten',
        cost: 1,
        req: []
      },
      scholar_2: {
        id: 'scholar_2',
        name: 'Pfad des Gelehrten II',
        desc: '+20% Offline-Produktion',
        cost: 2,
        req: ['scholar_1']
      },
      auto_salvage: {
        id: 'auto_salvage',
        name: 'Rost-Schredder (Auto)',
        desc: 'Gewöhnliche Schmiede-Items werden automatisch zu Staub verwertet.',
        cost: 2,
        req: ['scholar_2']
      },
      explorer_1: {
        id: 'explorer_1',
        name: 'Pfad des Entdeckers I',
        desc: '+10% Expeditions-Erfolg',
        cost: 1,
        req: []
      },
      explorer_2: {
        id: 'explorer_2',
        name: 'Pfad des Entdeckers II',
        desc: '+20% Expeditions-Belohnung',
        cost: 2,
        req: ['explorer_1']
      },
      auto_expedition: {
        id: 'auto_expedition',
        name: 'Rastlose Sucher (Auto)',
        desc: 'Freie Mitglieder starten endlos automatisch Expeditionen.',
        cost: 3,
        req: ['explorer_2']
      },
      master_crafter: {
        id: 'master_crafter',
        name: 'Meisterschmied',
        desc: '+15% Qualität beim Craften',
        cost: 2,
        req: ['scholar_1']
      },
      auto_craft: {
        id: 'auto_craft',
        name: 'Automatischer Katalysator',
        desc: 'Produziert passiv Katalysator.',
        cost: 2,
        req: ['master_crafter']
      }
    };
  }

  /**
   * Gibt alle Talente zurück.
   */
  getSkills() {
    return Object.values(this._skills);
  }

  /**
   * Gibt ein bestimmtes Talent zurück.
   */
  getSkill(id) {
    return this._skills[id] || null;
  }

  /**
   * Gibt die freigeschalteten Talente zurück.
   */
  getUnlockedSkills() {
    const state = this._stateManager.getState();
    return state.hero.unlockedSkills || [];
  }

  /**
   * Prüft, ob ein Talent freigeschaltet werden kann.
   */
  canUnlock(skillId) {
    const skill = this._skills[skillId];
    if (!skill) return false;

    const state = this._stateManager.getState();
    const unlocked = state.hero.unlockedSkills || [];
    
    // Bereits freigeschaltet?
    if (unlocked.includes(skillId)) return false;
    
    // Voraussetzungen prüfen
    for (const req of skill.req) {
      if (!unlocked.includes(req)) return false;
    }
    
    // Genug Prestige-Punkte?
    if (state.hero.prestige.points < skill.cost) return false;
    
    return true;
  }

  /**
   * Schaltet ein Talent frei.
   */
  unlockSkill(skillId) {
    const skill = this._skills[skillId];
    if (!skill) {
      return { success: false, message: 'Talent nicht gefunden.' };
    }

    const state = this._stateManager.getState();
    const unlocked = state.hero.unlockedSkills || [];
    
    if (unlocked.includes(skillId)) {
      return { success: false, message: 'Bereits freigeschaltet.' };
    }

    for (const req of skill.req) {
      if (!unlocked.includes(req)) {
        const reqSkill = this._skills[req];
        return { success: false, message: `Voraussetzung "${reqSkill?.name || req}" nicht erfüllt.` };
      }
    }

    if (state.hero.prestige.points < skill.cost) {
      return { success: false, message: `Nicht genug Prestige-Punkte (${skill.cost} benötigt).` };
    }

    // Prestige-Punkte abziehen und Talent freischalten
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        prestige: {
          ...state.hero.prestige,
          points: state.hero.prestige.points - skill.cost
        },
        unlockedSkills: [...unlocked, skillId]
      }
    }), 'skilltree/unlock');

    this._eventBus.publish('skilltree:unlocked', { skillId });
    this._eventBus.publish('hero:updated', {});
    this._eventBus.publish('ui:showToast', {
      message: `🌳 Talent freigeschaltet: ${skill.name}`,
      type: 'success',
      duration: 3000
    });

    return { success: true, message: `${skill.name} freigeschaltet!` };
  }

  /**
   * Gibt die Anzahl der verfügbaren Prestige-Punkte zurück.
   */
  getAvailablePoints() {
    const state = this._stateManager.getState();
    return state.hero.prestige.points || 0;
  }

  /**
   * Gibt den Fortschritt in Prozent zurück.
   */
  getProgress() {
    const state = this._stateManager.getState();
    const unlocked = state.hero.unlockedSkills || [];
    const total = Object.keys(this._skills).length;
    return Math.floor((unlocked.length / total) * 100);
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        unlockedSkills: sanitizeArray(data.unlockedSkills, [])
      }
    }), 'skilltree/load');
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    const state = this._stateManager.getState();
    return {
      unlockedSkills: state.hero.unlockedSkills || []
    };
  }
}

export default SkillTreeService;