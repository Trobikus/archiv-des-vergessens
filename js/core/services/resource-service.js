/**
 * ============================================================
 * FILE: core/services/resource-service.js – Ressourcen-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Alle Ressourcen-Operationen (Add, Remove, Check)
 * - BigInt-Unterstützung für große Zahlen
 * - Keine direkte State-Mutation – dispatched Actions
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectResources, selectParticlesBigInt, selectRelicsBigInt } from '../state/selectors.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

export class ResourceService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   */
  constructor(stateManager, eventBus) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
  }
  
  /**
   * Gibt alle Ressourcen zurück.
   */
  getResources() {
    return selectResources(this._stateManager.getState());
  }
  
  /**
   * Gibt Partikel als BigInt zurück.
   */
  getParticlesBigInt() {
    return selectParticlesBigInt(this._stateManager.getState());
  }
  
  /**
   * Gibt Relikte als BigInt zurück.
   */
  getRelicsBigInt() {
    return selectRelicsBigInt(this._stateManager.getState());
  }
  
  /**
   * Fügt Partikel hinzu.
   */
  addParticles(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;
    
    // Lore-Bonus (Fluss der Seelen)
    const state = this._stateManager.getState();
    let multiplier = 1.0;
    if (state.lore?.decrypted?.node_cataclysm === 'soulflow') {
      multiplier *= 1.20;
    }

    // Finstre Pakte Multiplikatoren
    const activePact = state.hero?.prestige?.activePact;
    if (activePact === 'greedy_souls') {
      multiplier *= 2.0;
    } else if (activePact === 'ruthless_greed') {
      multiplier *= 0.7;
    }

    const finalAmount = Math.floor(safeAmount * multiplier);
    
    this._stateManager.dispatch(Actions.addParticles(finalAmount), 'resource/addParticles');
    this._eventBus.publish('resources:updated', { 
      type: 'particles', 
      amount: finalAmount,
      total: this.getResources().particles
    });
  }
  
  /**
   * Entfernt Partikel (prüft vorher).
   */
  removeParticles(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return false;
    
    const current = this.getParticlesBigInt();
    const remove = BigInt(safeAmount);
    if (current < remove) return false;
    
    this._stateManager.dispatch(Actions.removeParticles(safeAmount), 'resource/removeParticles');
    this._eventBus.publish('resources:updated', { 
      type: 'particles', 
      amount: -safeAmount,
      total: this.getResources().particles
    });
    return true;
  }
  
  /**
   * Fügt Relikte hinzu.
   */
  addRelics(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;
    
    // Lore-Bonus (Stein der Weisen)
    const state = this._stateManager.getState();
    let multiplier = 1.0;
    if (state.lore?.decrypted?.node_cataclysm === 'philosopher') {
      multiplier *= 1.15;
    }

    // Finstre Pakte Multiplikatoren
    const activePact = state.hero?.prestige?.activePact;
    if (activePact === 'greedy_souls') {
      multiplier *= 0.6;
    } else if (activePact === 'ruthless_greed') {
      multiplier *= 1.5;
    }

    const finalAmount = Math.floor(safeAmount * multiplier);
    
    this._stateManager.dispatch(Actions.addRelics(finalAmount), 'resource/addRelics');
    this._eventBus.publish('resources:updated', { 
      type: 'relics', 
      amount: finalAmount,
      total: this.getResources().relics
    });
  }

  /**
   * Entfernt Relikte (prüft vorher, ob genug vorhanden sind).
   */
  removeRelics(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return false;

    const current = this.getRelicsBigInt();
    const remove = BigInt(safeAmount);
    if (current < remove) return false;

    this._stateManager.dispatch(Actions.removeRelics(safeAmount), 'resource/removeRelics');
    this._eventBus.publish('resources:updated', {
      type: 'relics',
      amount: -safeAmount,
      total: this.getResources().relics
    });
    return true;
  }
  
  /**
   * Fügt Artefakte hinzu.
   */
  addArtifacts(amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;

    this._stateManager.dispatch(Actions.addArtifacts(safeAmount), 'resource/addArtifacts');
    this._eventBus.publish('resources:updated', {
      type: 'artifacts',
      amount: safeAmount,
      total: this.getResources().artifacts
    });
  }
  
  /**
   * Setzt alle Ressourcen zurück (für Prestige).
   */
  reset(startParticles = 0) {
    this._stateManager.dispatch((state) => ({
      ...state,
      resources: {
        particles: String(startParticles),
        relics: '0',
        artifacts: '0',
        memoryDust: '0',
        catalyst: '0',
        essence: '0',
        timeBank: 0,
        totalParticles: String(startParticles),
        totalRelics: '0'
      }
    }), 'resource/reset');
    
    this._eventBus.publish('resources:reset', { startParticles });
  }
  
  /**
   * Setzt den Offline-Catchup-Modus (timeBank).
   */
  setTimeBank(seconds) {
    const safeSeconds = sanitizeNumber(seconds, 0);
    this._stateManager.dispatch((state) => ({
      ...state,
      resources: {
        ...state.resources,
        timeBank: safeSeconds
      }
    }), 'resource/setTimeBank');
  }
  
  /**
   * Fügt Zeit zur timeBank hinzu (für Offline-Catchup).
   */
  addTimeBank(seconds) {
    const safeSeconds = sanitizeNumber(seconds, 0);
    if (safeSeconds <= 0) return;
    
    this._stateManager.dispatch((state) => ({
      ...state,
      resources: {
        ...state.resources,
        timeBank: (state.resources.timeBank || 0) + safeSeconds
      }
    }), 'resource/addTimeBank');
  }
}

// ============================================================
// EXPORT
// ============================================================

export default ResourceService;