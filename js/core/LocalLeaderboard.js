// --- START OF FILE core/LocalLeaderboard.js ---

export default class LocalLeaderboard {
    constructor() {
        this.STORAGE_KEY = 'archiv_local_leaderboard';
        this.records = this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[LocalLeaderboard] Load failed:', e);
        }
        return this._getDefaultRecords();
    }

    _getDefaultRecords() {
        return {
            // Prestige
            highestPrestige: 0,
            totalPrestiges: 0,

            // Bosse
            fastestBossKill: Infinity, // in Sekunden
            totalBossesDefeated: 0,
            highestChapterReached: 0,

            // Held
            highestLevel: 1,
            fastestLevelUp: Infinity, // in Sekunden pro Level

            // Crafting
            highestCraftingLevel: 0,
            totalMasterworksCrafted: 0,
            highestItemQuality: 0,

            // Ressourcen
            peakParticlesPerSecond: 0,
            totalParticlesCollected: 0,
            peakRelicsPerSecond: 0,
            totalRelicsCollected: 0,

            // Expeditionen
            totalExpeditions: 0,
            successfulExpeditions: 0,

            // Meilensteine
            achievementsUnlocked: 0,
            fastestPrestige: Infinity, // in Sekunden

            // Spielzeit
            totalPlayTime: 0, // in Sekunden
            sessionCount: 0,
            lastPlayed: Date.now()
        };
    }

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
        } catch (e) {
            console.warn('[LocalLeaderboard] Save failed:', e);
        }
    }

    // ---- UPDATE METHODEN ----

    updatePrestige(level, timeSinceLastPrestige) {
        if (level > this.records.highestPrestige) {
            this.records.highestPrestige = level;
        }
        this.records.totalPrestiges++;
        if (timeSinceLastPrestige < this.records.fastestPrestige) {
            this.records.fastestPrestige = timeSinceLastPrestige;
        }
        this._save();
    }

    updateBossDefeated(bossId, timeInSeconds, chapter) {
        this.records.totalBossesDefeated++;
        if (timeInSeconds < this.records.fastestBossKill) {
            this.records.fastestBossKill = timeInSeconds;
        }
        if (chapter > this.records.highestChapterReached) {
            this.records.highestChapterReached = chapter;
        }
        this._save();
    }

    updateHero(level, timePerLevel) {
        if (level > this.records.highestLevel) {
            this.records.highestLevel = level;
        }
        if (timePerLevel < this.records.fastestLevelUp) {
            this.records.fastestLevelUp = timePerLevel;
        }
        this._save();
    }

    updateCrafting(level, quality, isMasterwork = false) {
        if (level > this.records.highestCraftingLevel) {
            this.records.highestCraftingLevel = level;
        }
        if (quality > this.records.highestItemQuality) {
            this.records.highestItemQuality = quality;
        }
        if (isMasterwork) {
            this.records.totalMasterworksCrafted++;
        }
        this._save();
    }

    updateResources(particlesPerSecond, relicsPerSecond, totalParticles, totalRelics) {
        if (particlesPerSecond > this.records.peakParticlesPerSecond) {
            this.records.peakParticlesPerSecond = particlesPerSecond;
        }
        if (relicsPerSecond > this.records.peakRelicsPerSecond) {
            this.records.peakRelicsPerSecond = relicsPerSecond;
        }
        if (totalParticles > this.records.totalParticlesCollected) {
            this.records.totalParticlesCollected = totalParticles;
        }
        if (totalRelics > this.records.totalRelicsCollected) {
            this.records.totalRelicsCollected = totalRelics;
        }
        this._save();
    }

    updateExpedition(successful) {
        this.records.totalExpeditions++;
        if (successful) {
            this.records.successfulExpeditions++;
        }
        this._save();
    }

    updateAchievements(count) {
        if (count > this.records.achievementsUnlocked) {
            this.records.achievementsUnlocked = count;
        }
        this._save();
    }

    updatePlayTime(seconds) {
        this.records.totalPlayTime += seconds;
        this._save();
    }

    incrementSession() {
        this.records.sessionCount++;
        this.records.lastPlayed = Date.now();
        this._save();
    }

    // ---- ABFRAGEN ----

    getRecords() {
        return { ...this.records };
    }

    getFormattedStats() {
        const r = this.records;
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

    // ---- RESET ----

    reset() {
        this.records = this._getDefaultRecords();
        this._save();
    }

    // ---- SAVE / LOAD (für SaveGameManager) ----

    toJSON() {
        return this.records;
    }

    fromJSON(data) {
        if (!data) return;
        // Nur vorhandene Felder überschreiben
        const defaults = this._getDefaultRecords();
        for (const key of Object.keys(defaults)) {
            if (data[key] !== undefined) {
                this.records[key] = data[key];
            }
        }
        this._save();
    }
}