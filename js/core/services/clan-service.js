/**
 * ============================================================
 * FILE: core/services/clan-service.js – Clan-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Clan-Mitgliederverwaltung (Rekrutieren, Level-Up)
 * - Expeditionen starten und abschließen
 * - Ressourcenproduktion durch Mitglieder
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectClanMembers, selectClanMember, selectClanMemberExpeditionStatus } from '../state/selectors.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import RNG from '../utils/rng.js';
import { CONFIG } from '../../data/config.js';

export class ClanService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   */
  constructor(stateManager, eventBus, resourceService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._activeExpeditions = new Map();
    this._slowTickSubscription = null;
    
    this._bindSlowTick();
  }
  
  _bindSlowTick() {
    this._slowTickSubscription = this._eventBus.subscribe('game:slowTick', (data) => {
      this._processTick(data.delta);
    });
  }
  
  /**
   * Gibt alle Clan-Mitglieder zurück.
   */
  getMembers() {
    return selectClanMembers(this._stateManager.getState());
  }
  
  /**
   * Gibt ein bestimmtes Mitglied zurück.
   */
  getMember(id) {
    return selectClanMember(this._stateManager.getState(), id);
  }
  
  /**
   * Prüft, ob ein Mitglied auf Expedition ist.
   */
  isOnExpedition(memberId) {
    return this._activeExpeditions.has(memberId);
  }
  
  /**
   * Rekrutiert ein neues Mitglied.
   */
  recruitMember(role) {
    const cost = role === 'collector' ? 10 : role === 'weaver' ? 25 : 40;
    const names = ['Lyra', 'Theron', 'Kael', 'Elara', 'Vane', 'Sira', 'Jace', 'Rin'];
    const name = names[Math.floor(RNG.next() * names.length)] + '_' + Date.now().toString(36);
    
    const state = this._stateManager.getState();
    const members = state.clan.members;
    const id = state.clan.nextId;
    
    // Prüfen, ob genug Partikel vorhanden sind
    const particles = Number(state.resources.particles || '0');
    if (particles < cost) {
      this._eventBus.publish('ui:showToast', {
        message: `❌ Nicht genug Partikel (${cost} benötigt)`,
        type: 'warning',
        duration: 3000
      });
      return false;
    }
    
    this._stateManager.dispatch(
      Actions.recruitClanMember(name, role, cost),
      'clan/recruit'
    );
    
    this._eventBus.publish('clan:memberRecruited', { memberId: id, name, role });
    this._eventBus.publish('ui:showToast', {
      message: `👤 ${name} ist dem Bund beigetreten!`,
      type: 'success',
      duration: 3000
    });
    
    return true;
  }
  
  /**
   * Startet eine Expedition für ein Mitglied.
   */
  startExpedition(memberId, durationSeconds) {
    const member = this.getMember(memberId);
    if (!member) return false;
    if (this._activeExpeditions.has(memberId)) return false;
    
    const successChance = this._calculateSuccessChance(member);
    const duration = sanitizeNumber(durationSeconds, 20);
    
    this._activeExpeditions.set(memberId, {
      remainingTime: duration * 1000,
      duration: duration,
      successChance: clamp(successChance, 0.05, 0.95)
    });
    
    // Expedition-Status im State setzen
    this._stateManager.dispatch((state) => ({
      ...state,
      clan: {
        ...state.clan,
        expeditionStatus: {
          ...state.clan.expeditionStatus,
          [memberId]: true
        }
      }
    }), 'clan/expeditionStart');
    
    this._eventBus.publish('expedition:started', { memberId, duration, successChance });
    return true;
  }
  
  /**
   * Verarbeitet einen Slow-Tick (Produktion + Expeditionen).
   */
  _processTick(delta) {
    // Clan-Mitglieder produzieren Ressourcen
    const members = this.getMembers();
    const hero = this._stateManager.getState().hero;
    const prestigeBonus = hero.prestige.level * 2;
    const libraryBonus = this._stateManager.getState().library.upgrades.clan_boost * 0.05;
    
    let totalProduction = 0;
    let needsUpdate = false;
    
    for (const member of members) {
      if (this._activeExpeditions.has(member.id)) continue;
      
      let rate = member.baseCollectRate * Math.pow(1.05, member.level - 1);
      rate *= (1 + prestigeBonus / 100);
      rate *= (1 + libraryBonus);
      
      const increment = (rate * delta) / CONFIG.CLAN.TICK_RATE_MS * 100;
      const newProgress = member.progress + increment;
      
      if (newProgress >= 100) {
        const cycles = Math.floor(newProgress / 100);
        const remainder = newProgress % 100;
        
        for (let i = 0; i < cycles; i++) {
          this._produceResource(member);
          this._addMemberExperience(member.id, CONFIG.CLAN.EXP_PER_CYCLE);
        }
        
        // Progress aktualisieren
        this._stateManager.dispatch(
          Actions.updateClanMemberProgress(member.id, remainder),
          'clan/progressUpdate'
        );
        needsUpdate = true;
      } else {
        this._stateManager.dispatch(
          Actions.updateClanMemberProgress(member.id, newProgress),
          'clan/progressUpdate'
        );
        needsUpdate = true;
      }
    }
    
    // Expeditionen abarbeiten
    const completed = [];
    for (const [memberId, expedition] of this._activeExpeditions) {
      expedition.remainingTime -= delta;
      if (expedition.remainingTime <= 0) {
        completed.push(memberId);
      }
    }
    
    for (const memberId of completed) {
      this._completeExpedition(memberId);
    }
    
    if (needsUpdate || completed.length > 0) {
      this._eventBus.publish('clan:membersUpdated', { members: this.getMembers() });
    }
  }
  
  /**
   * Produziert Ressourcen durch ein Clan-Mitglied.
   */
  _produceResource(member) {
    const role = member.role;
    if (role === 'collector') {
      this._resourceService.addParticles(1);
    } else if (role === 'weaver') {
      if (RNG.next() < 0.1) {
        this._resourceService.addRelics(1);
      } else {
        this._resourceService.addParticles(2);
      }
    } else if (role === 'guardian') {
      if (RNG.next() < 0.05) {
        // Artefakt hinzufügen (wird später über Forge-Service gemacht)
        this._eventBus.publish('clan:artefactFound', { memberId: member.id });
      } else {
        this._resourceService.addParticles(3);
      }
    }
  }
  
  /**
   * Fügt einem Mitglied Erfahrung hinzu.
   */
  _addMemberExperience(memberId, amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;
    
    this._stateManager.dispatch((state) => {
      const clan = state.clan;
      const index = clan.members.findIndex(m => m.id === memberId);
      if (index === -1) return state;
      
      const members = [...clan.members];
      const member = { ...members[index] };
      member.experience += safeAmount;
      
      while (member.experience >= member.expToNextLevel) {
        member.experience -= member.expToNextLevel;
        member.level++;
        member.expToNextLevel = Math.floor(member.expToNextLevel * 1.15);
        this._eventBus.publish('clan:memberLevelUp', { memberId, newLevel: member.level });
      }
      
      members[index] = member;
      return { ...state, clan: { ...clan, members } };
    }, 'clan/addExperience');
  }
  
  /**
   * Schließt eine Expedition ab.
   */
  _completeExpedition(memberId) {
    const expedition = this._activeExpeditions.get(memberId);
    if (!expedition) return;
    
    this._activeExpeditions.delete(memberId);
    
    // Expedition-Status im State entfernen
    this._stateManager.dispatch((state) => ({
      ...state,
      clan: {
        ...state.clan,
        expeditionStatus: {
          ...state.clan.expeditionStatus,
          [memberId]: false
        }
      }
    }), 'clan/expeditionComplete');
    
    const success = RNG.next() < expedition.successChance;
    let reward = null;
    
    if (success) {
      const member = this.getMember(memberId);
      if (member) {
        reward = this._generateReward(member);
        if (reward.particles) this._resourceService.addParticles(reward.particles);
        if (reward.relics) this._resourceService.addRelics(reward.relics);
        this._addMemberExperience(memberId, 5 + Math.floor(RNG.next() * 5));
      }
    } else {
      this._addMemberExperience(memberId, 1);
    }
    
    this._eventBus.publish('expedition:complete', { memberId, success, reward });
    
    if (success) {
      this._eventBus.publish('ui:showToast', {
        message: `✅ Expedition erfolgreich! ${reward ? '+ ' + Object.entries(reward).map(([k,v]) => `${v} ${k}`).join(' ') : ''}`,
        type: 'success',
        duration: 3000
      });
    } else {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Expedition fehlgeschlagen...',
        type: 'warning',
        duration: 2000
      });
    }
  }
  
  /**
   * Berechnet die Erfolgschance einer Expedition.
   */
  _calculateSuccessChance(member) {
    let base = 0.5;
    let levelBonus = (member.level - 1) * 0.05;
    let roleBonus = 0;
    if (member.role === 'collector') roleBonus = 0.1;
    else if (member.role === 'guardian') roleBonus = 0.2;
    return base + levelBonus + roleBonus;
  }
  
  /**
   * Generiert Belohnungen für eine erfolgreiche Expedition.
   */
  _generateReward(member) {
    const role = member.role;
    if (role === 'collector') {
      return { particles: 5 + Math.floor(RNG.next() * 6) };
    } else if (role === 'weaver') {
      return { relics: 1 + Math.floor(RNG.next() * 2) };
    } else if (role === 'guardian') {
      return { artifacts: 1 };
    }
    return {};
  }
  
  /**
   * Setzt den Clan zurück (für Prestige).
   */
  reset() {
    this._activeExpeditions.clear();
    this._stateManager.dispatch((state) => ({
      ...state,
      clan: {
        members: [],
        nextId: 10,
        expeditionStatus: {}
      }
    }), 'clan/reset');
    
    this._eventBus.publish('clan:reset', {});
  }
  
  /**
   * Bereinigt abgelaufene Expeditionen (wird beim Laden aufgerufen).
   */
  cleanupExpeditions() {
    for (const [memberId] of this._activeExpeditions) {
      this._completeExpedition(memberId);
    }
  }
  
  /**
   * Zerstört den Service (Cleanup).
   */
  destroy() {
    if (this._slowTickSubscription !== null) {
      this._eventBus.unsubscribe(this._slowTickSubscription);
      this._slowTickSubscription = null;
    }
    this._activeExpeditions.clear();
  }
}

// ============================================================
// EXPORT
// ============================================================

export default ClanService;