/**
 * ============================================================
 * FILE: ui/preact/dialog/DialogUI.js – NPC-Dialoge (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { getNPC, getDialog } from '../../../data/dialogs.js';

export function DialogUI({ stateManager, eventBus, services }) {
  const { storyBranchService, codexService, resourceService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [npcId, setNpcId] = useState(null);
  const [dialogId, setDialogId] = useState(null);
  const [history, setHistory] = useState([]);

  const flags = useStateSelector(stateManager, (state) => state.storyBranch.flags);

  useEventBus(eventBus, EVENTS.UI_OPEN_DIALOG, (data) => {
    if (data && data.npcId) {
      setNpcId(data.npcId);
      setDialogId(null);
      setHistory([]);
      const npc = getNPC(data.npcId);
      if (npc) {
        setDialogId(npc.defaultDialog || npc.dialogs[0]?.id || null);
      }
      setIsOpen(true);
    }
  });

  if (!isOpen || !npcId) return null;

  const npc = getNPC(npcId);
  if (!npc) return null;

  // Aktuellen Dialog finden
  let dialog = dialogId ? getDialog(npcId, dialogId) : null;
  if (!dialog && npc.dialogs.length > 0) {
    dialog = npc.dialogs[0];
    setDialogId(dialog.id);
  }
  if (!dialog) return null;

  const handleOption = (option) => {
    if (option.action) {
      // Aktion ausführen
      switch (option.action) {
        case 'trade_particles':
          const state = stateManager.getState();
          if (Number(state.resources.particles) >= 100) {
            resourceService.removeParticles(100);
            resourceService.addRelics(10);
            eventBus.publish('ui:showToast', {
              message: '⚗️ 100 Partikel gegen 10 Relikte getauscht!',
              type: 'success',
              duration: 2000
            });
          } else {
            eventBus.publish('ui:showToast', {
              message: '❌ Nicht genug Partikel für den Tausch.',
              type: 'warning',
              duration: 2000
            });
          }
          break;
        default:
          console.log('[Dialog] Unbekannte Aktion:', option.action);
      }
    }

    const nextDialogId = option.next;
    if (nextDialogId) {
      const nextDialog = getDialog(npcId, nextDialogId);
      if (nextDialog) {
        setHistory([...history, { from: dialogId, option: option.text, to: nextDialogId }]);
        setDialogId(nextDialogId);
        // Codex-Einträge freischalten
        if (codexService && codexService.unlockFromNPC) {
          codexService.unlockFromNPC(npcId);
        }
        return;
      }
    }

    // Kein nächster Dialog – schließen
    setIsOpen(false);
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 600px; max-width: 95vw; max-height: 80vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>

        <div class="dialog-npc-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(197,160,89,0.1);">
          <span class="dialog-npc-portrait" style="font-size: 2.8rem; filter: drop-shadow(0 0 10px var(--color-gold-glow));">${npc.portrait || '👤'}</span>
          <div class="dialog-npc-info" style="flex: 1;">
            <div class="dialog-npc-name" style="font-family: var(--font-header); font-size: 1.2rem; color: var(--color-gold);">${npc.name}</div>
            <div class="dialog-npc-title" style="color: var(--color-text-muted); font-size: 0.85rem;">${npc.title || ''}</div>
          </div>
        </div>

        <div class="dialog-text-content" style="padding: 1rem 1.2rem; min-height: 80px; line-height: 1.8; background: rgba(0,0,0,0.25); border-left: 3px solid var(--color-gold); border-radius: 2px;">
          ${dialog.text}
        </div>

        <div class="dialog-options" style="margin-top: 1rem;">
          ${dialog.isEnding || dialog.options.length === 0 ? html`
            <button class="glass-btn primary dialog-close-btn" style="width: 100%; padding: 1rem; font-size: 1.1rem; margin-top: 0.5rem;" onClick=${() => setIsOpen(false)}>✕ Schließen</button>
          ` : dialog.options.map(opt => html`
            <button class="glass-btn dialog-option-btn" style="width: 100%; padding: 0.8rem 1.2rem; margin-bottom: 0.5rem; justify-content: flex-start; text-align: left; background: rgba(0,0,0,0.2); border-left: 2px solid var(--color-text-muted); transition: all 0.3s ease;" onClick=${() => handleOption(opt)}>
              ${opt.text}
            </button>
          `)}
        </div>
      </div>
    </div>
  `;
}