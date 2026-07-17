// ============================================================
// FILE: js/core/GuildManager.js – Gildenverwaltung
// ============================================================
import { EVENTS } from './events.js';

export default class GuildManager {
    constructor(eventBus, hero) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.STORAGE_KEY = 'archiv_guild_data';

        this.guilds = {};
        this.memberGuilds = {};
        this.nextGuildId = 1;

        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => this._onPrestige());

        this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.guilds = data.guilds || {};
                this.memberGuilds = data.memberGuilds || {};
                this.nextGuildId = data.nextGuildId || 1;
            }
        } catch (e) {
            console.warn('[GuildManager] Load failed:', e);
        }
    }

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                guilds: this.guilds,
                memberGuilds: this.memberGuilds,
                nextGuildId: this.nextGuildId
            }));
        } catch (e) {
            console.warn('[GuildManager] Save failed:', e);
        }
    }

    createGuild(name, description = '') {
        const playerName = this.hero.name;
        if (this.memberGuilds[playerName]) {
            return { success: false, message: 'Du bist bereits in einer Gilde.' };
        }
        if (Object.values(this.guilds).some(g => g.name.toLowerCase() === name.toLowerCase())) {
            return { success: false, message: 'Eine Gilde mit diesem Namen existiert bereits.' };
        }
        if (name.length < 3 || name.length > 30) {
            return { success: false, message: 'Der Gildenname muss zwischen 3 und 30 Zeichen lang sein.' };
        }

        const id = this.nextGuildId++;
        this.guilds[id] = {
            id,
            name: name.trim(),
            description: description.trim() || 'Eine Gilde des Mneme-Bundes.',
            level: 1,
            members: [playerName],
            created: Date.now(),
            experience: 0,
            expToNext: 100
        };
        this.memberGuilds[playerName] = id;

        this._save();
        this.eventBus.publish('guild:created', { guildId: id, guild: this.guilds[id] });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🏛️ Gilde "${name}" wurde gegründet!`, type: 'event' });

        return { success: true, guildId: id, guild: this.guilds[id] };
    }

    joinGuild(guildId) {
        const playerName = this.hero.name;
        if (this.memberGuilds[playerName]) {
            return { success: false, message: 'Du bist bereits in einer Gilde.' };
        }
        const guild = this.guilds[guildId];
        if (!guild) {
            return { success: false, message: 'Gilde nicht gefunden.' };
        }
        if (guild.members.includes(playerName)) {
            return { success: false, message: 'Du bist bereits Mitglied dieser Gilde.' };
        }

        guild.members.push(playerName);
        this.memberGuilds[playerName] = guildId;

        this._save();
        this.eventBus.publish('guild:memberJoined', { guildId, playerName });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `👤 ${playerName} ist der Gilde "${guild.name}" beigetreten.`, type: 'event' });

        return { success: true, guild };
    }

    leaveGuild() {
        const playerName = this.hero.name;
        const guildId = this.memberGuilds[playerName];
        if (!guildId) {
            return { success: false, message: 'Du bist in keiner Gilde.' };
        }
        const guild = this.guilds[guildId];
        if (!guild) {
            delete this.memberGuilds[playerName];
            this._save();
            return { success: true, message: 'Gilde nicht mehr vorhanden.' };
        }

        if (guild.members.length === 1 && guild.members[0] === playerName) {
            delete this.guilds[guildId];
            delete this.memberGuilds[playerName];
            this._save();
            this.eventBus.publish('guild:deleted', { guildId });
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `💔 Die Gilde "${guild.name}" wurde aufgelöst.`, type: 'event' });
            return { success: true, message: 'Gilde aufgelöst.' };
        }

        guild.members = guild.members.filter(m => m !== playerName);
        delete this.memberGuilds[playerName];

        this._save();
        this.eventBus.publish('guild:memberLeft', { guildId, playerName });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `👋 ${playerName} hat die Gilde "${guild.name}" verlassen.`, type: 'event' });

        return { success: true, message: 'Gilde verlassen.' };
    }

    getPlayerGuild() {
        const playerName = this.hero.name;
        const guildId = this.memberGuilds[playerName];
        if (!guildId) return null;
        return this.guilds[guildId] || null;
    }

    getGuild(id) {
        return this.guilds[id] || null;
    }

    getAllGuilds() {
        return Object.values(this.guilds);
    }

    getGuildMembers(guildId) {
        const guild = this.guilds[guildId];
        if (!guild) return [];
        return guild.members;
    }

    getGuildBonus() {
        const guild = this.getPlayerGuild();
        if (!guild) return 0;
        return guild.level * 0.05;
    }

    addGuildExperience(amount) {
        const guild = this.getPlayerGuild();
        if (!guild) return;
        guild.experience += amount;
        while (guild.experience >= guild.expToNext) {
            guild.experience -= guild.expToNext;
            guild.level++;
            guild.expToNext = Math.floor(guild.expToNext * 1.3);
            this.eventBus.publish('guild:levelUp', { guildId: guild.id, level: guild.level });
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🏛️ Gilde "${guild.name}" erreicht Stufe ${guild.level}!`, type: 'event' });
        }
        this._save();
    }

    _onPrestige() {
        // Gilden-Bonus bleibt erhalten
    }

    toJSON() {
        return {
            guilds: this.guilds,
            memberGuilds: this.memberGuilds,
            nextGuildId: this.nextGuildId
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.guilds = data.guilds || {};
        this.memberGuilds = data.memberGuilds || {};
        this.nextGuildId = data.nextGuildId || 1;
        this._save();
    }
}