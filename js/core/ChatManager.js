// --- START OF FILE core/ChatManager.js ---

import { EVENTS } from './events.js';

export default class ChatManager {
    constructor(eventBus, hero, guildManager) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.guildManager = guildManager;
        this.STORAGE_KEY = 'archiv_chat_data';

        this.maxMessages = 100;
        this.messages = {
            global: [], // { id, player, message, timestamp, type }
            guild: []   // { id, player, message, timestamp }
        };
        this.messageId = 0;

        this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.messages = data.messages || { global: [], guild: [] };
                this.messageId = data.messageId || 0;
            }
        } catch (e) {
            console.warn('[ChatManager] Load failed:', e);
        }
    }

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                messages: this.messages,
                messageId: this.messageId
            }));
        } catch (e) {
            console.warn('[ChatManager] Save failed:', e);
        }
    }

    // ---- NACHRICHTEN ----

    sendGlobalMessage(text) {
        if (!text || text.trim().length === 0) {
            return { success: false, message: 'Nachricht darf nicht leer sein.' };
        }
        if (text.length > 200) {
            return { success: false, message: 'Nachricht ist zu lang (max. 200 Zeichen).' };
        }

        const playerName = this.hero.name;
        const msg = {
            id: ++this.messageId,
            player: playerName,
            message: text.trim(),
            timestamp: Date.now(),
            type: 'global'
        };

        this.messages.global.push(msg);
        if (this.messages.global.length > this.maxMessages) {
            this.messages.global = this.messages.global.slice(-this.maxMessages);
        }

        this._save();
        this.eventBus.publish('chat:globalMessage', msg);

        return { success: true, msg };
    }

    sendGuildMessage(text) {
        if (!text || text.trim().length === 0) {
            return { success: false, message: 'Nachricht darf nicht leer sein.' };
        }
        if (text.length > 200) {
            return { success: false, message: 'Nachricht ist zu lang (max. 200 Zeichen).' };
        }

        const guild = this.guildManager.getPlayerGuild();
        if (!guild) {
            return { success: false, message: 'Du bist in keiner Gilde.' };
        }

        const playerName = this.hero.name;
        const msg = {
            id: ++this.messageId,
            player: playerName,
            message: text.trim(),
            timestamp: Date.now(),
            guildId: guild.id
        };

        this.messages.guild.push(msg);
        if (this.messages.guild.length > this.maxMessages) {
            this.messages.guild = this.messages.guild.slice(-this.maxMessages);
        }

        this._save();
        this.eventBus.publish('chat:guildMessage', msg);

        return { success: true, msg };
    }

    getGlobalMessages(limit = 50) {
        return this.messages.global.slice(-limit);
    }

    getGuildMessages(limit = 50) {
        return this.messages.guild.slice(-limit);
    }

    clearGlobalChat() {
        this.messages.global = [];
        this._save();
        this.eventBus.publish('chat:cleared', { type: 'global' });
        return { success: true };
    }

    clearGuildChat() {
        this.messages.guild = [];
        this._save();
        this.eventBus.publish('chat:cleared', { type: 'guild' });
        return { success: true };
    }

    // ---- SPEICHERN / LADEN ----

    toJSON() {
        return {
            messages: this.messages,
            messageId: this.messageId
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.messages = data.messages || { global: [], guild: [] };
        this.messageId = data.messageId || 0;
        this._save();
    }
}