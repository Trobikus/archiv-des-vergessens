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
    
    this._stateManager.dispatch(Actions.addParticles(safeAmount), 'resource/addParticles');
    this._eventBus.publish('resources:updated', { 
      type: 'particles', 
      amount: safeAmount,
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
    
    this._stateManager.dispatch(Actions.addRelics(safeAmount), 'resource/addRelics');
    this._eventBus.publish('resources:updated', { 
      type: 'relics', 
      amount: safeAmount,
      total: this.getResources().relics
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