// ============================================================
// FILE: js/core/gameloop.js – Spiel-Loop mit Anti-Speed-Hack
// ============================================================
import { EVENTS } from './events.js';
import { CONFIG } from './config.js';

export default class GameLoop {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.running = false;
        this.lastTimestamp = 0;
        this.lastLogicTick = 0;
        this.lastSlowTick = 0;
        this.logicInterval = CONFIG.SYSTEM.LOGIC_TICK_MS;
        this.slowInterval = CONFIG.SYSTEM.SLOW_TICK_MS || 500;
        this.animationFrameId = null;
        this._catchupActive = false;

        // ---- SICHERHEIT: Maximale Delta-Zeit (gegen Speed-Hacks) ----
        this.MAX_DELTA = 100;
        this._speedWarned = false;

        this._tickHandler = this._loop.bind(this);
    }

    start() {
        if (this.running) return;
        this.running = true;
        const now = performance.now();
        this.lastTimestamp = now;
        this.lastLogicTick = now;
        this.lastSlowTick = now;
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

        let delta = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        // ---- SICHERHEIT: Delta kappen ----
        if (delta > this.MAX_DELTA) {
            delta = this.MAX_DELTA;
            if (!this._speedWarned) {
                console.warn('[GameLoop] Speed-Hack erkannt – Delta gekappt');
                this._speedWarned = true;
                setTimeout(() => { this._speedWarned = false; }, 10000);
            }
        }

        // Render-Tick
        this.eventBus.publish(EVENTS.GAME_RENDER_TICK, { delta, timestamp });

        // ---- LOGIK-TICK ----
        if (timestamp - this.lastLogicTick >= this.logicInterval) {
            let logicDelta = timestamp - this.lastLogicTick;
            this.lastLogicTick = timestamp;

            if (logicDelta > this.MAX_DELTA * 2) {
                logicDelta = this.MAX_DELTA * 2;
            }

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

        // ---- SLOW-TICK ----
        if (timestamp - this.lastSlowTick >= this.slowInterval) {
            let slowDelta = timestamp - this.lastSlowTick;
            this.lastSlowTick = timestamp;
            if (slowDelta > this.MAX_DELTA * 5) {
                slowDelta = this.MAX_DELTA * 5;
            }
            this.eventBus.publish(EVENTS.GAME_SLOW_TICK, {
                delta: slowDelta,
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