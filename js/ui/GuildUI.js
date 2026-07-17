// ============================================================
// FILE: js/ui/GuildUI.js – Gilden
// ============================================================
import BaseModalUI from './basemodal.js';
import { EVENTS } from '../core/events.js';

export default class GuildUI extends BaseModalUI {
    constructor(context) {
        super('guild-overlay', 'guild-close');

        this.eventBus = context.eventBus;
        this.guildManager = context.guildManager;
        this.chatManager = context.chatManager;
        this.hero = context.hero;

        this.container = document.getElementById('guild-container');

        this.eventBus.subscribe('ui:openGuild', () => this.open());
        this.eventBus.subscribe('guild:created', () => this.render());
        this.eventBus.subscribe('guild:memberJoined', () => this.render());
        this.eventBus.subscribe('guild:memberLeft', () => this.render());
        this.eventBus.subscribe('guild:deleted', () => this.render());
        this.eventBus.subscribe('guild:levelUp', () => this.render());
        this.eventBus.subscribe('chat:guildMessage', () => this.render());
    }

    onOpen() {
        this.render();
    }

    render() {
        const guild = this.guildManager.getPlayerGuild();

        if (!guild) {
            this._renderNoGuild();
            return;
        }

        this._renderGuild(guild);
    }

    _renderNoGuild() {
        this.container.innerHTML = `
            <div class="guild-no-guild">
                <span class="text-muted">Du bist in keiner Gilde.</span>
            </div>
            <div class="guild-actions">
                <button class="glass-btn primary" id="guild-create-btn">🏛️ Gilde gründen</button>
                <button class="glass-btn" id="guild-join-btn">🤝 Gilde beitreten</button>
            </div>
            <div class="guild-list-container">
                <h4 class="guild-list-title">Alle Gilden</h4>
                <div id="guild-list" class="modal-scroll-area"></div>
            </div>
        `;

        const createBtn = document.getElementById('guild-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this._showCreateDialog());
        }
        const joinBtn = document.getElementById('guild-join-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this._showJoinDialog());
        }

        const listContainer = document.getElementById('guild-list');
        if (listContainer) {
            const guilds = this.guildManager.getAllGuilds();
            if (guilds.length === 0) {
                listContainer.innerHTML = '<div class="text-muted text-sm text-italic">Keine Gilden vorhanden.</div>';
            } else {
                let html = '';
                for (const g of guilds) {
                    html += `
                        <div class="guild-list-item glass-inner-panel">
                            <div>
                                <div class="text-gold text-bold">${g.name}</div>
                                <div class="text-muted text-sm">Mitglieder: ${g.members.length} | Stufe ${g.level}</div>
                            </div>
                            <button class="glass-btn btn-small primary join-guild-btn" data-guild-id="${g.id}">Beitreten</button>
                        </div>
                    `;
                }
                listContainer.innerHTML = html;
                listContainer.querySelectorAll('.join-guild-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = parseInt(btn.dataset.guildId);
                        const result = this.guildManager.joinGuild(id);
                        if (result.success) {
                            this.render();
                        } else {
                            alert(result.message);
                        }
                    });
                });
            }
        }
    }

    _renderGuild(guild) {
        const members = this.guildManager.getGuildMembers(guild.id);
        const bonus = this.guildManager.getGuildBonus();

        this.container.innerHTML = `
            <div class="guild-header glass-inner-panel">
                <div class="guild-header-info">
                    <div class="guild-name">🏛️ ${guild.name}</div>
                    <div class="guild-desc">${guild.description}</div>
                </div>
                <div class="guild-header-stats">
                    <div class="guild-level">Stufe ${guild.level}</div>
                    <div class="guild-member-count">${guild.members.length} Mitglieder</div>
                </div>
                <div class="guild-bonus">Bonus: <span class="text-success">+${Math.round(bonus * 100)}% Partikelproduktion</span></div>
                <div class="guild-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${Math.min(100, (guild.experience / guild.expToNext) * 100)}%;"></div>
                    </div>
                    <div class="guild-exp-text">${Math.floor(guild.experience)} / ${guild.expToNext} EP</div>
                </div>
            </div>

            <div class="guild-actions-bar">
                <button class="glass-btn btn-danger btn-small" id="guild-leave-btn">🚪 Verlassen</button>
            </div>

            <div class="guild-section">
                <h4 class="guild-section-title">👥 Mitglieder</h4>
                <div id="guild-members" class="modal-scroll-area"></div>
            </div>

            <div class="guild-section">
                <h4 class="guild-section-title">💬 Gilden-Chat</h4>
                <div id="guild-chat" class="modal-scroll-area"></div>
                <div class="guild-chat-input-row">
                    <input id="guild-chat-input" type="text" placeholder="Nachricht..." class="ui-select" />
                    <button class="glass-btn primary btn-small" id="guild-chat-send">Senden</button>
                </div>
            </div>
        `;

        const leaveBtn = document.getElementById('guild-leave-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => this._leaveGuild());
        }
        const sendBtn = document.getElementById('guild-chat-send');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this._sendGuildChat());
        }
        const input = document.getElementById('guild-chat-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._sendGuildChat();
            });
        }

        const membersContainer = document.getElementById('guild-members');
        if (membersContainer) {
            let html = '';
            for (const member of members) {
                const isSelf = member === this.hero.name;
                html += `
                    <div class="guild-member-item">
                        <span class="${isSelf ? 'text-gold' : 'text-muted'}">${member} ${isSelf ? '⭐ (Du)' : ''}</span>
                    </div>
                `;
            }
            membersContainer.innerHTML = html;
        }

        this.renderChat();
    }

    renderChat() {
        const chatContainer = document.getElementById('guild-chat');
        if (!chatContainer) return;

        const messages = this.chatManager.getGuildMessages(50);
        let html = '';
        for (const msg of messages) {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const isSelf = msg.player === this.hero.name;
            html += `
                <div class="guild-chat-message">
                    <span class="text-muted text-sm">${time}</span>
                    <span class="${isSelf ? 'text-gold' : 'text-highlight'} text-bold">${msg.player}:</span>
                    <span class="text-sm">${msg.message}</span>
                </div>
            `;
        }
        chatContainer.innerHTML = html || '<div class="text-muted text-sm text-italic">Keine Nachrichten.</div>';
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    _sendGuildChat() {
        const input = document.getElementById('guild-chat-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const result = this.chatManager.sendGuildMessage(text);
        if (result.success) {
            input.value = '';
            this.render();
        } else {
            alert(result.message);
        }
    }

    _showCreateDialog() {
        const name = prompt('🏛️ Gildenname:');
        if (!name) return;
        const desc = prompt('Gilden-Beschreibung (optional):') || '';
        const result = this.guildManager.createGuild(name, desc);
        if (result.success) {
            this.render();
        } else {
            alert(result.message);
        }
    }

    _showJoinDialog() {
        const guilds = this.guildManager.getAllGuilds();
        if (guilds.length === 0) {
            alert('Es gibt keine Gilden zum Beitreten.');
            return;
        }
        let msg = 'Wähle eine Gilde:\n\n';
        for (const g of guilds) {
            msg += `${g.id}: ${g.name} (${g.members.length} Mitglieder, Stufe ${g.level})\n`;
        }
        const input = prompt(msg + '\nGib die Gilden-ID ein:');
        if (!input) return;
        const id = parseInt(input);
        if (isNaN(id)) {
            alert('Ungültige ID.');
            return;
        }
        const result = this.guildManager.joinGuild(id);
        if (result.success) {
            this.render();
        } else {
            alert(result.message);
        }
    }

    _leaveGuild() {
        if (confirm('Möchtest du deine Gilde wirklich verlassen?')) {
            const result = this.guildManager.leaveGuild();
            if (result.success) {
                this.render();
            } else {
                alert(result.message);
            }
        }
    }
}