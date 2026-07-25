/**
 * ============================================================
 * FILE: controllers/navigation.js – Navigation (v2.0 Preact-Migrated)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Zentrale Haupt-Navigation (Menu, Hub, Game)
 * - Game Loop Status Updates
 * - Manuelles Sammeln und Upgrades
 * ============================================================
 */

import { EVENTS } from '../core/events/definitions.js';
import { setCurrentView } from '../core/state/actions.js';
import { calculateGatherAmount, calculateClickPowerUpgradeCost } from '../core/services/gather-service.js';

export class NavigationController {
  /**
   * @param {Object} deps
   * @param {import('../core/events/bus.js').default} deps.eventBus
   * @param {import('../core/state/manager.js').default} deps.stateManager
   * @param {import('../core/game/loop.js').default} deps.gameLoop
   * @param {import('../core/services/resource-service.js').default} deps.resourceService
   * @param {import('../core/services/clan-service.js').default} deps.clanService
   * @param {typeof import('../core/persistence/save-manager.js').default} deps.saveManager
   */
  constructor({ eventBus, stateManager, gameLoop, resourceService, clanService, saveManager }) {
    this._eventBus = eventBus;
    this._stateManager = stateManager;
    this._gameLoop = gameLoop;
    this._resourceService = resourceService;
    this._clanService = clanService;
    this._saveManager = saveManager;

    this._bindEvents();
  }

  _bindEvents() {
    // --- Menü-Events ---
    this._eventBus.subscribe(EVENTS.MENU_OPTIONS, () => this._eventBus.publish(EVENTS.UI_OPEN_OPTIONS));
    this._eventBus.subscribe(EVENTS.MENU_QUIT, () => this._quitGame());

    // --- Hub-Events ---
    this._eventBus.subscribe(EVENTS.HUB_BACK_TO_MENU, () => this.showMenu());
    this._eventBus.subscribe(EVENTS.HUB_ENTER_GAME, () => this.showGame());

    // --- In-Game-Events ---
    this._eventBus.subscribe(EVENTS.GAME_MANUAL_GATHER, (data) => this._manualGather(data.clientX, data.clientY));
    this._eventBus.subscribe(EVENTS.GAME_UPGRADE_CLICK_POWER, () => this._upgradeClickPower());
    this._eventBus.subscribe(EVENTS.GAME_OPEN_ACHIEVEMENTS, () => this._eventBus.publish(EVENTS.UI_OPEN_ACHIEVEMENTS));
    this._eventBus.subscribe(EVENTS.GAME_BACK_TO_HUB, () => this.showHub());

    // In-Game Loop Status & Ticks abhören
    let logicTickCount = 0;
    let cachedTickInfoEl = null;
    let cachedSpeedIndicatorEl = null;
    let lastCatchupState = null;

    this._eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, (data) => {
      logicTickCount++;
      if (cachedTickInfoEl === null) {
        cachedTickInfoEl = document.getElementById('tick-info');
      }
      if (cachedTickInfoEl) {
        cachedTickInfoEl.textContent = `Tick: ${logicTickCount} | Δ: ${Math.round(data.delta)}ms`;
      }
      
      if (cachedSpeedIndicatorEl === null) {
        cachedSpeedIndicatorEl = document.getElementById('speed-indicator');
      }
      if (cachedSpeedIndicatorEl) {
        const catchupActive = this._gameLoop.isCatchupActive();
        if (catchupActive !== lastCatchupState) {
          lastCatchupState = catchupActive;
          cachedSpeedIndicatorEl.style.display = catchupActive ? 'inline-block' : 'none';
        }
      }
    });
  }

  // ---- VIEW-WECHSEL ----

  showMenu() {
    this._stateManager.dispatch(setCurrentView('menu'));
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showHub() {
    this._stateManager.dispatch(setCurrentView('hub'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showGame() {
    this._stateManager.dispatch(setCurrentView('game'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_ENTER_GAME);
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  // ---- BEENDEN ----

  async _quitGame() {
    if (await window.gameConfirm('Möchtest du das Spiel wirklich beenden?')) {
      this._eventBus.publish(EVENTS.SAVE_STARTED);
      this._saveManager.save(this._stateManager.getState()).then(() => {
        window.close();
      });
    }
  }

  // ---- MANUAL GATHER IN-GAME ----

  _manualGather(clientX, clientY) {
    const state = this._stateManager.getState();
    const amount = calculateGatherAmount(state);

    this._resourceService.addParticles(amount);
    this._eventBus.publish(EVENTS.QUEST_MANUAL_GATHER, {});

    // Time Warp aufladen
    if (!state.system?.timeWarpActive) {
      const currentCharge = state.system?.timeWarpCharge || 0;
      if (currentCharge < 100) {
        this._stateManager.dispatch((s) => ({
          ...s,
          system: {
            ...s.system,
            timeWarpCharge: Math.min(100, currentCharge + 1.0)
          }
        }), 'system/chargeTimeWarp');
      }
    }

    const x = clientX || window.innerWidth / 2;
    const y = clientY || window.innerHeight / 2;
    this._eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, {
      text: `+${amount} Partikel`,
      x,
      y
    });
  }

  _upgradeClickPower() {
    const state = this._stateManager.getState();
    const cost = calculateClickPowerUpgradeCost(state);

    const currentParticles = BigInt(state.resources.particles || '0');

    if (currentParticles < BigInt(cost)) {
      this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
        message: '❌ Nicht genügend Partikel!',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    this._stateManager.dispatch((s) => {
      const nextClickPowerLevel = (s.hero.clickPowerLevel || 0) + 1;
      const particlesAfter = BigInt(s.resources.particles || '0') - BigInt(cost);
      return {
         ...s,
        resources: {
          ...s.resources,
          particles: String(particlesAfter)
        },
        hero: {
          ...s.hero,
          clickPowerLevel: nextClickPowerLevel
        }
      };
    }, 'hero/upgradeClickPower');

    this._eventBus.publish(EVENTS.UI_SHOW_TOAST, {
      message: '⚡ Klick-Stärke erfolgreich verbessert!',
      type: 'success',
      duration: 2000
    });
    
    this._eventBus.publish(EVENTS.RESOURCES_UPDATED, { type: 'particles' });
    this._eventBus.publish(EVENTS.HERO_UPDATED, {});
  }

  _updateGameLoopStatus() {
    const statusTextEl = document.getElementById('game-state-text');
    const statusIndicatorEl = document.querySelector('.status-indicator');
    if (statusTextEl) {
      statusTextEl.textContent = this._gameLoop.isRunning() ? 'Running' : 'Paused';
    }
    if (statusIndicatorEl) {
      if (this._gameLoop.isRunning()) {
        statusIndicatorEl.classList.remove('paused');
        statusIndicatorEl.classList.add('running');
      } else {
        statusIndicatorEl.classList.remove('running');
        statusIndicatorEl.classList.add('paused');
      }
    }
  }
}

export default NavigationController;