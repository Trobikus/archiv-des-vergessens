/**
 * ============================================================
 * FILE: core/services/codex-service.js – Codex (Lore & Wissen)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Codex-Einträge verwalten
 * - Einträge freischalten (durch Bosse, Crafting, NPCs)
 * - Fortschritt berechnen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeObject } from '../../utils/sanitizer.js';
import { EVENTS } from '../events/definitions.js';
import { CODEX_ENTRIES } from '../../data/codex_entries.js';
import { LORE_NODES } from '../../data/lore-nodes.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */

export class CodexService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;

    this._allEntries = this._initializeEntries();

    this._bindEvents();
  }

  _initializeEntries() {
    const entries = {};
    for (const [key, entry] of Object.entries(CODEX_ENTRIES)) {
      entries[key] = {
        ...entry,
        unlocked: false,
        unlockedAt: null
      };
    }
    return entries;
  }

  _bindEvents() {
    this._eventBus.subscribe('story:bossDefeated', (data) => {
      this._onBossDefeated(data);
    });
    this._eventBus.subscribe('forge:crafted', (data) => {
      this._onCrafted(data);
    });
    this._eventBus.subscribe('story:endingReached', (data) => {
      this._onEnding(data);
    });
    this._eventBus.subscribe('achievement:unlocked', () => {
      this._onAchievement();
    });
  }

  /**
   * Schaltet einen Codex-Eintrag frei.
   */
  unlockEntry(entryId) {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};

    if (!entries[entryId]) {
      // Neueintrag – initialisieren
      const entryDef = this._allEntries[entryId];
      if (!entryDef) return false;
      
      this._stateManager.dispatch((state) => ({
        ...state,
        codex: {
          ...state.codex,
          entries: {
            ...state.codex.entries,
            [entryId]: { ...entryDef, unlocked: true, unlockedAt: Date.now() }
          }
        }
      }), 'codex/unlock');
      
      this._eventBus.publish('codex:entryUnlocked', { entryId, entry: entryDef });
      this._eventBus.publish('ui:showToast', {
        message: `📖 Codex-Eintrag freigeschaltet: ${entryDef.title}`,
        type: 'success',
        duration: 3000
      });
      return true;
    }

    if (entries[entryId].unlocked) return false;

    const entryDef = this._allEntries[entryId];
    if (!entryDef) return false;

    this._stateManager.dispatch((state) => ({
      ...state,
      codex: {
        ...state.codex,
        entries: {
          ...state.codex.entries,
          [entryId]: { ...entryDef, unlocked: true, unlockedAt: Date.now() }
        }
      }
    }), 'codex/unlock');

    this._eventBus.publish('codex:entryUnlocked', { entryId, entry: entryDef });
    this._eventBus.publish('ui:showToast', {
      message: `📖 Codex-Eintrag freigeschaltet: ${entryDef.title}`,
      type: 'success',
      duration: 3000
    });
    return true;
  }

  /**
   * Prüft, ob ein Eintrag freigeschaltet ist.
   */
  isUnlocked(entryId) {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};
    return entries[entryId]?.unlocked || false;
  }

  /**
   * Gibt einen Eintrag zurück.
   */
  getEntry(entryId) {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};
    return entries[entryId] || null;
  }

  /**
   * Gibt alle Einträge zurück.
   */
  getAllEntries() {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};
    return Object.values(entries);
  }

  /**
   * Gibt Einträge einer Kategorie zurück.
   */
  getEntriesByCategory(category) {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};
    return Object.values(entries).filter(e => e.category === category);
  }

  /**
   * Gibt die Anzahl der freigeschalteten Einträge zurück.
   */
  getUnlockedCount() {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};
    return Object.values(entries).filter(e => e.unlocked).length;
  }

  /**
   * Gibt die Gesamtanzahl der Einträge zurück.
   */
  getTotalCount() {
    return Object.keys(this._allEntries).length;
  }

  /**
   * Gibt den Fortschritt in Prozent zurück.
   */
  getProgress() {
    const total = this.getTotalCount();
    if (total === 0) return 0;
    return Math.floor((this.getUnlockedCount() / total) * 100);
  }

  /**
   * Schaltet Einträge durch NPC-Interaktionen frei.
   */
  unlockFromNPC(npcId) {
    const npcMap = {
      'archivist': ['origin_of_mneme', 'the_great_forgetting'],
      'merchant': ['mneme_crown', 'forgotten_chamber'],
      'guardian_npc': ['the_covenant', 'shadow_guardian'],
      'shadow_voice': ['nyx', 'the_great_forgetting']
    };

    const entries = npcMap[npcId] || [];
    for (const id of entries) {
      this.unlockEntry(id);
    }
  }

  // ---- EVENT-HANDLER ----

  _onBossDefeated(data) {
    const boss = data.boss;
    if (!boss) return;

    // Boss-Einträge freischalten (basierend auf Boss-Namen)
    const bossEntries = Object.values(this._allEntries).filter(e =>
      e.category === 'bosses' && e.title?.toLowerCase().includes(boss.name?.toLowerCase() || '')
    );
    for (const entry of bossEntries) {
      this.unlockEntry(entry.id);
    }

    // Spezielle Lore-Einträge
    if (boss.id === 1) this.unlockEntry('origin_of_mneme');
    if (boss.id === 5) this.unlockEntry('the_great_forgetting');
    if (boss.id === 10) this.unlockEntry('the_covenant');
  }

  _onCrafted(data) {
    const item = data.item;
    if (!item) return;

    if (item.rarity === 'legendary') {
      this.unlockEntry('mneme_crown');
    }
    if (item.rarity === 'epic' && item.slot === 'weapon') {
      this.unlockEntry('ancient_blade');
    }
  }

  _onEnding(data) {
    const endingId = data.endingId;
    if (!endingId) return;

    // Ende-Eintrag freischalten
    const entry = Object.values(this._allEntries).find(e =>
      e.category === 'endings' && e.id === endingId
    );
    if (entry) this.unlockEntry(entry.id);
  }

  _onAchievement() {
    // Kann verwendet werden, um Codex-Einträge für Erfolge freizuschalten
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    
    const entries = {};
    for (const [key, entryData] of Object.entries(data)) {
      const entryDef = this._allEntries[key];
      if (entryDef) {
        entries[key] = {
          ...entryDef,
          unlocked: entryData.unlocked || false,
          unlockedAt: entryData.unlockedAt || null
        };
      }
    }
    
    this._stateManager.dispatch((state) => ({
      ...state,
      codex: {
        ...state.codex,
        entries
      }
    }), 'codex/load');
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    const state = this._stateManager.getState();
    const entries = state.codex.entries || {};
    const result = {};
    for (const [key, entry] of Object.entries(entries)) {
      result[key] = {
        unlocked: entry.unlocked || false,
        unlockedAt: entry.unlockedAt || null
      };
    }
    return result;
  }

  /**
   * Entschlüsselt einen Lore-Chroniken-Knoten.
   */
  decryptNode(nodeId, choiceId) {
    const node = LORE_NODES[nodeId];
    if (!node) return false;

    const state = this._stateManager.getState();
    const decrypted = state.lore?.decrypted || {};

    if (decrypted[nodeId]) {
      this._eventBus.publish('ui:showToast', {
        message: '⚠️ Dieser Eintrag wurde bereits dechiffriert.',
        type: 'warning',
        duration: 3000
      });
      return false;
    }

    const bossProgress = state.hero.prestige?.bossProgress || 0;
    const prestigeLevel = state.hero.prestige?.level || 0;
    const currentMaxBoss = (prestigeLevel * 20) + bossProgress;
    if (currentMaxBoss < node.requiredBoss) {
      this._eventBus.publish('ui:showToast', {
        message: `🔒 Benötigt das Besiegen von Boss ${node.requiredBoss}.`,
        type: 'warning',
        duration: 3000
      });
      return false;
    }

    const rawParticles = BigInt(state.resources.particles || '0');
    const cost = BigInt(node.cost);
    if (rawParticles < cost) {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Nicht genügend Mneme-Partikel vorhanden.',
        type: 'error',
        duration: 3000
      });
      return false;
    }

    const choice = node.choices.find(c => c.id === choiceId);
    if (!choice) return false;

    const nextParticles = (rawParticles - cost).toString();
    this._stateManager.dispatch((state) => ({
      ...state,
      resources: {
        ...state.resources,
        particles: nextParticles
      },
      lore: {
        ...state.lore,
        decrypted: {
          ...state.lore?.decrypted,
          [nodeId]: choiceId
        }
      }
    }), 'lore/decryptNode');

    this._eventBus.publish('lore:nodeDecrypted', { nodeId, choiceId, effects: choice.effects });
    this._eventBus.publish('ui:showToast', {
      message: `🕯️ Chronik dechiffriert: ${node.title}!`,
      type: 'success',
      duration: 3000
    });

    return true;
  }
}

export default CodexService;