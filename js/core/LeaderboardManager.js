// --- START OF FILE core/LeaderboardManager.js ---

export default class LeaderboardManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.STORAGE_KEY = 'archiv_leaderboard';
        this.entries = [];
        this.maxEntries = 100;
        this.categories = [
            { id: 'prestige', label: 'Prestige-Stufe', sort: (a, b) => b.prestige - a.prestige },
            { id: 'bosses', label: 'Besiegte Bosse', sort: (a, b) => b.bosses - a.bosses },
            { id: 'level', label: 'Held-Level', sort: (a, b) => b.level - a.level },
            { id: 'crafting', label: 'Handwerks-Skill', sort: (a, b) => b.craftingLevel - a.craftingLevel },
            { id: 'particles', label: 'Gesammelte Partikel', sort: (a, b) => b.particles - a.particles }
        ];
        this.currentCategory = 'prestige';

        this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.entries = data.entries || [];
                this.currentCategory = data.currentCategory || 'prestige';
            }
        } catch (e) {
            console.warn('[Leaderboard] Load failed:', e);
        }
    }

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                entries: this.entries,
                currentCategory: this.currentCategory
            }));
        } catch (e) {
            console.warn('[Leaderboard] Save failed:', e);
        }
    }

    // ---- EINTRÄGE ----

    addEntry(data) {
        const entry = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
            name: data.name || 'Unbekannter Held',
            prestige: data.prestige || 0,
            bosses: data.bosses || 0,
            level: data.level || 1,
            craftingLevel: data.craftingLevel || 0,
            particles: data.particles || 0,
            timestamp: Date.now(),
            gameVersion: data.gameVersion || '1.5'
        };

        // Prüfen, ob dieser Spieler bereits existiert (gleicher Name)
        const existing = this.entries.findIndex(e => e.name === entry.name);
        if (existing !== -1) {
            // Nur aktualisieren, wenn die neue Leistung besser ist
            const old = this.entries[existing];
            let better = false;
            for (const cat of this.categories) {
                if (entry[cat.id] > old[cat.id]) { better = true; break; }
            }
            if (better) {
                this.entries[existing] = entry;
            } else {
                return entry;
            }
        } else {
            this.entries.push(entry);
        }

        // Sortieren nach aktueller Kategorie
        this.sortEntries();
        this._save();

        if (this.eventBus) {
            this.eventBus.publish('leaderboard:updated', { entries: this.getTop(10) });
        }

        return entry;
    }

    sortEntries(categoryId = null) {
        const catId = categoryId || this.currentCategory;
        const category = this.categories.find(c => c.id === catId);
        if (category) {
            this.entries.sort(category.sort);
        }
        // Begrenzung
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
    }

    // ---- ABFRAGEN ----

    getTop(count = 10, categoryId = null) {
        const catId = categoryId || this.currentCategory;
        this.sortEntries(catId);
        return this.entries.slice(0, count);
    }

    getEntryByName(name) {
        return this.entries.find(e => e.name === name);
    }

    getRank(name, categoryId = null) {
        const catId = categoryId || this.currentCategory;
        this.sortEntries(catId);
        const index = this.entries.findIndex(e => e.name === name);
        return index !== -1 ? index + 1 : null;
    }

    getCategories() {
        return this.categories;
    }

    setCategory(categoryId) {
        if (this.categories.find(c => c.id === categoryId)) {
            this.currentCategory = categoryId;
            this.sortEntries();
            this._save();
            return true;
        }
        return false;
    }

    // ---- CLEAR ----

    clear() {
        this.entries = [];
        this._save();
        if (this.eventBus) {
            this.eventBus.publish('leaderboard:cleared', {});
        }
    }

    // ---- SAVE / LOAD ----

    toJSON() {
        return {
            entries: this.entries,
            currentCategory: this.currentCategory
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.entries = data.entries || [];
        this.currentCategory = data.currentCategory || 'prestige';
        this._save();
    }
}