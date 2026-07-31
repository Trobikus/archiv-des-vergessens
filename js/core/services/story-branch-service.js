/**
 * ============================================================
 * FILE: core/services/story-branch-service.js - Story-Verzweigungen
 * ============================================================
 *
 * VERANTWORTUNG:
 * - Story-Knoten verwalten
 * - Optionen auswaehlen (flag- und zustandsabhaengig)
 * - Flags setzen (Knoten- und Options-Flags, Affinitaet)
 * - Enden erkennen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { STORY_BRANCHES, getStoryNode, isEndingNode } from '../../data/story_branches.js';
import { logger } from '../logger.js';

/** @typedef {import('../events/bus.js').default} EventBus */
/** @typedef {import('./hero-service.js').default} HeroService */

/**
 * @typedef {Object} StoryCondition
 * @property {string} [flag] Einzelnes Flag muss value entsprechen (Default: true)
 * @property {*} [value]
 * @property {string[]} [requireFlags] Alle Flags muessen truthy sein
 * @property {string[]} [excludeFlags] Keines dieser Flags darf truthy sein
 * @property {string[]} [anyFlags] Mindestens eines muss truthy sein
 * @property {Object.<string, *>} [flags] Map flag zu erwartetem Wert (alle muessen matchen)
 * @property {number} [bossDefeated] Boss-ID muss in defeatedBosses sein
 * @property {number} [minBossProgress]
 * @property {number} [prestigeLevel]
 * @property {number} [minAethel]
 * @property {number} [minLethe]
 * @property {number} [maxAethel]
 * @property {number} [maxLethe]
 * @property {'and'|'or'} [op] Verknuepfung bei verschachtelten conditions
 * @property {StoryCondition[]} [conditions] Verschachtelte Bedingungen
 */

export class StoryBranchService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
  }

  /**
   * Gibt den aktuellen Knoten zurueck.
   */
  getCurrentNode() {
    const state = this._stateManager.getState();
    const id = state.storyBranch.currentNode;
    return getStoryNode(id);
  }

  /**
   * Gibt die verfuegbaren Optionen zurueck (Flags + Boss-Gate gefiltert).
   */
  getAvailableOptions() {
    const node = this.getCurrentNode();
    if (!node || node.isEnding) return [];
    const state = this._stateManager.getState();
    const hero = state.hero;

    if (node.bossRequired && hero.prestige.bossProgress < node.bossRequired) {
      return [];
    }

    return (node.options || []).filter((opt) => this._isOptionAvailable(opt, state));
  }

  /**
   * Prueft, ob eine Option unter dem aktuellen State waehlbar ist.
   * @param {Object} opt
   * @param {Object} state
   * @returns {boolean}
   */
  _isOptionAvailable(opt, state) {
    if (!opt) return false;
    if (opt.condition && !this._evaluateCondition(opt.condition, state)) {
      return false;
    }
    // Kurzform: requireFlags / excludeFlags direkt auf der Option
    if (opt.requireFlags && !this._allFlagsTruthy(state.storyBranch.flags, opt.requireFlags)) {
      return false;
    }
    if (opt.excludeFlags && this._anyFlagTruthy(state.storyBranch.flags, opt.excludeFlags)) {
      return false;
    }
    if (opt.anyFlags && !this._anyFlagTruthy(state.storyBranch.flags, opt.anyFlags)) {
      return false;
    }
    return true;
  }

  /**
   * Waehlt eine Option aus.
   * @param {string} optionId
   */
  chooseOption(optionId) {
    const node = this.getCurrentNode();
    if (!node) {
      return { success: false, message: 'Kein aktueller Knoten.' };
    }
    if (node.isEnding) {
      return { success: false, message: 'Diese Geschichte ist bereits beendet.' };
    }

    const option = (node.options || []).find((o) => o.id === optionId);
    if (!option) {
      return { success: false, message: 'Option nicht gefunden.' };
    }

    const state = this._stateManager.getState();
    const hero = state.hero;

    if (node.bossRequired && hero.prestige.bossProgress < node.bossRequired) {
      return {
        success: false,
        message: `Du musst zuerst mehr Bosse besiegen (${node.bossRequired} benoetigt).`
      };
    }

    if (!this._isOptionAvailable(option, state)) {
      return { success: false, message: 'Diese Option ist mit deinem bisherigen Pfad nicht verfuegbar.' };
    }

    // Flags: Knoten-Flags + Options-Flags mergen
    const newFlags = this._mergeFlags(state.storyBranch.flags, node.flags, option.flags);

    // Affinitaet aus Pfad-Flags ableiten / erhoehen
    this._applyAffinityFromFlags(newFlags, node.flags, option.flags);

    if (option.action) {
      this._executeAction(option.action, state);
    }

    const nextNodeId = option.next;
    const nextNode = getStoryNode(nextNodeId);
    if (!nextNode) {
      return { success: false, message: `Zielknoten "${nextNodeId}" nicht gefunden.` };
    }

    const history = [
      ...state.storyBranch.history,
      {
        from: state.storyBranch.currentNode,
        option: optionId,
        to: nextNodeId,
        timestamp: Date.now()
      }
    ];
    const visited = state.storyBranch.visited.includes(nextNodeId)
      ? [...state.storyBranch.visited]
      : [...state.storyBranch.visited, nextNodeId];

    this._stateManager.dispatch(
      (s) => ({
        ...s,
        storyBranch: {
          ...s.storyBranch,
          currentNode: nextNodeId,
          flags: newFlags,
          visited,
          history,
          endingReached: nextNode.isEnding || s.storyBranch.endingReached
        }
      }),
      'storyBranch/choose'
    );

    // Zielknoten-Flags sofort anwenden (Betreten des Knotens)
    if (nextNode.flags && Object.keys(nextNode.flags).length > 0) {
      this._stateManager.dispatch((s) => {
        const merged = this._mergeFlags(s.storyBranch.flags, nextNode.flags, null);
        this._applyAffinityFromFlags(merged, nextNode.flags, null);
        return {
          ...s,
          storyBranch: {
            ...s.storyBranch,
            flags: merged
          }
        };
      }, 'storyBranch/enterNodeFlags');
    }

    if (nextNode.isEnding) {
      this._eventBus.publish('story:endingReached', { endingId: nextNodeId, node: nextNode });
      this._eventBus.publish('ui:showToast', {
        message: `Ende erreicht: ${nextNode.title}`,
        type: 'info',
        duration: 4000
      });
    }

    this._eventBus.publish('story:branchChanged', {
      nodeId: nextNodeId,
      node: nextNode,
      flags: this.getFlags()
    });

    return { success: true, node: nextNode, flags: this.getFlags() };
  }

  /**
   * Setzt die Story zurueck.
   */
  resetStory() {
    this._stateManager.dispatch(
      (state) => ({
        ...state,
        storyBranch: {
          currentNode: 'prologue',
          flags: {},
          visited: ['prologue'],
          history: [],
          endingReached: false
        }
      }),
      'storyBranch/reset'
    );

    this._eventBus.publish('story:branchReset', {});
  }

  /**
   * Prueft, ob die Story fortgesetzt werden kann.
   */
  canProgress() {
    const node = this.getCurrentNode();
    if (!node || node.isEnding) return false;
    const state = this._stateManager.getState();
    if (node.bossRequired && state.hero.prestige.bossProgress < node.bossRequired) {
      return false;
    }
    return this.getAvailableOptions().length > 0;
  }

  /**
   * Gibt den Fortschritt in Prozent zurueck.
   */
  getProgress() {
    const total = Object.keys(STORY_BRANCHES).length;
    const visited = this._stateManager.getState().storyBranch.visited.length;
    return Math.min(100, Math.floor((visited / total) * 100));
  }

  /**
   * Gibt die Flags zurueck (Kopie).
   */
  getFlags() {
    return { ...this._stateManager.getState().storyBranch.flags };
  }

  /**
   * Prueft ein einzelnes Flag.
   * @param {string} key
   * @param {*} [expected=true]
   */
  hasFlag(key, expected = true) {
    const flags = this._stateManager.getState().storyBranch.flags;
    if (expected === true) return !!flags[key];
    return flags[key] === expected;
  }

  /**
   * Setzt ein Flag manuell (z.B. aus Dialogen / Lore-Nodes).
   * @param {string} key
   * @param {*} value
   */
  setFlag(key, value = true) {
    this._stateManager.dispatch(
      (state) => ({
        ...state,
        storyBranch: {
          ...state.storyBranch,
          flags: {
            ...state.storyBranch.flags,
            [key]: value
          }
        }
      }),
      'storyBranch/setFlag'
    );
    this._eventBus.publish('story:flagsChanged', { flags: this.getFlags() });
  }

  /**
   * Setzt mehrere Flags auf einmal.
   * @param {Object.<string, *>} flagMap
   */
  setFlags(flagMap) {
    if (!flagMap || typeof flagMap !== 'object') return;
    this._stateManager.dispatch(
      (state) => ({
        ...state,
        storyBranch: {
          ...state.storyBranch,
          flags: {
            ...state.storyBranch.flags,
            ...flagMap
          }
        }
      }),
      'storyBranch/setFlags'
    );
    this._eventBus.publish('story:flagsChanged', { flags: this.getFlags() });
  }

  /**
   * Gibt die besuchten Knoten zurueck.
   */
  getVisitedNodes() {
    return [...this._stateManager.getState().storyBranch.visited];
  }

  /**
   * Aethel-/Lethe-Affinitaet (0-100, aus Flags).
   */
  getAffinity() {
    const flags = this.getFlags();
    return {
      aethel: Math.min(100, Number(flags.aethel_affinity) || 0),
      lethe: Math.min(100, Number(flags.lethe_affinity) || 0)
    };
  }

  // ---- Condition Engine ----

  /**
   * Wertet eine Bedingung gegen den State aus.
   * @param {StoryCondition|string} condition Objekt oder Flag-Name (truthy)
   * @param {Object} state
   * @returns {boolean}
   */
  _evaluateCondition(condition, state) {
    if (condition == null) return true;

    // Kurzform: String = Flag muss truthy sein
    if (typeof condition === 'string') {
      return !!state.storyBranch.flags[condition];
    }

    if (typeof condition !== 'object') return true;

    const flags = state.storyBranch.flags || {};
    const hero = state.hero;
    const results = [];

    // Verschachtelung
    if (Array.isArray(condition.conditions) && condition.conditions.length > 0) {
      const nested = condition.conditions.map((c) => this._evaluateCondition(c, state));
      const op = condition.op === 'or' ? 'or' : 'and';
      results.push(op === 'or' ? nested.some(Boolean) : nested.every(Boolean));
    }

    if (condition.flag !== undefined) {
      const expected = condition.value !== undefined ? condition.value : true;
      results.push(flags[condition.flag] === expected || (expected === true && !!flags[condition.flag]));
    }

    if (condition.flags && typeof condition.flags === 'object') {
      results.push(
        Object.entries(condition.flags).every(([k, v]) => {
          if (v === true) return !!flags[k];
          if (v === false) return !flags[k];
          return flags[k] === v;
        })
      );
    }

    if (condition.requireFlags) {
      results.push(this._allFlagsTruthy(flags, condition.requireFlags));
    }

    if (condition.excludeFlags) {
      results.push(!this._anyFlagTruthy(flags, condition.excludeFlags));
    }

    if (condition.anyFlags) {
      results.push(this._anyFlagTruthy(flags, condition.anyFlags));
    }

    if (condition.bossDefeated !== undefined) {
      results.push((hero.prestige.defeatedBosses || []).includes(condition.bossDefeated));
    }

    if (condition.minBossProgress !== undefined) {
      results.push((hero.prestige.bossProgress || 0) >= condition.minBossProgress);
    }

    if (condition.prestigeLevel !== undefined) {
      results.push((hero.prestige.level || 0) >= condition.prestigeLevel);
    }

    if (condition.minAethel !== undefined) {
      results.push((Number(flags.aethel_affinity) || 0) >= condition.minAethel);
    }
    if (condition.minLethe !== undefined) {
      results.push((Number(flags.lethe_affinity) || 0) >= condition.minLethe);
    }
    if (condition.maxAethel !== undefined) {
      results.push((Number(flags.aethel_affinity) || 0) <= condition.maxAethel);
    }
    if (condition.maxLethe !== undefined) {
      results.push((Number(flags.lethe_affinity) || 0) <= condition.maxLethe);
    }

    if (results.length === 0) return true;

    const op = condition.op === 'or' ? 'or' : 'and';
    return op === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  _allFlagsTruthy(flags, keys) {
    if (!Array.isArray(keys) || keys.length === 0) return true;
    return keys.every((k) => !!flags[k]);
  }

  _anyFlagTruthy(flags, keys) {
    if (!Array.isArray(keys) || keys.length === 0) return false;
    return keys.some((k) => !!flags[k]);
  }

  /**
   * Merged bestehende Flags mit Knoten- und Options-Flags.
   * Spezielle Keys: aethel_affinity / lethe_affinity werden addiert, nicht ueberschrieben.
   */
  _mergeFlags(current, nodeFlags, optionFlags) {
    const out = { ...current };

    const apply = (src) => {
      if (!src || typeof src !== 'object') return;
      for (const [key, value] of Object.entries(src)) {
        if (key === 'aethel_affinity' || key === 'lethe_affinity') {
          const prev = Number(out[key]) || 0;
          const add = Number(value) || 0;
          out[key] = Math.min(100, prev + add);
        } else {
          out[key] = value;
        }
      }
    };

    apply(nodeFlags);
    apply(optionFlags);
    return out;
  }

  /**
   * Erhoeht Affinitaet anhand bekannter Pfad-Flags, falls noch nicht gesetzt.
   */
  _applyAffinityFromFlags(flags, nodeFlags, optionFlags) {
    const sources = [nodeFlags, optionFlags].filter(Boolean);
    let aethelDelta = 0;
    let letheDelta = 0;

    const aethelKeys = [
      'hero_path',
      'guardian_path',
      'secrets_path',
      'god_path',
      'seal_path',
      'epic_path',
      'malakor_spared',
      'theron_heard'
    ];
    const letheKeys = [
      'coward_path',
      'hidden_path',
      'scholar_path',
      'rebel_path',
      'lone_wolf_path',
      'void_path',
      'lethe_affinity',
      'nyx_heard',
      'knowledge_gained'
    ];

    for (const src of sources) {
      for (const k of aethelKeys) {
        if (src[k] && !flags[`_aff_applied_${k}`]) {
          aethelDelta += 8;
          flags[`_aff_applied_${k}`] = true;
        }
      }
      for (const k of letheKeys) {
        if (k === 'lethe_affinity') continue;
        if (src[k] && !flags[`_aff_applied_${k}`]) {
          letheDelta += 8;
          flags[`_aff_applied_${k}`] = true;
        }
      }
    }

    if (aethelDelta > 0) {
      flags.aethel_affinity = Math.min(100, (Number(flags.aethel_affinity) || 0) + aethelDelta);
    }
    if (letheDelta > 0) {
      flags.lethe_affinity = Math.min(100, (Number(flags.lethe_affinity) || 0) + letheDelta);
    }
  }

  _executeAction(action, state) {
    switch (action) {
      case 'trade_particles':
        this._eventBus.publish('story:actionTradeParticles', {});
        break;
      default:
        logger.warn('[StoryBranch] Unbekannte Aktion:', action);
    }
  }

  destroy() {
    // Keine Subscriptions - no-op fuer DI-Kompatibilitaet
  }
}

export default StoryBranchService;
