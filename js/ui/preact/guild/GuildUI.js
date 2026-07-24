/**
 * ============================================================
 * FILE: ui/preact/guild/GuildUI.js – Gilde (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function GuildUI({ stateManager, eventBus, services }) {
  const { guildService, chatService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildDesc, setGuildDesc] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [guildList, setGuildList] = useState([]);

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const guild = useStateSelector(stateManager, (state) => {
    const guildId = state.guild.id;
    return guildId ? state.guild.guilds[guildId] : null;
  });
  const guildMembers = guild ? guild.members : [];
  const chatMessages = useStateSelector(stateManager, (state) => state.chat.guild);

  useEventBus(eventBus, EVENTS.UI_OPEN_GUILD, () => setIsOpen(true));
  useEventBus(eventBus, 'ui:closeAllModals', () => setIsOpen(false));
  useEventBus(eventBus, 'guild:created', () => setIsOpen(false));
  useEventBus(eventBus, 'guild:memberJoined', () => {});
  useEventBus(eventBus, 'guild:memberLeft', () => {});
  useEventBus(eventBus, 'guild:deleted', () => {});

  if (!isOpen) return null;

  const handleCreateGuild = () => {
    if (!guildName.trim()) {
      eventBus.publish('ui:showToast', { message: 'Bitte gib einen Gildenname ein.', type: 'warning', duration: 2000 });
      return;
    }
    const result = guildService.createGuild(guildName.trim(), guildDesc.trim());
    if (result.success) {
      eventBus.publish('ui:showToast', { message: `🏛️ Gilde "${guildName}" gegründet!`, type: 'success', duration: 3000 });
      setGuildName('');
      setGuildDesc('');
    } else {
      eventBus.publish('ui:showToast', { message: `❌ ${result.message}`, type: 'error', duration: 2000 });
    }
  };

  const handleJoinGuild = (id) => {
    const result = guildService.joinGuild(id);
    if (result.success) {
      eventBus.publish('ui:showToast', { message: `🤝 Gilde beigetreten!`, type: 'success', duration: 3000 });
    } else {
      eventBus.publish('ui:showToast', { message: `❌ ${result.message}`, type: 'error', duration: 2000 });
    }
  };

  const handleLeaveGuild = async () => {
    if (!(await window.gameConfirm('Möchtest du deine Gilde wirklich verlassen?'))) return;
    const result = guildService.leaveGuild();
    if (result.success) {
      eventBus.publish('ui:showToast', { message: result.message, type: 'info', duration: 2000 });
    } else {
      eventBus.publish('ui:showToast', { message: `❌ ${result.message}`, type: 'error', duration: 2000 });
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const result = chatService.sendGuildMessage(chatInput.trim());
    if (result.success) {
      setChatInput('');
    } else {
      eventBus.publish('ui:showToast', { message: `❌ ${result.message}`, type: 'error', duration: 2000 });
    }
  };

  // Alle Gilden für Beitrittsliste abrufen
  const allGuilds = guildService.getAllGuilds();

  // Render: Keine Gilde
  if (!guild) {
    return html`
      <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
        <div class="modal-content glass-panel" style="width: 650px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
          <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
          <h2 class="modal-title glow-text cinzel text-center">🏛️ Gilde</h2>

          <div class="guild-no-guild text-center" style="padding: 1rem; font-size: 1.1rem; color: var(--color-text-muted);">
            Du bist in keiner Gilde.
          </div>

          <div class="guild-actions" style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; max-width: 400px;">
              <input type="text" class="ui-select" placeholder="Gildenname" value=${guildName} onInput=${(e) => setGuildName(e.target.value)} />
              <input type="text" class="ui-select" placeholder="Beschreibung (optional)" value=${guildDesc} onInput=${(e) => setGuildDesc(e.target.value)} />
              <button class="glass-btn primary" onClick=${handleCreateGuild}>🏛️ Gilde gründen</button>
            </div>
          </div>

          <div class="guild-list-container">
            <h4 class="guild-list-title" style="font-family: var(--font-header); color: var(--color-gold); border-bottom: 1px solid rgba(197,160,89,0.1); padding-bottom: 0.3rem; margin-bottom: 0.5rem;">Alle Gilden</h4>
            <div class="modal-scroll-area" style="max-height: 200px; overflow-y: auto;">
              ${allGuilds.length === 0 ? html`<div class="text-muted text-sm text-italic">Keine Gilden vorhanden.</div>` :
                allGuilds.map(g => html`
                  <div class="guild-list-item glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; margin-bottom: 0.5rem; border-left: 2px solid var(--color-gold);">
                    <div>
                      <div class="text-gold text-bold">${g.name}</div>
                      <div class="text-muted text-sm">Mitglieder: ${g.members.length} | Stufe ${g.level}</div>
                    </div>
                    <button class="glass-btn btn-small primary" onClick=${() => handleJoinGuild(g.id)}>Beitreten</button>
                  </div>
                `)
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Render: Gilde vorhanden
  const bonus = guild.level * 0.05;
  const progress = Math.min(100, (guild.experience / guild.expToNext) * 100);

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 650px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">🏛️ Gilde</h2>

        <div class="guild-header glass-inner-panel" style="padding: 1rem 1.2rem; margin-bottom: 1rem; border-left: 3px solid var(--color-gold);">
          <div class="guild-header-info">
            <div class="guild-name" style="font-family: var(--font-header); font-size: 1.3rem; color: var(--color-gold);">${guild.name}</div>
            <div class="guild-desc" style="color: var(--color-text-muted); font-size: 0.9rem;">${guild.description}</div>
          </div>
          <div class="guild-header-stats" style="display: flex; gap: 1.5rem; margin-top: 0.5rem;">
            <span class="guild-level" style="color: var(--color-gold); font-weight: bold;">Stufe ${guild.level}</span>
            <span class="guild-member-count" style="color: var(--color-text-muted);">${guild.members.length} Mitglieder</span>
          </div>
          <div class="guild-bonus" style="margin-top: 0.3rem; font-size: 0.9rem;">Bonus: <span class="text-success">+${Math.round(bonus * 100)}% Partikelproduktion</span></div>
          <div class="guild-progress" style="margin-top: 0.5rem;">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progress}%;"></div>
            </div>
            <div class="guild-exp-text" style="text-align: center; font-size: 0.7rem; color: var(--color-text-muted); margin-top: 0.1rem;">${Math.floor(guild.experience)} / ${guild.expToNext} EP</div>
          </div>
        </div>

        <div class="guild-actions-bar" style="display: flex; gap: 0.8rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <button class="glass-btn btn-danger btn-small" onClick=${handleLeaveGuild}>🚪 Verlassen</button>
        </div>

        <div class="guild-section" style="margin-top: 1rem;">
          <h4 class="guild-section-title" style="font-family: var(--font-header); color: var(--color-gold); border-bottom: 1px solid rgba(197,160,89,0.1); padding-bottom: 0.3rem; margin-bottom: 0.5rem;">👥 Mitglieder</h4>
          <div class="modal-scroll-area" style="max-height: 150px; overflow-y: auto;">
            ${guildMembers.map(name => html`
              <div class="guild-member-item" style="padding: 0.2rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.02);">
                <span class="${name === hero.name ? 'text-gold' : 'text-muted'}">${name} ${name === hero.name ? '⭐ (Du)' : ''}</span>
              </div>
            `)}
          </div>
        </div>

        <div class="guild-section" style="margin-top: 1rem;">
          <h4 class="guild-section-title" style="font-family: var(--font-header); color: var(--color-gold); border-bottom: 1px solid rgba(197,160,89,0.1); padding-bottom: 0.3rem; margin-bottom: 0.5rem;">💬 Gilden-Chat</h4>
          <div class="modal-scroll-area" style="max-height: 120px; overflow-y: auto; margin-bottom: 0.5rem;">
            ${chatMessages.length === 0 ? html`<div class="text-muted text-sm text-italic">Keine Nachrichten.</div>` :
              chatMessages.slice(-50).map(msg => html`
                <div class="guild-chat-message" style="display: flex; gap: 0.5rem; padding: 0.1rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);">
                  <span class="text-muted text-sm">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                  <span class="${msg.player === hero.name ? 'text-gold' : 'text-highlight'} text-bold">${msg.player}:</span>
                  <span class="text-sm">${msg.message}</span>
                </div>
              `)
            }
          </div>
          <div class="guild-chat-input-row" style="display: flex; gap: 0.5rem;">
            <input type="text" class="ui-select" placeholder="Nachricht..." value=${chatInput} onInput=${(e) => setChatInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && handleSendChat()} />
            <button class="glass-btn primary btn-small" onClick=${handleSendChat}>Senden</button>
          </div>
        </div>
      </div>
    </div>
  `;
}