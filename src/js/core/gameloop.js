import { EVENTS } from './events.js';
import { CONFIG } from './config.js';

export default class GameLoop {
  constructor(context) {
    this.context = context; // Wir brauchen den Context für den ResourceManager
    this.eventBus = context.eventBus;
    this.running = false;
    this.lastTimestamp = 0;
    this.lastLogicTick = 0;
    this.logicInterval = CONFIG.SYSTEM.LOGIC_TICK_MS;
    this.animationFrameId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.lastLogicTick = this.lastTimestamp;
    this._loop(this.lastTimestamp);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  _loop(timestamp) {
    if (!this.running) return;
    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.eventBus.publish(EVENTS.GAME_RENDER_TICK, { delta, timestamp });

    if (timestamp - this.lastLogicTick >= this.logicInterval) {
      const logicDelta = timestamp - this.lastLogicTick;
      this.lastLogicTick = timestamp;
      
      let multiplier = 1;
      // CATCH-UP MECHANIK: Wenn Offline-Zeit in der Bank ist, läuft das Spiel 4x so schnell
      if (this.context.resourceManager && this.context.resourceManager.timeBank > 0) {
        multiplier = 4; 
        const extraSecondsUsed = (logicDelta * 3) / 1000; // 3 zusätzliche Ticks verbraucht
        this.context.resourceManager.timeBank -= extraSecondsUsed;
        if (this.context.resourceManager.timeBank < 0) this.context.resourceManager.timeBank = 0;
      }

      this.eventBus.publish(EVENTS.GAME_LOGIC_TICK, { delta: logicDelta * multiplier, timestamp });
    }

    this.animationFrameId = requestAnimationFrame((ts) => this._loop(ts));
  }

  isRunning() {
    return this.running;
  }
}