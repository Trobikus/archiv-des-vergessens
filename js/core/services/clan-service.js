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
import RNG from '../../utils/rng.js';
import { CONFIG } from '../../data/config.js';
import { EVENTS } from '../events/definitions.js';
import { Item } from '../../models/item.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */

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
    this._slowTickSubscription = this._eventBus.subscribe(EVENTS.GAME_SLOW_TICK, (data) => {
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
   * Gibt die Details einer aktiven Expedition zurück.
   */
  getActiveExpedition(memberId) {
    return this._activeExpeditions.get(memberId) || null;
  }
  
  /**
   * Rekrutiert ein neues Mitglied.
   */
  recruitMember(role) {
    let cost = 10; // collector
    if (role === 'weaver') cost = 25;
    else if (role === 'guardian') cost = 40;
    else if (role === 'archivist') cost = 200;
    else if (role === 'elder') cost = 500;
    
    const state = this._stateManager.getState();
    const members = state.clan.members;
    const id = state.clan.nextId;

    const firstNames = ['Lyra', 'Theron', 'Kael', 'Elara', 'Vane', 'Sira', 'Jace', 'Rin', 'Valerius', 'Selene', 'Gideon', 'Aurelia', 'Cassian', 'Vespera', 'Helena', 'Lysander', 'Aegon', 'Nyx'];
    const lastNames = ['Nebelläufer', 'Schattenweber', 'Geistwächter', 'Traumwandler', 'Staubgeborener', 'Ewigkeitssucher', 'Seelenwächter', 'Gedankenleser', 'Wortweber', 'Schleierbrecher', 'Runenmeister'];

    let name = '';
    const existingNames = (members || []).map(m => m.name);
    let attempts = 0;
    do {
      const first = firstNames[Math.floor(RNG.next() * firstNames.length)];
      const last = lastNames[Math.floor(RNG.next() * lastNames.length)];
      name = first + ' ' + last;
      attempts++;
    } while (existingNames.includes(name) && attempts < 100);
    
    // Prüfen, ob genug Partikel vorhanden sind
    const particles = BigInt(state.resources.particles || '0');
    if (particles < BigInt(cost)) {
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
      message: `👤 ${name} wurde rekrutiert!`,
      type: 'success',
      duration: 3000
    });
    
    return true;
  }

  /**
   * Entlässt ein Mitglied und erstattet 50% der Partikel-Kosten zurück.
   */
  dismissMember(id) {
    if (this.isOnExpedition(id)) {
      this._eventBus.publish('ui:showToast', {
        message: `⚠️ Dieses Mitglied ist aktuell auf einer Expedition und kann nicht entlassen werden.`,
        type: 'warning',
        duration: 4000
      });
      return false;
    }

    const member = this.getMember(id);
    if (!member) return false;

    // Erstattung berechnen
    let cost = 10;
    if (member.role === 'weaver') cost = 25;
    else if (member.role === 'guardian') cost = 40;
    else if (member.role === 'archivist') cost = 200;
    else if (member.role === 'elder') cost = 500;
    
    const refund = Math.floor(cost * 0.5);

    this._stateManager.dispatch(
      Actions.dismissClanMember(id, refund),
      'clan/dismiss'
    );

    this._eventBus.publish('ui:showToast', {
      message: `👋 ${member.name} wurde entlassen. (+${refund} Partikel)`,
      type: 'info',
      duration: 4000
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
    const state = this._stateManager.getState();
    const activePact = state.hero?.prestige?.activePact;
    let duration = sanitizeNumber(durationSeconds, 20);
    if (activePact === 'solitary_wanderer') {
      duration = Math.floor(duration * 1.5);
    }
    
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
   * Startet eine Expedition für mehrere Mitglieder gleichzeitig (effizient gebatcht).
   */
  startMultipleExpeditions(memberIds, durationSeconds = 20) {
    if (!Array.isArray(memberIds) || memberIds.length === 0) return 0;
    
    const state = this._stateManager.getState();
    const activePact = state.hero?.prestige?.activePact;
    let duration = sanitizeNumber(durationSeconds, 20);
    if (activePact === 'solitary_wanderer') {
      duration = Math.floor(duration * 1.5);
    }
    const successfulStarts = [];
    const newStatuses = {};
    
    for (const memberId of memberIds) {
      const member = this.getMember(memberId);
      if (!member) continue;
      if (this._activeExpeditions.has(memberId)) continue;
      
      const successChance = this._calculateSuccessChance(member);
      
      this._activeExpeditions.set(memberId, {
        remainingTime: duration * 1000,
        duration: duration,
        successChance: clamp(successChance, 0.05, 0.95)
      });
      
      successfulStarts.push(memberId);
      newStatuses[memberId] = true;
      
      // Einzelne Events feuern für bestehende Listener (z.B. Achievements)
      this._eventBus.publish('expedition:started', { memberId, duration, successChance });
    }
    
    if (successfulStarts.length === 0) return 0;
    
    // Status gebatcht im State speichern
    this._stateManager.dispatch((state) => ({
      ...state,
      clan: {
        ...state.clan,
        expeditionStatus: {
          ...state.clan.expeditionStatus,
          ...newStatuses
        }
      }
    }), 'clan/expeditionStartMultiple');
    
    return successfulStarts.length;
  }
  
  /**
   * Verarbeitet einen Slow-Tick (Produktion + Expeditionen).
   */
  _processTick(delta) {
    // Raid-Tick herabstufen mit korrektem Millisekunden-Akkumulator (Fixes Doppel-Geschwindigkeit-Bug)
    const state = this._stateManager.getState();
    const raid = state.clan.raid || {};
    if (raid.active && raid.durationSeconds > 0) {
      this._raidMillisAccumulator = (this._raidMillisAccumulator || 0) + delta;
      if (this._raidMillisAccumulator >= 1000) {
        const secondsPassed = Math.floor(this._raidMillisAccumulator / 1000);
        this._raidMillisAccumulator %= 1000;
        
        const nextSeconds = Math.max(0, raid.durationSeconds - secondsPassed);
        this._stateManager.dispatch((state) => ({
          ...state,
          clan: {
            ...state.clan,
            raid: {
              ...state.clan.raid,
              durationSeconds: nextSeconds
            }
          }
        }), 'clan/raidTick');
        
        if (nextSeconds === 0) {
          this._eventBus.publish('clan:raidComplete', {});
          this._eventBus.publish('ui:showToast', {
            message: '⚔️ Der Clan-Raid wurde siegreich beendet! Fordere deine Beute im Clan-Menü ein.',
            type: 'success',
            duration: 5000
          });
        }
      }
    }

    const prestigeBonus = this._stateManager.getState().hero.prestige.level * 2;
    const libraryBonus = this._stateManager.getState().library.upgrades.clan_boost * 0.05;
    
    this._pendingEvents = null;
    let needsUpdate = false;

    this._stateManager.dispatch((state) => {
      const clan = state.clan;
      // Copy array and shallow clone each member so we do not mutate the frozen store
      const members = clan.members.map(m => ({ ...m }));
      
      let particlesToCreate = BigInt(0);
      let relicsToCreate = BigInt(0);
      
      const memberLevelUps = [];
      const artifactsFound = [];
      
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
          
          member.progress = clamp(remainder, 0, 100);
          needsUpdate = true;
          
          for (let i = 0; i < cycles; i++) {
            // produce resource locally
            const role = member.role;
            if (role === 'collector') {
              particlesToCreate += BigInt(1);
            } else if (role === 'weaver') {
              if (RNG.next() < 0.1) {
                relicsToCreate += BigInt(1);
              } else {
                particlesToCreate += BigInt(2);
              }
            } else if (role === 'guardian') {
              if (RNG.next() < 0.05) {
                artifactsFound.push(member.id);
              } else {
                particlesToCreate += BigInt(3);
              }
            } else if (role === 'archivist') {
              if (RNG.next() < 0.15) {
                relicsToCreate += BigInt(1);
              } else {
                particlesToCreate += BigInt(4);
              }
            } else if (role === 'elder') {
              const rand = RNG.next();
              if (rand < 0.1) {
                artifactsFound.push(member.id);
              } else if (rand < 0.3) {
                relicsToCreate += BigInt(1);
              } else {
                particlesToCreate += BigInt(6);
              }
            }
            
            // add experience locally
            member.experience += CONFIG.CLAN.EXP_PER_CYCLE;
            while (member.experience >= member.expToNextLevel) {
              member.experience -= member.expToNextLevel;
              member.level++;
              member.expToNextLevel = Math.floor(member.expToNextLevel * 1.15);
              memberLevelUps.push({ memberId: member.id, newLevel: member.level });
            }
          }
        } else {
          member.progress = clamp(newProgress, 0, 100);
          needsUpdate = true;
        }
      }
      
      // Update resources in state
      let resources = state.resources;
      if (particlesToCreate > BigInt(0) || relicsToCreate > BigInt(0) || artifactsFound.length > 0) {
        const currentParticles = BigInt(resources.particles || '0');
        const totalParticles = BigInt(resources.totalParticles || '0');
        const currentRelics = BigInt(resources.relics || '0');
        const totalRelics = BigInt(resources.totalRelics || '0');
        const currentArtifacts = BigInt(resources.artifacts || '0');
        
        resources = {
          ...resources,
          particles: String(currentParticles + particlesToCreate),
          totalParticles: String(totalParticles + particlesToCreate),
          relics: String(currentRelics + relicsToCreate),
          totalRelics: String(totalRelics + relicsToCreate),
          artifacts: String(currentArtifacts + BigInt(artifactsFound.length))
        };
      }
      
      this._pendingEvents = {
        memberLevelUps,
        artifactsFound,
        particlesToCreate,
        relicsToCreate
      };
      
      if (needsUpdate || particlesToCreate > BigInt(0) || relicsToCreate > BigInt(0)) {
        return {
          ...state,
          resources,
          clan: {
            ...clan,
            members
          }
        };
      }
      
      return state;
    }, 'clan/processTickBatch');
    
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
    
    // events publizieren
    if (this._pendingEvents) {
      const { memberLevelUps, artifactsFound, particlesToCreate, relicsToCreate } = this._pendingEvents;
      
      for (const lvl of memberLevelUps) {
        this._eventBus.publish('clan:memberLevelUp', lvl);
      }
      for (const memberId of artifactsFound) {
        this._eventBus.publish('clan:artefactFound', { memberId });
      }
      if (artifactsFound.length > 0) {
        this._eventBus.publish('resources:updated', { 
          type: 'artifacts', 
          amount: artifactsFound.length,
          total: this._stateManager.getState().resources.artifacts
        });
      }
      if (particlesToCreate > BigInt(0)) {
        this._eventBus.publish('resources:updated', { 
          type: 'particles', 
          amount: Number(particlesToCreate),
          total: this._stateManager.getState().resources.particles
        });
      }
      if (relicsToCreate > BigInt(0)) {
        this._eventBus.publish('resources:updated', { 
          type: 'relics', 
          amount: Number(relicsToCreate),
          total: this._stateManager.getState().resources.relics
        });
      }
      
      this._pendingEvents = null;
    }
    
    if (needsUpdate || completed.length > 0 || (this.getMembers() && this.getMembers().length > 0)) {
      this._eventBus.publish('clan:membersUpdated', { members: this.getMembers() });
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
        
        // _successfulExpeditions im Helden-Zustand erhöhen (wichtig für Quest q13 & Achievements)
        this._stateManager.dispatch((state) => ({
          ...state,
          hero: {
            ...state.hero,
            _successfulExpeditions: (state.hero._successfulExpeditions || 0) + 1
          }
        }), 'hero/incrementSuccessfulExpeditions');
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
   * Startet eine Clan-Raid-Expedition.
   */
  startClanRaid(memberIds) {
    if (!Array.isArray(memberIds) || memberIds.length === 0 || memberIds.length > 5) {
      return { success: false, message: 'Wähle 1 bis maximal 5 Clan-Mitglieder aus.' };
    }

    const state = this._stateManager.getState();
    const raid = state.clan.raid || {};
    if (raid.active) {
      return { success: false, message: 'Es läuft bereits ein aktiver Clan-Raid.' };
    }

    // Prüfen, ob Mitglieder existieren und nicht bereits auf einer Einzelexpedition sind
    for (const memberId of memberIds) {
      const member = this.getMember(memberId);
      if (!member) {
        return { success: false, message: 'Ein ausgewähltes Mitglied existiert nicht.' };
      }
      if (this.isOnExpedition(memberId)) {
        return { success: false, message: `${member.name} ist bereits auf einer normalen Expedition.` };
      }
    }

    // Dauer: 300 Sekunden (5 Minuten)
    let duration = 300; 
    const activePact = state.hero?.prestige?.activePact;
    if (activePact === 'shadowy_legions') {
      duration = 150; // Clan Raid 50% schneller
    }

    // Im State aktivieren und alle zugewiesenen Mitglieder für Einzelexpeditionen sperren
    const newStatuses = {};
    for (const memberId of memberIds) {
      this._activeExpeditions.set(memberId, {
        remainingTime: duration * 1000,
        duration: duration,
        successChance: 1.0,
        isRaid: true
      });
      newStatuses[memberId] = true;
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      clan: {
        ...state.clan,
        expeditionStatus: {
          ...state.clan.expeditionStatus,
          ...newStatuses
        },
        raid: {
          active: true,
          members: memberIds,
          durationSeconds: duration,
          maxDuration: duration,
          lastRaidTime: Date.now(),
          rewardClaimed: false
        }
      }
    }), 'clan/startRaid');

    this._eventBus.publish('clan:raidStarted', { memberIds, duration });
    this._eventBus.publish('ui:showToast', {
      message: `⚔️ Clan-Raid gestartet! Dauer: 5 Minuten.`,
      type: 'success',
      duration: 3000
    });

    return { success: true };
  }

  /**
   * Fordert die Beute eines abgeschlossenen Clan-Raids ein.
   */
  claimRaidReward() {
    const state = this._stateManager.getState();
    const raid = state.clan.raid || {};
    if (!raid.active || raid.durationSeconds > 0) {
      return { success: false, message: 'Raid ist noch nicht abgeschlossen.' };
    }
    if (raid.rewardClaimed) {
      return { success: false, message: 'Belohnung wurde bereits abgeholt.' };
    }

    // Katalysatoren-Belohnung (1-3)
    const catalystAmount = 1 + Math.floor(RNG.next() * 3);
    const newCatalystCount = BigInt(state.resources.catalyst || '0') + BigInt(catalystAmount);

    // Optionales Bonus-Item (30% Chance)
    let lootedItem = null;
    if (RNG.next() < 0.3) {
      const slots = ['weapon', 'armor', 'amulet', 'ring'];
      const slot = slots[Math.floor(RNG.next() * slots.length)];
      const rarities = ['rare', 'epic', 'legendary'];
      const rarityRoll = RNG.next();
      const rarity = rarityRoll > 0.9 ? 'legendary' : rarityRoll > 0.5 ? 'epic' : 'rare';

      const stats = { attack: 0, defense: 0, agility: 0, stamina: 0 };
      const level = 1;
      const power = 10 + Math.floor(RNG.next() * 10);
      if (slot === 'weapon') stats.attack = power;
      else if (slot === 'armor') stats.defense = power;
      else if (slot === 'amulet') { stats.attack = Math.floor(power/2); stats.stamina = Math.floor(power/2); }
      else { stats.defense = Math.floor(power/2); stats.agility = Math.floor(power/2); }

      lootedItem = new Item(`Schicksalsklinge der Raids`, slot, rarity, stats, 'Gewonnen aus einem heroischen Clan-Raid.', false, level);
    }

    // EP an Teilnehmer verteilen
    const members = raid.members;
    for (const memberId of members) {
      this._addMemberExperience(memberId, 50); // Massive EP
    }

    // State aktualisieren (Raid zurücksetzen, Items & Katalysatoren hinzufügen)
    this._stateManager.dispatch((state) => {
      const updatedHero = { ...state.hero };
      if (lootedItem) {
        updatedHero.inventory = {
          ...updatedHero.inventory,
          equipment: [...updatedHero.inventory.equipment, lootedItem.toJSON()]
        };
      }

      // Expeditions-Sperre für Teilnehmer aufheben
      const newStatuses = { ...state.clan.expeditionStatus };
      for (const memberId of members) {
        newStatuses[memberId] = false;
      }

      return {
        ...state,
        resources: {
          ...state.resources,
          catalyst: String(newCatalystCount)
        },
        hero: updatedHero,
        clan: {
          ...state.clan,
          expeditionStatus: newStatuses,
          raid: {
            active: false,
            members: [],
            durationSeconds: 0,
            maxDuration: 3600,
            lastRaidTime: Date.now(),
            rewardClaimed: true
          }
        }
      };
    }, 'clan/claimRaidReward');

    // Raid-Objekte aus _activeExpeditions entfernen
    for (const memberId of members) {
      this._activeExpeditions.delete(memberId);
    }

    this._eventBus.publish('clan:raidClaimed', { catalystAmount, lootedItem });
    
    let msg = `🎁 Beute abgeholt! +${catalystAmount} Katalysatoren.`;
    if (lootedItem) msg += ` + ${lootedItem.name} (${lootedItem.getRarityLabel()})!`;
    
    this._eventBus.publish('ui:showToast', {
      message: msg,
      type: 'success',
      duration: 5000
    });

    return { success: true, catalystAmount, lootedItem };
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