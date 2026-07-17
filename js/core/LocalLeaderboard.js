// ============================================================
// FILE: js/core/LocalLeaderboard.js – Persönliche Bestenliste
// ============================================================

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
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
        } catch (e) {
            console.warn('[LocalLeaderboard] Save failed:', e);
        }
    }

    addEntry(data) {
        if (!data || typeof data !== 'object') return;

        if (data.prestige !== undefined && data.prestige > this.records.highestPrestige) {
            this.records.highestPrestige = data.prestige;
        }
        if (data.bosses !== undefined && data.bosses > this.records.totalBossesDefeated) {
            this.records.totalBossesDefeated = data.bosses;
        }
        if (data.bosses !== undefined) {
            const chapter = Math.floor(data.bosses / 10) + 1;
            if (chapter > this.records.highestChapterReached) {
                this.records.highestChapterReached = chapter;
            }
        }
        if (data.level !== undefined && data.level > this.records.highestLevel) {
            this.records.highestLevel = data.level;
        }
        if (data.craftingLevel !== undefined && data.craftingLevel > this.records.highestCraftingLevel) {
            this.records.highestCraftingLevel = data.craftingLevel;
        }
        if (data.particles !== undefined && data.particles > this.records.totalParticlesCollected) {
            this.records.totalParticlesCollected = data.particles;
        }
        this.records.lastPlayed = Date.now();
        this._save();
    }

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

    reset() {
        this.records = this._getDefaultRecords();
        this._save();
    }

    toJSON() {
        return this.records;
    }

    fromJSON(data) {
        if (!data) return;
        const defaults = this._getDefaultRecords();
        for (const key of Object.keys(defaults)) {
            if (data[key] !== undefined) {
                this.records[key] = data[key];
            }
        }
        this._save();
    }
}