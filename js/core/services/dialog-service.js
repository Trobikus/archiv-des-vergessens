/**
 * ============================================================
 * FILE: js/core/services/dialog-service.js – Dialog- & Entscheidungs-Engine
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Einvernehmliche Steuerung aller Entscheidungen (NPC, Lore-Nodes, Boss-Cutscenes)
 * - Auswertung von Bedingungen (Flags, Boss-Fortschritt, Ressourcen, Fraktionen)
 * - Ausführung von Gameplay-Effekten (Ressourcen, Multiplikatoren, Feature-Unlocks)
 * - Setzen von Story-Flags
 * - Freischaltung von Codex-Einträgen
 * - Triggern von visuellen Feedback-Hooks (Event ui:storyPathChanged)
 */

import StateManager from '../state/manager.js';
import { LORE_NODES } from '../../data/lore-nodes.js';
import { EVENTS } from '../events/definitions.js';
import { logger } from '../logger.js';

/** @typedef {import('../events/bus.js').default} EventBus */
/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */
/** @typedef {import('./codex-service.js').default} CodexService */

export class DialogService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   * @param {HeroService} heroService
   * @param {CodexService} [codexService]
   */
  constructor(stateManager, eventBus, resourceService, heroService, codexService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
    this._codexService = codexService || null;
  }

  /**
   * Setzt den CodexService (falls verzögert injiziert).
   */
  setCodexService(codexService) {
    this._codexService = codexService;
  }

  /**
   * Aktiviert einen Lore-Node und schaltet eine Wahl frei.
   * AAA-Anforderung: Jede Wahl triggert dauerhafte Multiplikatoren, Story-Flag, Codex & UI-Event!
   */
  unlockLoreNodeChoice(nodeId, choiceId) {
    const node = LORE_NODES[nodeId];
    if (!node) {
      return { success: false, message: `Lore-Knoten "${nodeId}" nicht gefunden.` };
    }

    const state = this._stateManager.getState();
    const hero = state.hero;

    // 1. Prüfen ob Boss-Fortschritt reicht
    if (hero.prestige.bossProgress < node.requiredBoss) {
      return { success: false, message: `Benötigt das Besiegen von Boss #${node.requiredBoss}.` };
    }

    // 2. Prüfen ob bereits freigeschaltet
    const unlockedNodes = state.storyBranch.unlockedLoreNodes || {};
    if (unlockedNodes[nodeId]) {
      return { success: false, message: 'Dieser Lore-Knoten wurde bereits freigeschaltet.' };
    }

    // 3. Kosten prüfen & abziehen
    if (node.cost && node.cost > 0) {
      const p = BigInt(state.resources.particles || '0');
      if (p < BigInt(node.cost)) {
        return { success: false, message: `Nicht genug Mneme-Partikel (${node.cost} benötigt).` };
      }
      this._resourceService.removeParticles(node.cost);
    }

    const choice = node.choices.find(c => c.id === choiceId);
    if (!choice) {
      return { success: false, message: `Wahl-Option "${choiceId}" nicht gefunden.` };
    }

    // 4. Multiplikatoren anwenden
    const newMultipliers = { ...(state.storyBranch.multipliers || {}) };
    if (choice.effects) {
      for (const [key, val] of Object.entries(choice.effects)) {
        newMultipliers[key] = (newMultipliers[key] || 1.0) * val;
      }
    }

    // 5. Story-Flag setzen
    const newFlags = { ...state.storyBranch.flags };
    if (choice.pathFlag) {
      newFlags[choice.pathFlag] = true;
    }

    // State aktualisieren
    this._stateManager.dispatch((st) => ({
      ...st,
      storyBranch: {
        ...st.storyBranch,
        unlockedLoreNodes: {
          ...(st.storyBranch.unlockedLoreNodes || {}),
          [nodeId]: choiceId
        },
        flags: newFlags,
        multipliers: newMultipliers
      }
    }), 'dialog/unlockLoreNode');

    // 6. Codex freischalten
    if (choice.codexUnlock && this._codexService) {
      if (typeof this._codexService.unlockEntry === 'function') {
        this._codexService.unlockEntry(choice.codexUnlock);
      } else if (typeof this._codexService.unlockFromNPC === 'function') {
        this._codexService.unlockFromNPC(choice.codexUnlock);
      }
    }

    // 7. Visuelle Rückkopplungs-Hooks feuern
    if (choice.visualEffect) {
      this._eventBus.publish('ui:storyPathChanged', {
        pathFlag: choice.pathFlag,
        theme: choice.visualEffect.theme,
        particles: choice.visualEffect.particles,
        glowColor: choice.visualEffect.glowColor
      });
    }

    this._eventBus.publish('story:loreNodeUnlocked', {
      nodeId,
      choiceId,
      choice,
      multipliers: newMultipliers
    });

    this._eventBus.publish(EVENTS.UI_SHOW_TOAST || 'ui:showToast', {
      message: `✨ ${choice.title} freigeschaltet! ${choice.passiveDescription}`,
      type: 'success',
      duration: 4000
    });

    return { success: true, choice };
  }

  /**
   * Verarbeitet globale Entscheidungs-Aktionen von NPC-Optionen oder Branch-Choices.
   */
  processChoiceAction(actionPayload) {
    if (!actionPayload) return;

    if (actionPayload.flag) {
      this.setFlag(actionPayload.flag, actionPayload.value ?? true);
    }

    if (actionPayload.codex) {
      if (this._codexService && typeof this._codexService.unlockEntry === 'function') {
        this._codexService.unlockEntry(actionPayload.codex);
      }
    }

    if (actionPayload.visualEffect) {
      this._eventBus.publish('ui:storyPathChanged', actionPayload.visualEffect);
    }

    if (actionPayload.toast) {
      this._eventBus.publish(EVENTS.UI_SHOW_TOAST || 'ui:showToast', {
        message: actionPayload.toast,
        type: 'info',
        duration: 3000
      });
    }
  }

  /**
   * Setzt eine Story-Flag explizit.
   */
  setFlag(flagName, value = true) {
    this._stateManager.dispatch((state) => ({
      ...state,
      storyBranch: {
        ...state.storyBranch,
        flags: {
          ...state.storyBranch.flags,
          [flagName]: value
        }
      }
    }), 'dialog/setFlag');

    this._eventBus.publish('story:flagChanged', { flag: flagName, value });
  }

  /**
   * Gibt alle aktiven Story-Flags zurück.
   */
  getFlags() {
    return { ...(this._stateManager.getState().storyBranch?.flags || {}) };
  }

  /**
   * Gibt die aktuellen kumulierten Pfad-Multiplikatoren zurück.
   */
  getMultipliers() {
    return { ...(this._stateManager.getState().storyBranch?.multipliers || {}) };
  }
}

export default DialogService;
