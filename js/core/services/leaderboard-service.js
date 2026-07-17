/**
 * ============================================================
 * FILE: core/services/leaderboard-service.js – Bestenliste
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Persönliche Rekorde speichern
 * - Statistiken formatieren
 * - Reset-Funktion
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeNumber } from '../../utils/sanitizer.js';

export class LeaderboardService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   */
  constructor(stateManager, eventBus) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._STORAGE_KEY = 'archiv_leaderboard_data';
    this._records = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this._STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Leaderboard] Load failed:', e);
    }
    return this._getDefaultRecords();
  }

  _getDefaultRecords() {
    return {
      highestPrestige: 0,
      totalPrestiges: 0,
      fastestBossKill: Infinity,
      totalBossesDefeated: 0,
      highestChapterReached: 0,
      highestLevel: 1,
      fastestLevelUp: Infinity,
      highestCraftingLevel: 0,
      totalMasterworksCrafted: 0,
      highestItemQuality: 0,
      peakParticlesPerSecond: 0,
      totalParticlesCollected: 0,
      peakRelicsPerSecond: 0,
      totalRelicsCollected: 0,
      totalExpeditions: 0,
      successfulExpeditions: 0,
      achievementsUnlocked: 0,
      fastestPrestige: Infinity,
      totalPlayTime: 0,
      sessionCount: 0,
      lastPlayed: Date.now()
    };
  }

  _save() {
    try {
      localStorage.setItem(this._STORAGE_KEY, JSON.stringify(this._records));
    } catch (e) {
      console.warn('[Leaderboard] Save failed:', e);
    }
  }

  /**
   * Fügt einen Eintrag hinzu (aktualisiert Rekorde).
   */
  addEntry(data) {
    if (!data || typeof data !== 'object') return;

    const r = this._records;
    let changed = false;

    if (data.prestige !== undefined && data.prestige > r.highestPrestige) {
      r.highestPrestige = data.prestige;
      changed = true;
    }
    if (data.bosses !== undefined && data.bosses > r.totalBossesDefeated) {
      r.totalBossesDefeated = data.bosses;
      changed = true;
    }
    if (data.bosses !== undefined) {
      const chapter = Math.floor(data.bosses / 10) + 1;
      if (chapter > r.highestChapterReached) {
        r.highestChapterReached = chapter;
        changed = true;
      }
    }
    if (data.level !== undefined && data.level > r.highestLevel) {
      r.highestLevel = data.level;
      changed = true;
    }
    if (data.craftingLevel !== undefined && data.craftingLevel > r.highestCraftingLevel) {
      r.highestCraftingLevel = data.craftingLevel;
      changed = true;
    }
    if (data.particles !== undefined && data.particles > r.totalParticlesCollected) {
      r.totalParticlesCollected = data.particles;
      changed = true;
    }

    r.lastPlayed = Date.now();
    if (changed) this._save();

    this._eventBus.publish('leaderboard:updated', { records: this.getFormattedStats() });
  }

  /**
   * Gibt die Rohdaten zurück.
   */
  getRecords() {
    return { ...this._records };
  }

  /**
   * Gibt formatierte Statistiken zurück.
   */
  getFormattedStats() {
    const r = this._records;
    return {
      '🏆 Prestige': `Stufe ${r.highestPrestige} (${r.totalPrestiges}x)`,
      '⚔️ Bosse': `${r.totalBossesDefeated} besiegt, Kapitel ${r.highestChapterReached}`,
      '👤 Held': `Level ${r.highestLevel}`,
      '🛠️ Handwerk': `Stufe ${r.highestCraftingLevel}, ${r.totalMasterworksCrafted} Meisterwerke`,
      '💎 Beste Qualität': `${r.highestItemQuality}%`,
      '📈 Partikel/Sekunde': `${Math.round(r.peakParticlesPerSecond)}`,
      '⏱️ Schnellster Boss': r.fastestBossKill === Infinity ? '—' : `${r.fastestBossKill}s`,
      '⏱️ Schnellstes Prestige': r.fastestPrestige === Infinity ? '—' : `${r.fastestPrestige}s`
    };
  }

  /**
   * Setzt alle Rekorde zurück.
   */
  reset() {
    this._records = this._getDefaultRecords();
    this._save();
    this._eventBus.publish('leaderboard:cleared', {});
  }

  /**
   * Aktualisiert spezifische Werte (für Events).
   */
  updatePrestige(level, timeSinceLastPrestige) {
    if (level > this._records.highestPrestige) {
      this._records.highestPrestige = level;
    }
    this._records.totalPrestiges++;
    if (timeSinceLastPrestige < this._records.fastestPrestige) {
      this._records.fastestPrestige = timeSinceLastPrestige;
    }
    this._save();
  }

  updateBossDefeated(bossId, timeInSeconds, chapter) {
    this._records.totalBossesDefeated++;
    if (timeInSeconds < this._records.fastestBossKill) {
      this._records.fastestBossKill = timeInSeconds;
    }
    if (chapter > this._records.highestChapterReached) {
      this._records.highestChapterReached = chapter;
    }
    this._save();
  }

  updateCrafting(level, quality, isMasterwork = false) {
    if (level > this._records.highestCraftingLevel) {
      this._records.highestCraftingLevel = level;
    }
    if (quality > this._records.highestItemQuality) {
      this._records.highestItemQuality = quality;
    }
    if (isMasterwork) {
      this._records.totalMasterworksCrafted++;
    }
    this._save();
  }

  updateExpedition(successful) {
    this._records.totalExpeditions++;
    if (successful) {
      this._records.successfulExpeditions++;
    }
    this._save();
  }
}

export default LeaderboardService;