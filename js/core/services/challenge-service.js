/**
 * ============================================================
 * FILE: core/services/challenge-service.js – Anomalien
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Anomalien definieren
 * - Anomalien starten/abbrechen
 * - Fortschritt prüfen
 * - Belohnungen vergeben
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeArray, sanitizeString } from '../../utils/sanitizer.js';
import { EVENTS } from '../events/definitions.js';
import { CHALLENGES_DATA } from '../../data/challenges.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */

export class ChallengeService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;

    this._challenges = CHALLENGES_DATA;

    this._bindEvents();
  }

  _bindEvents() {
    this._eventBus.subscribe('story:bossDefeated', () => {
      this._checkChallengeProgress();
    });
    this._eventBus.subscribe('hero:prestige', () => {
      this._onPrestige();
    });
  }

  /**
   * Gibt alle Anomalien zurück.
   */
  getChallenges() {
    return Object.values(this._challenges);
  }

  /**
   * Gibt eine bestimmte Anomalie zurück.
   */
  getChallenge(id) {
    return this._challenges[id] || null;
  }

  /**
   * Startet eine Anomalie.
   */
  startChallenge(challengeId) {
    const state = this._stateManager.getState();
    const challenge = this._challenges[challengeId];
    if (!challenge) {
      return { success: false, message: 'Anomalie nicht gefunden.' };
    }

    // Prüfungen
    if (state.challenges.active) {
      return { success: false, message: 'Es läuft bereits eine Anomalie.' };
    }
    if (state.challenges.completed.includes(challengeId)) {
      return { success: false, message: 'Diese Anomalie wurde bereits gemeistert.' };
    }
    if (state.hero.prestige.bossProgress > 0) {
      return { success: false, message: 'Anomalien können nur direkt nach einem Prestige gestartet werden.' };
    }

    // Anomalie starten
    this._stateManager.dispatch((state) => ({
      ...state,
      challenges: {
        ...state.challenges,
        active: challengeId,
        _activeStartTime: Date.now()
      }
    }), 'challenge/start');

    this._eventBus.publish('challenge:started', { challengeId });
    this._eventBus.publish('ui:showToast', {
      message: `🔥 Anomalie gestartet: ${challenge.name}`,
      type: 'warning',
      duration: 3000
    });

    return { success: true, message: `Anomalie '${challenge.name}' gestartet!` };
  }

  /**
   * Bricht die aktuelle Anomalie ab.
   */
  abortChallenge() {
    const state = this._stateManager.getState();
    if (!state.challenges.active) {
      return { success: false, message: 'Keine Anomalie aktiv.' };
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      challenges: {
        ...state.challenges,
        active: null,
        _activeStartTime: null
      }
    }), 'challenge/abort');

    this._eventBus.publish('challenge:aborted', {});
    this._eventBus.publish('ui:showToast', {
      message: '❌ Anomalie abgebrochen.',
      type: 'info',
      duration: 2000
    });

    return { success: true, message: 'Anomalie abgebrochen.' };
  }

  /**
   * Prüft den Fortschritt der aktuellen Anomalie.
   */
  _checkChallengeProgress() {
    const state = this._stateManager.getState();
    const activeId = state.challenges.active;
    if (!activeId) return;

    const challenge = this._challenges[activeId];
    if (!challenge) return;

    const bossProgress = state.hero.prestige.bossProgress;
    const targetChapter = challenge.targetChapter || 3;

    // Prüfen, ob das Ziel erreicht wurde (Kapitel = BossProgress / 10)
    const currentChapter = Math.floor(bossProgress / 10) + 1;

    if (currentChapter >= targetChapter) {
      this._completeChallenge(activeId);
    }
  }

  /**
   * Schließt eine Anomalie erfolgreich ab.
   */
  _completeChallenge(challengeId) {
    const challenge = this._challenges[challengeId];
    if (!challenge) return;

    this._stateManager.dispatch((state) => ({
      ...state,
      challenges: {
        ...state.challenges,
        active: null,
        _activeStartTime: null,
        completed: [...state.challenges.completed, challengeId]
      }
    }), 'challenge/complete');

    // Permanente Boni vergeben
    this._applyPermanentBonus(challengeId);

    this._eventBus.publish('challenge:completed', { challengeId });
    this._eventBus.publish('ui:showToast', {
      message: `🌟 Anomalie '${challenge.name}' gemeistert!`,
      type: 'success',
      duration: 5000
    });
  }

  /**
   * Wendet permanente Boni für eine abgeschlossene Anomalie an.
   */
  _applyPermanentBonus(challengeId) {
    switch (challengeId) {
      case 'pacifist':
        // Zweiter Ring-Slot – wird in der UI abgefragt
        this._stateManager.dispatch((state) => ({
          ...state,
          challenges: {
            ...state.challenges,
            _pacifistUnlocked: true
          }
        }), 'challenge/pacifistBonus');
        this._eventBus.publish('ui:showToast', {
          message: '💍 Zweiter Ring-Slot freigeschaltet!',
          type: 'success',
          duration: 3000
        });
        break;

      case 'drought':
        // +50% Basis-Produktion permanent
        this._stateManager.dispatch((state) => ({
          ...state,
          challenges: {
            ...state.challenges,
            _droughtBonus: true
          }
        }), 'challenge/droughtBonus');
        this._eventBus.publish('ui:showToast', {
          message: '📈 +50% Basis-Produktion permanent!',
          type: 'success',
          duration: 3000
        });
        break;

      default:
        break;
    }
  }

  /**
   * Gibt die permaneten Boni zurück.
   */
  getPermanentBonuses() {
    const state = this._stateManager.getState();
    return {
      pacifistRing: state.challenges._pacifistUnlocked || false,
      droughtBonus: state.challenges._droughtBonus || false
    };
  }

  /**
   * Wird bei Prestige aufgerufen – resetet die aktive Anomalie.
   */
  _onPrestige() {
    const state = this._stateManager.getState();
    if (state.challenges.active) {
      this._stateManager.dispatch((state) => ({
        ...state,
        challenges: {
          ...state.challenges,
          active: null,
          _activeStartTime: null
        }
      }), 'challenge/prestigeReset');
    }
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    this._stateManager.dispatch((state) => ({
      ...state,
      challenges: {
        active: data.active || null,
        completed: sanitizeArray(data.completed, []),
        _pacifistUnlocked: data._pacifistUnlocked || false,
        _droughtBonus: data._droughtBonus || false,
        _activeStartTime: data._activeStartTime || null
      }
    }), 'challenge/load');
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    const state = this._stateManager.getState();
    return {
      active: state.challenges.active || null,
      completed: state.challenges.completed || [],
      _pacifistUnlocked: state.challenges._pacifistUnlocked || false,
      _droughtBonus: state.challenges._droughtBonus || false,
      _activeStartTime: state.challenges._activeStartTime || null
    };
  }
}

export default ChallengeService;