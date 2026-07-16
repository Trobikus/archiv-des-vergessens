// --- START OF FILE ui/FriendUI.js ---

import BaseModalUI from './basemodal.js';
import { EVENTS } from '../core/events.js';

export default class FriendUI extends BaseModalUI {
    constructor(context) {
        super('friend-overlay', 'friend-close');

        this.eventBus = context.eventBus;
        this.friendManager = context.friendManager;
        this.hero = context.hero;

        this.container = document.getElementById('friend-container');

        this.eventBus.subscribe('ui:openFriends', () => this.open());
        this.eventBus.subscribe('friend:accepted', () => this.render());
        this.eventBus.subscribe('friend:removed', () => this.render());
        this.eventBus.subscribe('friend:requestSent', () => this.render());
    }

    onOpen() {
        this.render();
    }

    render() {
        const friends = this.friendManager.getFriends();
        const pending = this.friendManager.getPendingRequests();
        const sent = this.friendManager.getSentRequests();

        let html = `
            <div class="friend-add-row">
                <input id="friend-add-input" type="text" placeholder="Spielername..." class="ui-select" />
                <button class="glass-btn primary btn-small" id="friend-add-btn">➕ Hinzufügen</button>
            </div>
        `;

        if (pending.length > 0) {
            html += `<h4 class="friend-section-title">📩 Anfragen</h4>`;
            for (const req of pending) {
                html += `
                    <div class="friend-item pending glass-inner-panel">
                        <span>${req.from}</span>
                        <button class="glass-btn btn-small primary accept-friend-btn" data-name="${req.from}">✅ Annehmen</button>
                    </div>
                `;
            }
        }

        if (friends.length === 0) {
            html += `<div class="friend-empty">Keine Freunde.</div>`;
        } else {
            html += `<h4 class="friend-section-title">👥 Freunde (${friends.length})</h4>`;
            for (const friend of friends) {
                html += `
                    <div class="friend-item active glass-inner-panel">
                        <span>${friend.name}</span>
                        <button class="glass-btn btn-danger btn-small remove-friend-btn" data-name="${friend.name}">✕ Entfernen</button>
                    </div>
                `;
            }
        }

        if (sent.length > 0) {
            html += `<h4 class="friend-section-title muted">📤 Gesendet</h4>`;
            for (const req of sent) {
                html += `
                    <div class="friend-item sent glass-inner-panel">
                        <span>${req.to} (wartet)</span>
                    </div>
                `;
            }
        }

        this.container.innerHTML = html;

        this.container.querySelectorAll('.accept-friend-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const result = this.friendManager.acceptFriend(name);
                if (result.success) {
                    this.render();
                } else {
                    alert(result.message);
                }
            });
        });

        this.container.querySelectorAll('.remove-friend-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                if (confirm(`${name} aus der Freundesliste entfernen?`)) {
                    const result = this.friendManager.removeFriend(name);
                    if (result.success) {
                        this.render();
                    } else {
                        alert(result.message);
                    }
                }
            });
        });

        const addBtn = document.getElementById('friend-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this._addFriend());
        }
        const addInput = document.getElementById('friend-add-input');
        if (addInput) {
            addInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._addFriend();
            });
        }
    }

    _addFriend() {
        const input = document.getElementById('friend-add-input');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;
        const result = this.friendManager.addFriend(name);
        if (result.success) {
            input.value = '';
            this.render();
        } else {
            alert(result.message);
        }
    }
}