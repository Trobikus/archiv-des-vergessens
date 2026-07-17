// ============================================================
// FILE: js/core/CodexManager.js – Codex (Lore & Wissen)
// ============================================================
import { CODEX_ENTRIES } from '../data/codex_entries.js';
import { EVENTS } from './events.js';

export default class CodexManager {
    constructor(eventBus, hero) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.entries = this._initializeEntries();

        this.eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, this._onBossDefeated.bind(this));
        this.eventBus.subscribe(EVENTS.STORY_BRANCH_CHANGED, this._onBranchChanged.bind(this));
        this.eventBus.subscribe(EVENTS.FORGE_CRAFTED, this._onCrafted.bind(this));
        this.eventBus.subscribe(EVENTS.ACHIEVEMENT_UNLOCKED, this._onAchievement.bind(this));
        this.eventBus.subscribe('story:endingReached', this._onEnding.bind(this));
    }

    _initializeEntries() {
        const entries = {};
        for (const [key, entry] of Object.entries(CODEX_ENTRIES)) {
            entries[key] = {
                ...entry,
                unlocked: false,
                unlockedAt: null
            };
        }
        return entries;
    }

    // ---- UNLOCK ----

    unlockEntry(id) {
        if (!this.entries[id]) return false;
        if (this.entries[id].unlocked) return false;

        this.entries[id].unlocked = true;
        this.entries[id].unlockedAt = Date.now();

        this.eventBus.publish('codex:entryUnlocked', {
            entryId: id,
            entry: this.entries[id]
        });

        this.eventBus.publish(EVENTS.UI_ADD_LOG, {
            text: `📖 Codex-Eintrag freigeschaltet: ${this.entries[id].title}`,
            type: 'event'
        });

        return true;
    }

    isUnlocked(id) {
        return this.entries[id] ? this.entries[id].unlocked : false;
    }

    getEntry(id) {
        return this.entries[id] || null;
    }

    getAllEntries() {
        return Object.values(this.entries);
    }

    getEntriesByCategory(category) {
        return Object.values(this.entries).filter(e => e.category === category);
    }

    getUnlockedCount() {
        return Object.values(this.entries).filter(e => e.unlocked).length;
    }

    getTotalCount() {
        return Object.keys(this.entries).length;
    }

    getProgress() {
        return Math.floor((this.getUnlockedCount() / this.getTotalCount()) * 100);
    }

    // ---- EVENT-REAKTIONEN ----

    _onBossDefeated(data) {
        const boss = data.boss;
        // Boss-Einträge freischalten (basierend auf Boss-Namen)
        const bossEntries = Object.values(this.entries).filter(e =>
            e.category === 'bosses' && e.title.toLowerCase().includes(boss.name.toLowerCase())
        );
        for (const entry of bossEntries) {
            this.unlockEntry(entry.id);
        }

        // Zusätzliche Lore-Einträge
        if (boss.id === 1) this.unlockEntry('origin_of_mneme');
        if (boss.id === 5) this.unlockEntry('the_great_forgetting');
        if (boss.id === 10) this.unlockEntry('the_covenant');
    }

    _onBranchChanged(data) {
        // Kann genutzt werden, um Story-bezogene Einträge freizuschalten
        // z.B. wenn der Spieler einen bestimmten Pfad wählt
        const node = data.node;
        if (node && node.flags) {
            // Beispiel: Wenn der Spieler den Heldenpfad wählt
            if (node.flags.hero_path) {
                // Einen entsprechenden Codex-Eintrag freischalten
            }
        }
    }

    _onCrafted(data) {
        const item = data.item;
        if (item) {
            if (item.rarity === 'legendary') {
                this.unlockEntry('mneme_crown');
            }
            if (item.rarity === 'epic' && item.slot === 'weapon') {
                this.unlockEntry('ancient_blade');
            }
        }
    }

    _onAchievement(data) {
        // Kann verwendet werden, um Codex-Einträge für Erfolge freizuschalten
    }

    _onEnding(data) {
        const endingId = data.endingId;
        // Ende-Eintrag freischalten (z.B. 'ending_victory', 'ending_sacrifice')
        const entry = Object.values(this.entries).find(e =>
            e.category === 'endings' && e.id === endingId
        );
        if (entry) this.unlockEntry(entry.id);
    }

    // ---- MANUELLES FREISCHALTEN (für NPCs) ----

    unlockFromNPC(npcId) {
        const npcMap = {
            'archivist': ['origin_of_mneme', 'the_great_forgetting'],
            'merchant': ['mneme_crown', 'forgotten_chamber'],
            'guardian_npc': ['the_covenant', 'shadow_guardian'],
            'shadow_voice': ['nyx', 'the_great_forgetting']
        };

        const entries = npcMap[npcId] || [];
        for (const id of entries) {
            this.unlockEntry(id);
        }
    }

    // ---- SPEICHERN / LADEN ----

    toJSON() {
        const data = {};
        for (const [key, entry] of Object.entries(this.entries)) {
            data[key] = {
                unlocked: entry.unlocked,
                unlockedAt: entry.unlockedAt
            };
        }
        return data;
    }

    fromJSON(data) {
        if (!data) return;
        for (const [key, entryData] of Object.entries(data)) {
            if (this.entries[key]) {
                this.entries[key].unlocked = entryData.unlocked || false;
                this.entries[key].unlockedAt = entryData.unlockedAt || null;
            }
        }
    }
}