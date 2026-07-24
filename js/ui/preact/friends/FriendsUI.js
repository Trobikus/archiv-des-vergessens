/**
 * ============================================================
 * FILE: ui/preact/friends/FriendsUI.js – Freunde (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function FriendsUI({ stateManager, eventBus, services }) {
  const { friendService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [friendInput, setFriendInput] = useState('');

  // Lese State über useStateSelector
  const friendsState = useStateSelector(stateManager, (state) => state.friends) || { list: [], pending: [], sent: [] };
  const hero = useStateSelector(stateManager, (state) => state.hero);

  useEventBus(eventBus, EVENTS.UI_OPEN_FRIENDS, () => setIsOpen(true));
  useEventBus(eventBus, 'ui:closeAllModals', () => setIsOpen(false));

  // Simulation: Wenn die Liste komplett leer ist, schlage nach 8 Sekunden eine Anfrage vor
  useEffect(() => {
    if (isOpen && friendsState.list.length === 0 && friendsState.pending.length === 0 && friendsState.sent.length === 0) {
      const timer = setTimeout(() => {
        const potentialFrom = ["Eldor", "Chronos", "Luminos", "Thalia", "Aria", "Kaelen", "Morrigan"];
        const randomName = potentialFrom[Math.floor(Math.random() * potentialFrom.length)];
        friendService.simulateIncomingRequest(randomName);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, friendsState.list.length, friendsState.pending.length, friendsState.sent.length]);

  if (!isOpen) return null;

  const handleAddFriend = () => {
    const targetName = friendInput.trim();
    if (!targetName) {
      eventBus.publish('ui:showToast', {
        message: 'Bitte gib einen Namen ein.',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    const result = friendService.addFriend(targetName);
    if (result.success) {
      setFriendInput('');
    } else {
      eventBus.publish('ui:showToast', {
        message: `❌ ${result.message}`,
        type: 'error',
        duration: 2000
      });
    }
  };

  const handleAccept = (name) => {
    friendService.acceptFriend(name);
  };

  const handleDecline = (name) => {
    friendService.declineFriendRequest(name);
  };

  const handleCancel = (name) => {
    friendService.cancelSentRequest(name);
  };

  const handleRemove = async (name) => {
    if (await window.gameConfirm(`Möchtest du ${name} wirklich aus deiner Freundesliste entfernen?`)) {
      friendService.removeFriend(name);
    }
  };

  const pendingRequests = friendsState.pending || [];
  const sentRequests = friendsState.sent || [];
  const friendsList = friendsState.list || [];

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 550px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        
        <h2 class="modal-title glow-text cinzel text-center">👥 Chronisten-Bund</h2>
        <p class="text-center text-muted text-sm mb-1" style="margin-top: -0.5rem; font-style: italic;">
          Verbinde dich mit anderen Hütern des Archivs.
        </p>

        <!-- ADD FRIEND ROW -->
        <div class="friend-add-row" style="display: flex; gap: 0.5rem; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); border-radius: 4px; margin-bottom: 1.5rem;">
          <input type="text" class="ui-select" style="flex: 1;" placeholder="Name des Chronisten..." value=${friendInput} onInput=${(e) => setFriendInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && handleAddFriend()} />
          <button class="glass-btn primary" style="padding: 0.5rem 1.2rem;" onClick=${handleAddFriend}>➕ Hinzufügen</button>
        </div>

        <div class="modal-scroll-area" style="max-height: 50vh; overflow-y: auto; padding-right: 0.3rem;">
          
          <!-- EINGEHENDE ANFRAGEN -->
          ${pendingRequests.length > 0 && html`
            <div style="margin-bottom: 1.5rem;">
              <h4 class="friend-section-title">📥 Ausstehende Anfragen (${pendingRequests.length})</h4>
              ${pendingRequests.map(req => html`
                <div class="friend-item pending glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; margin-bottom: 0.4rem; border-left: 2px solid var(--color-gold);">
                  <div>
                    <span class="text-highlight text-bold">${req.from}</span>
                    <div style="font-size: 0.7rem; color: var(--color-text-muted);">möchte sich verbünden</div>
                  </div>
                  <div style="display: flex; gap: 0.4rem;">
                    <button class="glass-btn btn-small primary" onClick=${() => handleAccept(req.from)}>🤝 Annehmen</button>
                    <button class="glass-btn btn-small btn-danger" onClick=${() => handleDecline(req.from)}>✕</button>
                  </div>
                </div>
              `)}
            </div>
          `}

          <!-- DEINE FREUNDE -->
          <div style="margin-bottom: 1.5rem;">
            <h4 class="friend-section-title">⭐ Deine Freunde (${friendsList.length})</h4>
            
            ${friendsList.length === 0 ? html`
              <div class="friend-empty glass-inner-panel" style="padding: 1.5rem; text-align: center; color: var(--color-text-muted); font-style: italic;">
                Noch keine Chronisten in deiner Freundesliste.<br />
                <span style="font-size: 0.8rem; opacity: 0.7;">Füge oben einen Namen hinzu, um den Bund zu erweitern.</span>
              </div>
            ` : friendsList.map(friend => html`
              <div class="friend-item active glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; margin-bottom: 0.4rem; border-left: 2px solid var(--color-success);">
                <div>
                  <span class="text-gold text-bold">${friend.name}</span>
                  <div style="font-size: 0.7rem; color: var(--color-text-muted);">Hinzugefügt am ${new Date(friend.added).toLocaleDateString()}</div>
                </div>
                <button class="glass-btn btn-small btn-danger" onClick=${() => handleRemove(friend.name)}>👋 Entfernen</button>
              </div>
            `)}
          </div>

          <!-- GESENDETE ANFRAGEN -->
          ${sentRequests.length > 0 && html`
            <div style="margin-bottom: 1rem;">
              <h4 class="friend-section-title muted" style="color: var(--color-text-muted); border-bottom-color: rgba(255, 255, 255, 0.05);">📤 Gesendete Anfragen (${sentRequests.length})</h4>
              ${sentRequests.map(req => html`
                <div class="friend-item sent glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; margin-bottom: 0.4rem; border-left: 2px solid var(--color-text-muted); opacity: 0.75;">
                  <div>
                    <span class="text-muted">${req.to}</span>
                    <div style="font-size: 0.7rem; color: var(--color-text-muted);">Warte auf Antwort...</div>
                  </div>
                  <button class="glass-btn btn-small" onClick=${() => handleCancel(req.to)}>🚫 Zurückziehen</button>
                </div>
              `)}
            </div>
          `}

        </div>
      </div>
    </div>
  `;
}
