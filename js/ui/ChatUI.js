// --- START OF FILE ui/ChatUI.js ---

import BaseModalUI from './basemodal.js';
import { EVENTS } from '../core/events.js';

export default class ChatUI extends BaseModalUI {
    constructor(context) {
        super('chat-overlay', 'chat-close');

        this.eventBus = context.eventBus;
        this.chatManager = context.chatManager;
        this.hero = context.hero;

        this.chatContainer = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');
        this.chatClearBtn = document.getElementById('chat-clear-btn');

        this.eventBus.subscribe('ui:openChat', () => this.open());
        this.eventBus.subscribe('chat:globalMessage', () => this.renderChat());
        this.eventBus.subscribe('chat:cleared', () => this.renderChat());

        if (this.chatSendBtn) {
            this.chatSendBtn.addEventListener('click', () => this._sendMessage());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._sendMessage();
            });
        }
        if (this.chatClearBtn) {
            this.chatClearBtn.addEventListener('click', () => {
                if (confirm('Möchtest du den globalen Chat leeren?')) {
                    this.chatManager.clearGlobalChat();
                    this.renderChat();
                }
            });
        }
    }

    onOpen() {
        this.renderChat();
    }

    renderChat() {
        if (!this.chatContainer) return;

        const messages = this.chatManager.getGlobalMessages(100);
        let html = '';
        for (const msg of messages) {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const isSelf = msg.player === this.hero.name;
            html += `
        <div style="display: flex; gap: 0.5rem; padding: 0.2rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);">
          <span class="text-muted text-sm" style="min-width: 60px;">${time}</span>
          <span class="${isSelf ? 'text-gold' : 'text-highlight'} text-bold">${msg.player}:</span>
          <span class="text-sm">${msg.message}</span>
        </div>
      `;
        }
        this.chatContainer.innerHTML = html || '<div class="text-muted text-sm text-italic">Keine Nachrichten.</div>';
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    _sendMessage() {
        if (!this.chatInput) return;
        const text = this.chatInput.value.trim();
        if (!text) return;
        const result = this.chatManager.sendGlobalMessage(text);
        if (result.success) {
            this.chatInput.value = '';
            this.renderChat();
        } else {
            alert(result.message);
        }
    }
}