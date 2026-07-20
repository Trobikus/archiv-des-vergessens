/**
 * ============================================================
 * FILE: core/services/story-branch-service.js – Story-Verzweigungen
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Story-Knoten verwalten
 * - Optionen auswählen
 * - Flags setzen
 * - Enden erkennen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { STORY_BRANCHES, getStoryNode, isEndingNode } from '../../data/story_branches.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */

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
   * Gibt den aktuellen Knoten zurück.
   */
  getCurrentNode() {
    const state = this._stateManager.getState();
    const id = state.storyBranch.currentNode;
    return getStoryNode(id);
  }

  /**
   * Gibt die verfügbaren Optionen zurück.
   */
  getAvailableOptions() {
    const node = this.getCurrentNode();
    if (!node || node.isEnding) return [];
    const state = this._stateManager.getState();
    const hero = state.hero;
    const flags = state.storyBranch.flags;

    // Boss-Bedingung prüfen
    if (node.bossRequired && hero.prestige.bossProgress < node.bossRequired) {
      return [];
    }

    return node.options.filter(opt => {
      // Zusätzliche Bedingungen (optional)
      if (opt.condition && !this._evaluateCondition(opt.condition, state)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Wählt eine Option aus.
   */
  chooseOption(optionId) {
    const node = this.getCurrentNode();
    if (!node) {
      return { success: false, message: 'Kein aktueller Knoten.' };
    }
    if (node.isEnding) {
      return { success: false, message: 'Diese Geschichte ist bereits beendet.' };
    }

    const option = node.options.find(o => o.id === optionId);
    if (!option) {
      return { success: false, message: 'Option nicht gefunden.' };
    }

    const state = this._stateManager.getState();
    const hero = state.hero;
    if (node.bossRequired && hero.prestige.bossProgress < node.bossRequired) {
      return { success: false, message: `Du musst zuerst mehr Bosse besiegen (${node.bossRequired} benötigt).` };
    }

    // Flags setzen
    const newFlags = { ...state.storyBranch.flags };
    if (node.flags) {
      for (const [key, value] of Object.entries(node.flags)) {
        newFlags[key] = value;
      }
    }

    // Aktion ausführen
    if (option.action) {
      this._executeAction(option.action, state);
    }

    // Nächsten Knoten bestimmen
    const nextNodeId = option.next;
    const nextNode = getStoryNode(nextNodeId);
    if (!nextNode) {
      return { success: false, message: `Zielknoten "${nextNodeId}" nicht gefunden.` };
    }

    // History aktualisieren
    const history = [
      ...state.storyBranch.history,
      { from: state.storyBranch.currentNode, option: optionId, to: nextNodeId, timestamp: Date.now() }
    ];
    const visited = [...state.storyBranch.visited, nextNodeId];

    this._stateManager.dispatch((state) => ({
      ...state,
      storyBranch: {
        ...state.storyBranch,
        currentNode: nextNodeId,
        flags: newFlags,
        visited,
        history,
        endingReached: nextNode.isEnding || state.storyBranch.endingReached
      }
    }), 'storyBranch/choose');

    if (nextNode.isEnding) {
      this._eventBus.publish('story:endingReached', { endingId: nextNodeId, node: nextNode });
      this._eventBus.publish('ui:showToast', {
        message: `📖 Ende erreicht: ${nextNode.title}`,
        type: 'info',
        duration: 4000
      });
    }

    this._eventBus.publish('story:branchChanged', { nodeId: nextNodeId, node: nextNode });
    return { success: true, node: nextNode };
  }

  /**
   * Setzt die Story zurück.
   */
  resetStory() {
    this._stateManager.dispatch((state) => ({
      ...state,
      storyBranch: {
        currentNode: 'prologue',
        flags: {},
        visited: ['prologue'],
        history: [],
        endingReached: false
      }
    }), 'storyBranch/reset');

    this._eventBus.publish('story:branchReset', {});
  }

  /**
   * Prüft, ob die Story fortgesetzt werden kann.
   */
  canProgress() {
    const node = this.getCurrentNode();
    if (!node || node.isEnding) return false;
    const state = this._stateManager.getState();
    if (node.bossRequired && state.hero.prestige.bossProgress < node.bossRequired) return false;
    return this.getAvailableOptions().length > 0;
  }

  /**
   * Gibt den Fortschritt in Prozent zurück.
   */
  getProgress() {
    const total = Object.keys(STORY_BRANCHES).length;
    const visited = this._stateManager.getState().storyBranch.visited.length;
    return Math.min(100, Math.floor((visited / total) * 100));
  }

  _evaluateCondition(condition, state) {
    // Einfache Bedingungen: z.B. { flag: 'hero_path', value: true }
    if (condition.flag !== undefined) {
      return state.storyBranch.flags[condition.flag] === condition.value;
    }
    if (condition.bossDefeated !== undefined) {
      return state.hero.prestige.defeatedBosses.includes(condition.bossDefeated);
    }
    if (condition.prestigeLevel !== undefined) {
      return state.hero.prestige.level >= condition.prestigeLevel;
    }
    return true;
  }

  _executeAction(action, state) {
    switch (action) {
      case 'trade_particles':
        // Wird im Dialog-UI gehandhabt
        this._eventBus.publish('story:actionTradeParticles', {});
        break;
      default:
        console.log('[StoryBranch] Unbekannte Aktion:', action);
    }
  }

  /**
   * Gibt die Flags zurück.
   */
  getFlags() {
    return { ...this._stateManager.getState().storyBranch.flags };
  }

  /**
   * Gibt die besuchten Knoten zurück.
   */
  getVisitedNodes() {
    return [...this._stateManager.getState().storyBranch.visited];
  }
}

export default StoryBranchService;