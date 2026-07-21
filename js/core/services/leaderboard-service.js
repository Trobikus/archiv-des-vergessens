/**
 * ============================================================
 * FILE: core/services/leaderboard-service.js – Bestenliste (State-Integrated)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Persönliche Rekorde im zentralen State verwalten (Savegame-spezifisch)
 * - Statistiken formatieren
 * - Reset-Funktion
 * - Keine Übertragung von Werten zwischen alten und neuen Spielständen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeNumber } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

export class LeaderboardService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {import('./network-service.js').NetworkService} [networkService]
   */
  constructor(stateManager, eventBus, networkService = null) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._networkService = networkService;
    this._STORAGE_KEY = 'archiv_leaderboard_data';
    this._isUpdating = false;

    // Laufzeit-Variablen für Zeitmessung und Ratenberechnung
    this._lastPrestigeTime = Date.now();
    this._battleStartTime = null;
    this._sessionStartTime = Date.now();
    
    this._lastParticles = 0n;
    this._lastRelics = 0n;
    this._lastTickTime = Date.now();

    // --- EVENT-ABONNEMENTE (EVENT BUS) ---

    // Initialisierung nach vollständigem Booten
    this._eventBus.subscribe('game:booted', () => {
      const state = this._stateManager.getState();
      if (state) {
        this._lastParticles = BigInt(state.resources?.particles || '0');
        this._lastRelics = BigInt(state.resources?.relics || '0');
        
        // Einmalige Legacy-Migration beim ersten Booten, falls der State noch leer ist
        if (state.leaderboard) {
          const r = { ...state.leaderboard };
          if (r.sessionCount === 0) {
            // Versuchen, aus Legacy-localStorage zu migrieren
            const legacy = this._loadLegacy();
            if (legacy && legacy.highestPrestige > 0) {
              r.highestPrestige = legacy.highestPrestige;
              r.totalPrestiges = legacy.totalPrestiges;
              r.fastestBossKill = legacy.fastestBossKill;
              r.totalBossesDefeated = legacy.totalBossesDefeated;
              r.highestChapterReached = legacy.highestChapterReached;
              r.highestLevel = legacy.highestLevel;
              r.highestCraftingLevel = legacy.highestCraftingLevel;
              r.totalMasterworksCrafted = legacy.totalMasterworksCrafted;
              r.highestItemQuality = legacy.highestItemQuality;
              r.peakParticlesPerSecond = legacy.peakParticlesPerSecond;
              r.totalParticlesCollected = legacy.totalParticlesCollected;
              r.peakRelicsPerSecond = legacy.peakRelicsPerSecond;
              r.totalRelicsCollected = legacy.totalRelicsCollected;
              r.totalExpeditions = legacy.totalExpeditions;
              r.successfulExpeditions = legacy.successfulExpeditions;
              r.achievementsUnlocked = legacy.achievementsUnlocked;
              r.fastestPrestige = legacy.fastestPrestige;
              r.totalPlayTime = legacy.totalPlayTime;
              r.sessionCount = legacy.sessionCount;
            }
          }
          r.sessionCount++;
          this._records = r;
        }
      }
    });

    // Automatisch aktuelle Rekorde einreichen, sobald die Netzwerkverbindung authentifiziert ist
    this._eventBus.subscribe('network:auth:success', () => {
      this._submitToServer();
    });

    // Automatisch persönliche Rekorde bei jedem State-Update aktualisieren
    this._eventBus.subscribe('state:changed', () => {
      if (!this._isUpdating) {
        queueMicrotask(() => {
          this._updateFromState();
        });
      }
    });

    // Zeitmessung für Boss-Kämpfe
    this._eventBus.subscribe('story:battleStarted', () => {
      this._battleStartTime = Date.now();
    });

    this._eventBus.subscribe('story:bossDefeated', () => {
      if (this._battleStartTime) {
        const elapsed = (Date.now() - this._battleStartTime) / 1000;
        const r = { ...this._records };
        if (elapsed < r.fastestBossKill) {
          r.fastestBossKill = elapsed;
          this._records = r;
        }
      }
      this._submitToServer();
      this._eventBus.publish('leaderboard:updated', { records: this.getFormattedStats() });
    });

    // Verewigungen (Prestige)
    this._eventBus.subscribe('hero:prestige', (data) => {
      const r = { ...this._records };
      r.totalPrestiges++;
      const now = Date.now();
      const elapsed = (now - this._lastPrestigeTime) / 1000;
      this._lastPrestigeTime = now;
      if (elapsed < r.fastestPrestige) {
        r.fastestPrestige = elapsed;
      }
      if (data && data.prestigeLevel > r.highestPrestige) {
        r.highestPrestige = data.prestigeLevel;
      }
      this._records = r;
      this._submitToServer();
      this._eventBus.publish('leaderboard:updated', { records: this.getFormattedStats() });
    });

    // Meisterwerke schmieden
    this._eventBus.subscribe('crafting:masterwork', () => {
      const r = { ...this._records };
      r.totalMasterworksCrafted++;
      this._records = r;
      this._eventBus.publish('leaderboard:updated', { records: this.getFormattedStats() });
    });

    // Expeditionen (Erfolge & Teilnahme)
    this._eventBus.subscribe('expedition:complete', (data) => {
      const r = { ...this._records };
      r.totalExpeditions++;
      if (data && data.success) {
        r.successfulExpeditions++;
      }
      this._records = r;
      this._eventBus.publish('leaderboard:updated', { records: this.getFormattedStats() });
    });

    // Game-Resets abfangen (Neues Spiel, Hard-Reset)
    this._eventBus.subscribe('game:reset', () => {
      this.reset();
    });

    // Regelmäßig Spielzeit aktualisieren (alle 10 Sekunden)
    setInterval(() => {
      this._updatePlayTime();
    }, 10000);
  }

  // --- RECORD-GETTER & SETTER ---

  get _records() {
    const state = this._stateManager.getState();
    if (state && state.leaderboard) {
      return state.leaderboard;
    }
    return this._getDefaultRecords();
  }

  set _records(newRecords) {
    if (this._isUpdating) return;
    this._isUpdating = true;
    try {
      this._stateManager.dispatch((state) => ({
        ...state,
        leaderboard: newRecords
      }), 'leaderboard/update');
    } finally {
      this._isUpdating = false;
    }
  }

  _updatePlayTime() {
    if (this._sessionStartTime) {
      const now = Date.now();
      const elapsed = (now - this._sessionStartTime) / 1000;
      this._sessionStartTime = now;
      const r = { ...this._records };
      r.totalPlayTime += elapsed;
      r.lastPlayed = Date.now();
      this._records = r;
    }
  }

  _updateFromState() {
    const state = this._stateManager.getState();
    if (!state || !state.hero || !state.leaderboard) return;
    if (this._isUpdating) return;

    const r = { ...state.leaderboard };
    let changed = false;

    // 🏆 Höchstes Prestige
    const prestigeLevel = state.hero.prestige?.level || 0;
    if (prestigeLevel > r.highestPrestige) {
      r.highestPrestige = prestigeLevel;
      changed = true;
    }

    // ⚔️ Bosse & Kapitel (Lebenslange Summe basierend auf Prestige & aktuellem Fortschritt)
    const totalBossesDefeatedVal = (prestigeLevel * 20) + (state.hero.prestige?.bossProgress || 0);
    if (totalBossesDefeatedVal > r.totalBossesDefeated) {
      r.totalBossesDefeated = totalBossesDefeatedVal;
      changed = true;
    }

    const currentChapter = Math.floor((state.hero.prestige?.bossProgress || 0) / 10) + 1;
    if (currentChapter > r.highestChapterReached) {
      r.highestChapterReached = currentChapter;
      changed = true;
    }

    // 👤 Held: Höchste Stufe
    const currentLevel = state.hero.level || 1;
    if (currentLevel > r.highestLevel) {
      r.highestLevel = currentLevel;
      changed = true;
    }

    // 🛠️ Handwerk: Höchstes Level
    const currentCraftingLevel = state.crafting?.level || 0;
    if (currentCraftingLevel > r.highestCraftingLevel) {
      r.highestCraftingLevel = currentCraftingLevel;
      changed = true;
    }

    // 👤 Ausgerüstetes/Inventar-Item Qualität scannen
    let highestQualityFound = 0;
    if (state.hero.equipment) {
      Object.values(state.hero.equipment).forEach(item => {
        if (item && item.quality > highestQualityFound) {
          highestQualityFound = item.quality;
        }
      });
    }
    if (state.hero.inventory && Array.isArray(state.hero.inventory.equipment)) {
      state.hero.inventory.equipment.forEach(item => {
        if (item && item.quality > highestQualityFound) {
          highestQualityFound = item.quality;
        }
      });
    }
    if (highestQualityFound > r.highestItemQuality) {
      r.highestItemQuality = highestQualityFound;
      changed = true;
    }

    // 💎 Peak-Raten berechnen
    const now = Date.now();
    const elapsedSeconds = (now - this._lastTickTime) / 1000;
    const currentParticles = BigInt(state.resources?.totalParticles || '0');
    const currentRelics = BigInt(state.resources?.totalRelics || '0');

    if (elapsedSeconds >= 1 && this._lastTickTime > 0) {
      if (currentParticles > this._lastParticles) {
        const pps = Number(currentParticles - this._lastParticles) / elapsedSeconds;
        if (pps > r.peakParticlesPerSecond) {
          r.peakParticlesPerSecond = pps;
          changed = true;
        }
      }
      if (currentRelics > this._lastRelics) {
        const rps = Number(currentRelics - this._lastRelics) / elapsedSeconds;
        if (rps > r.peakRelicsPerSecond) {
          r.peakRelicsPerSecond = rps;
          changed = true;
        }
      }
    }

    this._lastParticles = currentParticles;
    this._lastRelics = currentRelics;
    this._lastTickTime = now;

    if (changed) {
      this._records = r;
      this._submitToServer();
      this._eventBus.publish('leaderboard:updated', { records: this.getFormattedStats() });
    }
  }

  _loadLegacy() {
    try {
      const raw = localStorage.getItem(this._STORAGE_KEY);
      if (raw) {
        // Legacy-Eintrag aus localStorage entfernen, um doppelten Import zu vermeiden
        localStorage.removeItem(this._STORAGE_KEY);
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Leaderboard] Load legacy failed:', e);
    }
    return null;
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

  /**
   * Fügt einen Eintrag hinzu (aktualisiert Rekorde).
   */
  addEntry(data) {
    if (!data || typeof data !== 'object') return;

    const r = { ...this._records };
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
    if (changed) {
      this._records = r;
      this._submitToServer();
    }

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
    this._submitToServer();
    this._eventBus.publish('leaderboard:cleared', {});
  }

  /**
   * Aktualisiert spezifische Werte (für Events).
   */
  updatePrestige(level, timeSinceLastPrestige) {
    const r = { ...this._records };
    if (level > r.highestPrestige) {
      r.highestPrestige = level;
    }
    r.totalPrestiges++;
    if (timeSinceLastPrestige < r.fastestPrestige) {
      r.fastestPrestige = timeSinceLastPrestige;
    }
    this._records = r;
    this._submitToServer();
  }

  updateBossDefeated(bossId, timeInSeconds, chapter) {
    const r = { ...this._records };
    r.totalBossesDefeated++;
    if (timeInSeconds < r.fastestBossKill) {
      r.fastestBossKill = timeInSeconds;
    }
    if (chapter > r.highestChapterReached) {
      r.highestChapterReached = chapter;
    }
    this._records = r;
    this._submitToServer();
  }

  updateCrafting(level, quality, isMasterwork = false) {
    const r = { ...this._records };
    if (level > r.highestCraftingLevel) {
      r.highestCraftingLevel = level;
    }
    if (quality > r.highestItemQuality) {
      r.highestItemQuality = quality;
    }
    if (isMasterwork) {
      r.totalMasterworksCrafted++;
    }
    this._records = r;
  }

  updateExpedition(successful) {
    const r = { ...this._records };
    r.totalExpeditions++;
    if (successful) {
      r.successfulExpeditions++;
    }
    this._records = r;
  }

  _submitToServer() {
    if (this._networkService && this._networkService.isConnected()) {
      const r = this._records;
      this._networkService.send('leaderboard:submit', {
        prestige: r.highestPrestige,
        bosses: r.totalBossesDefeated,
        level: r.highestLevel
      });
    }
  }

  requestGlobalLeaderboard() {
    if (this._networkService && this._networkService.isConnected()) {
      this._networkService.send('leaderboard:get');
    } else {
      this._eventBus.publish('leaderboard:globalUpdated', null);
    }
  }

  addReceivedGlobalEntries(entries) {
    this._eventBus.publish('leaderboard:globalUpdated', entries);
  }
}

export default LeaderboardService;