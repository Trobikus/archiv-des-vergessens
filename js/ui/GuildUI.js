// --- START OF FILE ui/GuildUI.js ---

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
        this.membersContainer = document.getElementById('guild-members');
        this.chatContainer = document.getElementById('guild-chat');
        this.chatInput = document.getElementById('guild-chat-input');
        this.chatSendBtn = document.getElementById('guild-chat-send');

        // Buttons
        this.createBtn = document.getElementById('guild-create-btn');
        this.joinBtn = document.getElementById('guild-join-btn');
        this.leaveBtn = document.getElementById('guild-leave-btn');

        // Event-Bus abonnieren
        this.eventBus.subscribe('ui:openGuild', () => this.open());
        this.eventBus.subscribe('guild:created', () => this.render());
        this.eventBus.subscribe('guild:memberJoined', () => this.render());
        this.eventBus.subscribe('guild:memberLeft', () => this.render());
        this.eventBus.subscribe('guild:deleted', () => this.render());
        this.eventBus.subscribe('guild:levelUp', () => this.render());
        this.eventBus.subscribe('chat:guildMessage', () => this.renderChat());

        if (this.chatSendBtn) {
            this.chatSendBtn.addEventListener('click', () => this._sendGuildChat());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._sendGuildChat();
            });
        }
        if (this.createBtn) {
            this.createBtn.addEventListener('click', () => this._showCreateDialog());
        }
        if (this.joinBtn) {
            this.joinBtn.addEventListener('click', () => this._showJoinDialog());
        }
        if (this.leaveBtn) {
            this.leaveBtn.addEventListener('click', () => this._leaveGuild());
        }
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
      <div class="text-center text-muted mb-2">Du bist in keiner Gilde.</div>
      <div class="flex-row gap-md" style="justify-content: center;">
        <button class="glass-btn primary" id="guild-create-btn">🏛️ Gilde gründen</button>
        <button class="glass-btn" id="guild-join-btn">🤝 Gilde beitreten</button>
      </div>
      <div class="mt-2">
        <h4 class="text-gold cinzel text-sm mb-1">Alle Gilden</h4>
        <div id="guild-list" class="modal-scroll-area" style="max-height: 200px;"></div>
      </div>
    `;

        // Buttons neu binden
        const createBtn = document.getElementById('guild-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this._showCreateDialog());
        }
        const joinBtn = document.getElementById('guild-join-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this._showJoinDialog());
        }

        // Gilden-Liste
        const listContainer = document.getElementById('guild-list');
        if (listContainer) {
            const guilds = this.guildManager.getAllGuilds();
            if (guilds.length === 0) {
                listContainer.innerHTML = '<div class="text-muted text-sm text-italic">Keine Gilden vorhanden.</div>';
            } else {
                let html = '';
                for (const g of guilds) {
                    html += `
            <div class="ui-card flex-between" style="padding: 0.5rem 1rem; margin-bottom: 0.5rem;">
              <div>
                <div class="text-gold text-bold">${g.name}</div>
                <div class="text-muted text-sm">Mitglieder: ${g.members.length} | Stufe ${g.level}</div>
              </div>
              <button class="glass-btn btn-small join-guild-btn" data-guild-id="${g.id}">Beitreten</button>
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
      <div class="glass-inner-panel mb-1">
        <div class="flex-between">
          <div>
            <div class="text-gold text-bold cinzel text-lg">${guild.name}</div>
            <div class="text-muted text-sm">${guild.description}</div>
          </div>
          <div class="text-right">
            <div class="text-gold text-bold">Stufe ${guild.level}</div>
            <div class="text-muted text-sm">${guild.members.length} Mitglieder</div>
          </div>
        </div>
        <div class="mt-1 text-sm">
          <span class="text-muted">Bonus:</span>
          <span class="text-success">+${Math.round(bonus * 100)}% Partikelproduktion</span>
        </div>
        <div class="mt-1">
          <div class="progress-bar-container" style="height: 10px;">
            <div class="progress-bar-fill" style="width: ${Math.min(100, (guild.experience / guild.expToNext) * 100)}%;"></div>
          </div>
          <div class="text-muted text-sm text-center">${Math.floor(guild.experience)} / ${guild.expToNext} EP</div>
        </div>
      </div>

      <div class="flex-row gap-sm mb-1">
        <button class="glass-btn btn-danger btn-small" id="guild-leave-btn">Verlassen</button>
      </div>

      <h4 class="text-gold cinzel text-sm mb-1">Mitglieder</h4>
      <div id="guild-members" class="modal-scroll-area" style="max-height: 120px; margin-bottom: 1rem;"></div>

      <h4 class="text-gold cinzel text-sm mb-1">Gilden-Chat</h4>
      <div id="guild-chat" class="modal-scroll-area" style="max-height: 150px; margin-bottom: 0.5rem;"></div>
      <div class="flex-row gap-sm">
        <input id="guild-chat-input" type="text" placeholder="Nachricht..." class="ui-select" style="flex: 1; padding: 0.5rem;" />
        <button class="glass-btn primary btn-small" id="guild-chat-send">Senden</button>
      </div>
    `;

        // Buttons neu binden
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

        // Mitglieder rendern
        const membersContainer = document.getElementById('guild-members');
        if (membersContainer) {
            let html = '';
            for (const member of members) {
                const isSelf = member === this.hero.name;
                html += `
          <div class="flex-between" style="padding: 0.2rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span class="${isSelf ? 'text-gold' : 'text-muted'}">${member} ${isSelf ? '(Du)' : ''}</span>
          </div>
        `;
            }
            membersContainer.innerHTML = html;
        }

        // Chat rendern
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
        <div style="display: flex; gap: 0.5rem; padding: 0.1rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);">
          <span class="text-muted text-sm" style="min-width: 60px;">${time}</span>
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
            this.renderChat();
        } else {
            alert(result.message);
        }
    }

    _showCreateDialog() {
        const name = prompt('Gildenname:');
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
        // Zeige alle Gilden zum Beitreten
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