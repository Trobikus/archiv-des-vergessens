/**
 * ============================================================
 * FILE: core/game/loop.js – Spiel-Loop (v2.0)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - requestAnimationFrame-basierte Loop
 * - Anti-Speed-Hack (Delta-Clamping)
 * - Logic-Tick (100ms) und Slow-Tick (500ms)
 * - Catchup-Modus für Offline-Zeit
 * ============================================================
 */

import { EVENTS } from '../events/definitions.js';
import { CONFIG } from '../../data/config.js';

/** @typedef {import('../events/bus.js').default} EventBus */
/** @typedef {import('../state/manager.js').default} StateManager */

export class GameLoop {
  /**
   * @param {Object} context
   * @param {EventBus} context.eventBus
   * @param {StateManager} context.stateManager
   * @param {Object} context.services – ResourceService, ClanService, StoryService
   */
  constructor({ eventBus, stateManager, services }) {
    this._eventBus = eventBus;
    this._stateManager = stateManager;
    this._services = services;
    this._running = false;
    this._lastTimestamp = 0;
    this._lastLogicTick = 0;
    this._lastSlowTick = 0;
    this._logicInterval = CONFIG.SYSTEM.LOGIC_TICK_MS || 100;
    this._slowInterval = CONFIG.SYSTEM.SLOW_TICK_MS || 500;
    this._maxDelta = 100;
    this._frameId = null;
    this._catchupActive = false;
    this._speedWarned = false;
    // Einmalig binden – kein GC-Druck durch neue Funktion pro Frame
    this._boundTick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    const now = performance.now();
    this._lastTimestamp = now;
    this._lastLogicTick = now;
    this._lastSlowTick = now;
    this._catchupActive = this._stateManager.getState().resources.timeBank > 0;
    this._frameId = requestAnimationFrame(this._boundTick);
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  _tick(timestamp) {
    if (!this._running) return;

    let delta = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    // Sicherheit: Delta kappen (Anti-Speed-Hack)
    if (delta > this._maxDelta) {
      delta = this._maxDelta;
      if (!this._speedWarned) {
        console.warn('[GameLoop] Speed-Hack erkannt – Delta gekappt');
        this._speedWarned = true;
        setTimeout(() => { this._speedWarned = false; }, 10000);
      }
    }

    // Logic-Tick (alle 100ms)
    if (timestamp - this._lastLogicTick >= this._logicInterval) {
      let logicDelta = timestamp - this._lastLogicTick;
      this._lastLogicTick = timestamp;

      if (logicDelta > this._maxDelta * 2) {
        logicDelta = this._maxDelta * 2;
      }

      // Catchup-Modus (4× Geschwindigkeit) oder Time Warp (3x Geschwindigkeit)
      let multiplier = 1;
      const state = this._stateManager.getState();
      const timeBank = state.resources.timeBank || 0;
      const timeWarpActive = state.system?.timeWarpActive || false;

      if (timeBank > 0) {
        multiplier = 4;
        const extraSecondsUsed = (logicDelta * 3) / 1000;
        const newTimeBank = Math.max(0, timeBank - extraSecondsUsed);
        this._stateManager.dispatch((state) => ({
          ...state,
          resources: { ...state.resources, timeBank: newTimeBank }
        }), 'gameLoop/catchup');
        this._catchupActive = newTimeBank > 0;
        if (!this._catchupActive) {
          this._eventBus.publish('catchup:ended', {});
        }
      } else if (timeWarpActive) {
        multiplier = 3;
        this._catchupActive = false;
      } else {
        this._catchupActive = false;
      }

      this._eventBus.publish(EVENTS.GAME_LOGIC_TICK, {
        delta: logicDelta * multiplier,
        timestamp
      });
    }

    // Slow-Tick (alle 500ms)
    if (timestamp - this._lastSlowTick >= this._slowInterval) {
      let slowDelta = timestamp - this._lastSlowTick;
      this._lastSlowTick = timestamp;

      if (slowDelta > this._maxDelta * 5) {
        slowDelta = this._maxDelta * 5;
      }

      // Time Warp decrement / charge ticks
      const state = this._stateManager.getState();
      const timeWarpActive = state.system?.timeWarpActive || false;
      const timeWarpCharge = state.system?.timeWarpCharge || 0;
      const timeWarpRemaining = state.system?.timeWarpRemaining || 0;

      if (timeWarpActive) {
        const nextRemaining = Math.max(0, timeWarpRemaining - 0.5);
        this._stateManager.dispatch((s) => ({
          ...s,
          system: {
            ...s.system,
            timeWarpRemaining: nextRemaining,
            timeWarpActive: nextRemaining > 0,
            timeWarpCharge: nextRemaining > 0 ? timeWarpCharge : 0
          }
        }), 'system/timeWarpTick');
        
        if (nextRemaining === 0) {
          this._eventBus.publish('timeWarp:ended', {});
          this._eventBus.publish('ui:showToast', {
            message: '⌛ Die Zeitkrümmung ist verflogen.',
            type: 'info',
            duration: 3000
          });
        }
      } else {
        // Passive Ladung: 0.1% pro Sekunde => 0.05% pro 500ms
        if (timeWarpCharge < 100) {
          this._stateManager.dispatch((s) => ({
            ...s,
            system: {
              ...s.system,
              timeWarpCharge: Math.min(100, (s.system?.timeWarpCharge || 0) + 0.05)
            }
          }), 'system/timeWarpChargePassive');
        }
      }

      this._eventBus.publish(EVENTS.GAME_SLOW_TICK, {
        delta: slowDelta,
        timestamp
      });
    }

    this._frameId = requestAnimationFrame(this._boundTick);
  }

  isRunning() {
    return this._running;
  }

  isCatchupActive() {
    return this._catchupActive;
  }
}

export default GameLoop;