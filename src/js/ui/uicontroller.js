import { EVENTS } from '../core/events.js';

export default class UIController {
  constructor(context) {
    this.context = context;
    this.eventBus = context.eventBus;
    this.statusIndicatorEl = document.querySelector('.status-indicator');
    this.gameStateTextEl = document.getElementById('game-state-text');
    this.tickInfoEl = document.getElementById('tick-info');
    this.speedIndicatorEl = document.getElementById('speed-indicator');

    this.internalLog = [];

    this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, this._onGameTick.bind(this));
    this.eventBus.subscribe(EVENTS.GAME_STATE_CHANGED, this._onStateChanged.bind(this));
    this.eventBus.subscribe(EVENTS.UI_ADD_LOG, this._addLogEntry.bind(this));

    if (this.gameStateTextEl) this.gameStateTextEl.textContent = 'Running';
    if (this.statusIndicatorEl) this.statusIndicatorEl.className = 'status-indicator status-running';
  }

  _onGameTick(data) {
    const { tick, delta } = data;
    if (this.tickInfoEl) {
      this.tickInfoEl.textContent = `Tick: ${tick || 0} | Δ: ${Math.round(delta)}ms`;
    }
    
    if (this.speedIndicatorEl) {
      if (this.context.resourceManager && this.context.resourceManager.timeBank > 0) {
        this.speedIndicatorEl.style.display = 'inline';
        this.speedIndicatorEl.textContent = `⚡ 4x Catch-Up (${Math.ceil(this.context.resourceManager.timeBank)}s)`;
      } else {
        this.speedIndicatorEl.style.display = 'none';
      }
    }
  }

  _onStateChanged(data) {
    const { newState } = data;
    if (this.gameStateTextEl) {
      this.gameStateTextEl.textContent = newState.charAt(0).toUpperCase() + newState.slice(1);
    }
    if (this.statusIndicatorEl) {
      this.statusIndicatorEl.className = 'status-indicator';
      if (newState === 'running') {
        this.statusIndicatorEl.classList.add('status-running');
      } else {
        this.statusIndicatorEl.classList.add('status-stopped');
      }
    }
  }

  _addLogEntry(data) {
    const { text, type = 'event' } = data;
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${text}`;

    this.internalLog.push(logEntry);
    if (this.internalLog.length > 1000) {
      this.internalLog.shift();
    }

    if (type === 'system') {
      console.info(logEntry);
    } else {
      console.log(logEntry);
    }
  }
}