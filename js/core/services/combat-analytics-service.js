// ============================================================
// FILE: js/core/services/combat-analytics-service.js – Combat Analytics & DPS
// ============================================================
import { EVENTS } from '../events/definitions.js';

/**
 * @typedef {Object} DamageEvent
 * @property {number} damage
 * @property {boolean} isCrit
 * @property {'physical' | 'mneme' | 'heal'} type
 * @property {number} timestamp
 */

export class CombatAnalyticsService {
  /**
   * @param {import('../events/bus.js').default} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    this._startTime = Date.now();
    this._totalDamage = 0;
    this._totalHits = 0;
    this._critHits = 0;
    this._maxHit = 0;
    this._totalHeal = 0;
    this._totalMneme = 0;

    /** @type {DamageEvent[]} */
    this._recentEvents = [];

    this._listenToCombatEvents();
  }

  _listenToCombatEvents() {
    if (!this._eventBus) return;

    this._eventBus.subscribe(EVENTS.COMBAT_TICK || 'combat:tick', (data) => {
      if (data) {
        this.recordHit(data.damage || 0, data.isCrit || false, data.type || 'physical');
        if (data.mnemeGained) {
          this.recordMnemeGained(data.mnemeGained);
        }
      }
    });
  }

  /**
   * Record a hit/damage event
   * @param {number} damage
   * @param {boolean} isCrit
   * @param {'physical' | 'mneme' | 'heal'} [type='physical']
   */
  recordHit(damage, isCrit = false, type = 'physical') {
    if (damage <= 0) return;

    const now = Date.now();

    if (type === 'heal') {
      this._totalHeal += damage;
    } else {
      this._totalDamage += damage;
      this._totalHits += 1;
      if (isCrit) this._critHits += 1;
      if (damage > this._maxHit) this._maxHit = damage;
    }

    this._recentEvents.push({ damage, isCrit, type, timestamp: now });

    // Prune events older than 10 seconds for rolling window
    this._recentEvents = this._recentEvents.filter(e => now - e.timestamp <= 10000);

    // Emit event for floating text overlay rendering
    if (this._eventBus) {
      this._eventBus.publish('combat:floating-text', { damage, isCrit, type });
    }
  }

  recordMnemeGained(amount) {
    if (amount > 0) {
      this._totalMneme += amount;
      if (this._eventBus) {
        this._eventBus.publish('combat:floating-text', { damage: amount, isCrit: false, type: 'mneme' });
      }
    }
  }

  /**
   * Calculate current rolling DPS (last 10 seconds or total time)
   * @returns {number}
   */
  getCurrentDPS() {
    const now = Date.now();
    const windowEvents = this._recentEvents.filter(e => e.type !== 'heal');
    if (windowEvents.length === 0) return 0;

    const oldestTime = windowEvents[0].timestamp;
    const durationSeconds = Math.max(1, (now - oldestTime) / 1000);
    const windowDamage = windowEvents.reduce((sum, e) => sum + e.damage, 0);

    return Math.round((windowDamage / durationSeconds) * 10) / 10;
  }

  /**
   * Get combat summary statistics
   * @returns {Object}
   */
  getStats() {
    const elapsedSeconds = Math.max(1, (Date.now() - this._startTime) / 1000);
    const critRate = this._totalHits > 0 ? Math.round((this._critHits / this._totalHits) * 100) : 0;
    const avgHit = this._totalHits > 0 ? Math.round(this._totalDamage / this._totalHits) : 0;

    return {
      dps: this.getCurrentDPS(),
      totalDamage: Math.round(this._totalDamage),
      maxHit: Math.round(this._maxHit),
      avgHit,
      totalHits: this._totalHits,
      critHits: this._critHits,
      critRatePercent: critRate,
      totalHeal: Math.round(this._totalHeal),
      totalMneme: Math.round(this._totalMneme),
      durationSeconds: Math.round(elapsedSeconds)
    };
  }

  /**
   * Reset stats
   */
  reset() {
    this._startTime = Date.now();
    this._totalDamage = 0;
    this._totalHits = 0;
    this._critHits = 0;
    this._maxHit = 0;
    this._totalHeal = 0;
    this._totalMneme = 0;
    this._recentEvents = [];
  }
}

export default CombatAnalyticsService;
