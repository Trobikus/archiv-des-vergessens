import { EVENTS } from './events.js';
import { CONFIG } from './config.js';

export default class GameLoop {
  constructor(context) {
    this.context = context;
    this.eventBus = context.eventBus;
    this.running = false;
    this.lastTimestamp = 0;
    this.lastLogicTick = 0;
    this.logicInterval = CONFIG.SYSTEM.LOGIC_TICK_MS;
    this.animationFrameId = null;
    this._catchupActive = false;

    // Feste Callback-Bindung zur Reduzierung von Allokationen pro Frame
    this._tickHandler = this._loop.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const now = performance.now();
    this.lastTimestamp = now;
    this.lastLogicTick = now;
    this._catchupActive = this.context.resourceManager?.timeBank > 0;
    this.animationFrameId = requestAnimationFrame(this._tickHandler);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  _loop(timestamp) {
    if (!this.running) return;

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.eventBus.publish(EVENTS.GAME_RENDER_TICK, { delta, timestamp });

    // Fester Logik-Takt-Akkumulator zur Vermeidung von Drift
    if (timestamp - this.lastLogicTick >= this.logicInterval) {
      const logicDelta = timestamp - this.lastLogicTick;
      this.lastLogicTick = timestamp;

      let multiplier = 1;
      const rm = this.context.resourceManager;

      if (rm && rm.timeBank > 0) {
        multiplier = 4;
        const extraSecondsUsed = (logicDelta * 3) / 1000;
        rm.timeBank = Math.max(0, rm.timeBank - extraSecondsUsed);

        this._catchupActive = rm.timeBank > 0;
        if (!this._catchupActive) {
          this.eventBus.publish('catchup:ended', {});
        }
      } else {
        this._catchupActive = false;
      }

      this.eventBus.publish(EVENTS.GAME_LOGIC_TICK, {
        delta: logicDelta * multiplier,
        timestamp
      });
    }

    this.animationFrameId = requestAnimationFrame(this._tickHandler);
  }

  isRunning() {
    return this.running;
  }

  isCatchupActive() {
    return this._catchupActive;
  }
}