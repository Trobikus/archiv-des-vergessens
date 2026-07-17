// ============================================================
// FILE: js/core/FriendManager.js – Freundesliste
// ============================================================
import { EVENTS } from './events.js';

export default class FriendManager {
    constructor(eventBus, hero) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.STORAGE_KEY = 'archiv_friends_data';

        this.friends = [];
        this.pendingRequests = [];
        this.maxFriends = 50;

        this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.friends = data.friends || [];
                this.pendingRequests = data.pendingRequests || [];
            }
        } catch (e) {
            console.warn('[FriendManager] Load failed:', e);
        }
    }

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                friends: this.friends,
                pendingRequests: this.pendingRequests
            }));
        } catch (e) {
            console.warn('[FriendManager] Save failed:', e);
        }
    }

    addFriend(name) {
        const playerName = this.hero.name;
        if (name === playerName) {
            return { success: false, message: 'Du kannst dich nicht selbst als Freund hinzufügen.' };
        }
        if (this.friends.some(f => f.name === name)) {
            return { success: false, message: `${name} ist bereits dein Freund.` };
        }
        if (this.friends.length >= this.maxFriends) {
            return { success: false, message: 'Du hast die maximale Anzahl an Freunden erreicht.' };
        }

        const existing = this.pendingRequests.find(r => r.from === name && r.to === playerName);
        if (existing) {
            return { success: false, message: 'Du hast bereits eine Anfrage von dieser Person.' };
        }

        this.pendingRequests.push({ from: name, to: playerName, timestamp: Date.now() });
        this._save();

        this.eventBus.publish('friend:requestSent', { from: name, to: playerName });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🤝 Freundschaftsanfrage an ${name} gesendet.`, type: 'event' });

        return { success: true, message: `Anfrage an ${name} gesendet.` };
    }

    acceptFriend(name) {
        const playerName = this.hero.name;
        const request = this.pendingRequests.find(r => r.from === name && r.to === playerName);
        if (!request) {
            return { success: false, message: 'Keine Anfrage von dieser Person.' };
        }

        this.pendingRequests = this.pendingRequests.filter(r => r !== request);
        this.friends.push({ name, added: Date.now() });
        this._save();

        this.eventBus.publish('friend:accepted', { name, friend: { name } });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🤝 ${name} ist jetzt dein Freund!`, type: 'event' });

        return { success: true, message: `${name} ist jetzt dein Freund.` };
    }

    removeFriend(name) {
        const index = this.friends.findIndex(f => f.name === name);
        if (index === -1) {
            return { success: false, message: `${name} ist nicht in deiner Freundesliste.` };
        }
        this.friends.splice(index, 1);
        this._save();

        this.eventBus.publish('friend:removed', { name });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `👋 ${name} wurde aus deiner Freundesliste entfernt.`, type: 'event' });

        return { success: true, message: `${name} entfernt.` };
    }

    getFriends() {
        return [...this.friends];
    }

    getPendingRequests() {
        const playerName = this.hero.name;
        return this.pendingRequests.filter(r => r.to === playerName);
    }

    getSentRequests() {
        const playerName = this.hero.name;
        return this.pendingRequests.filter(r => r.from === playerName);
    }

    toJSON() {
        return {
            friends: this.friends,
            pendingRequests: this.pendingRequests
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.friends = data.friends || [];
        this.pendingRequests = data.pendingRequests || [];
        this._save();
    }
}