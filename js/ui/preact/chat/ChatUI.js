/**
 * ============================================================
 * FILE: ui/preact/chat/ChatUI.js – Globaler Chat (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function ChatUI({ stateManager, eventBus, services }) {
  const { chatService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const globalMessages = useStateSelector(stateManager, (state) => state.chat.global);

  useEventBus(eventBus, EVENTS.UI_OPEN_CHAT, () => setIsOpen(true));
  useEventBus(eventBus, 'chat:globalMessage', () => {});

  if (!isOpen) return null;

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const result = chatService.sendGlobalMessage(chatInput.trim());
    if (result.success) {
      setChatInput('');
    } else {
      eventBus.publish('ui:showToast', { message: `❌ ${result.message}`, type: 'error', duration: 2000 });
    }
  };

  const handleClear = async () => {
    if (await window.gameConfirm('Möchtest du den globalen Chat leeren?')) {
      chatService.clearGlobalChat();
    }
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 600px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">💬 Globaler Chat</h2>

        <div class="modal-scroll-area" style="max-height: 50vh; overflow-y: auto; margin-bottom: 0.5rem;">
          ${globalMessages.length === 0 ? html`<div class="chat-empty" style="padding: 1rem; color: var(--color-text-muted); font-style: italic; text-align: center;">Keine Nachrichten.</div>` :
            globalMessages.slice(-100).map(msg => html`
              <div class="chat-message ${msg.player === hero.name ? 'self' : 'other'} glass-inner-panel" style="display: flex; gap: 0.5rem; padding: 0.3rem 0.8rem; margin-bottom: 0.2rem; border-left: 2px solid ${msg.player === hero.name ? 'var(--color-gold)' : 'var(--color-text-muted)'};">
                <span class="chat-time" style="color: var(--color-text-muted); font-size: 0.7rem; min-width: 60px;">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                <span class="chat-player" style="font-weight: bold; color: ${msg.player === hero.name ? 'var(--color-gold)' : 'var(--color-highlight)'};">${msg.player}:</span>
                <span class="chat-text" style="color: var(--color-text-main); word-break: break-word;">${msg.message}</span>
              </div>
            `)
          }
        </div>

        <div class="chat-input-row" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <input type="text" class="ui-select" placeholder="Nachricht..." value=${chatInput} onInput=${(e) => setChatInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && handleSend()} />
          <button class="glass-btn primary btn-small" onClick=${handleSend}>Senden</button>
          <button class="glass-btn btn-danger btn-small" onClick=${handleClear}>🗑️ Leeren</button>
        </div>
      </div>
    </div>
  `;
}