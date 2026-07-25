/**
 * ============================================================
 * FILE: ui/preact/dialog/DialogUI.js – NPC-Dialoge (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { getNPC, getDialog } from '../../../data/dialogs.js';
import { logger } from '../../../core/logger.js';

export function DialogUI({ stateManager, eventBus, services }) {
  const { storyBranchService, codexService, resourceService, i18nService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [npcId, setNpcId] = useState(null);
  const [dialogId, setDialogId] = useState(null);
  const [history, setHistory] = useState([]);

  const [lang, setLang] = useState(i18nService.getLanguage());
  useEventBus(eventBus, 'i18n:languageChanged', (newLang) => {
    setLang(newLang);
  });

  const getLocText = (obj, prop = 'text') => {
    if (!obj) return '';
    if (lang === 'en' && obj[prop + '_en']) {
      return obj[prop + '_en'];
    }
    return obj[prop] || '';
  };

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

  // Escape-Taste zum Schließen
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dialog && (dialog.isEnding || dialog.options.length === 0 || dialog.canSkip !== false)) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dialog]);

  const isCinematic = npc.isCinematic || dialog.isCinematic || ['theron', 'nyx', 'prestige_guide', 'shadow_figure'].includes(npcId);

  const handleOption = (option) => {
    if (option.action) {
      // Aktion ausführen
      switch (option.action) {
        case 'trade_particles':
          const state = stateManager.getState();
          if (BigInt(state.resources.particles || '0') >= BigInt(100)) {
            resourceService.removeParticles(100);
            resourceService.addRelics(10);
            eventBus.publish('ui:showToast', {
              message: lang === 'de' ? '⚗️ 100 Partikel gegen 10 Relikte getauscht!' : '⚗️ Traded 100 Particles for 10 Relics!',
              type: 'success',
              duration: 2000
            });
          } else {
            eventBus.publish('ui:showToast', {
              message: lang === 'de' ? '❌ Nicht genug Partikel für den Tausch.' : '❌ Not enough Particles for the trade.',
              type: 'warning',
              duration: 2000
            });
          }
          break;
        default:
          logger.warn('[Dialog] Unbekannte Aktion:', option.action);
      }
    }

    const nextDialogId = option.next;
    if (nextDialogId) {
      const nextDialog = getDialog(npcId, nextDialogId);
      if (nextDialog) {
        setHistory([...history, { from: dialogId, option: getLocText(option, 'text'), to: nextDialogId }]);
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

  if (isCinematic) {
    return html`
      <div class="cinematic-overlay cinematic-bars cinematic-active" onClick=${(e) => { if (e.target === e.currentTarget && dialog.canSkip !== false) setIsOpen(false); }}>
        <div class="cinematic-content" style="max-width: 800px; width: 90%; text-align: center; position: relative; z-index: 9005;">
          <div style="font-size: 5.5rem; margin-bottom: 1.5rem; filter: drop-shadow(0 0 25px var(--color-primary-glow));">
            ${npc.portrait || '👤'}
          </div>
          <h2 class="cinzel" style="color: var(--color-primary); font-size: 2.2rem; letter-spacing: 3px; text-shadow: 0 0 20px var(--color-primary-glow); margin-bottom: 2rem; text-transform: uppercase;">
            ${getLocText(npc, 'name')}
          </h2>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.35rem; color: #fff; line-height: 1.8; margin-bottom: 3.5rem; text-shadow: 0 2px 8px rgba(0,0,0,0.9); font-style: italic; background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 8px; border-left: 2px solid var(--color-primary); border-right: 2px solid var(--color-primary);">
            "${getLocText(dialog, 'text')}"
          </div>
          <div class="dialog-options" style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            ${dialog.isEnding || dialog.options.length === 0 ? html`
              <button class="glass-btn primary cinzel" style="padding: 1rem 4rem; font-size: 1.2rem; border-color: var(--color-primary); letter-spacing: 2px;" onClick=${() => setIsOpen(false)}>
                ${lang === 'de' ? 'Fortfahren' : 'Continue'}
              </button>
            ` : dialog.options.map(opt => html`
              <button class="glass-btn" style="width: 100%; max-width: 550px; padding: 1.2rem 2rem; font-size: 1.1rem; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); transition: all 0.3s ease; text-align: center; justify-content: center;" 
                      onMouseOver=${(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 15px var(--color-primary-glow)'; }}
                      onMouseOut=${(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                      onClick=${() => handleOption(opt)}>
                ${getLocText(opt, 'text')}
              </button>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget && dialog.canSkip !== false) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 600px; max-width: 95vw; max-height: 80vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
 
        <div class="dialog-npc-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(197,160,89,0.1);">
          <span class="dialog-npc-portrait" style="font-size: 2.8rem; filter: drop-shadow(0 0 10px var(--color-primary-glow));">${npc.portrait || '👤'}</span>
          <div class="dialog-npc-info" style="flex: 1;">
            <div class="dialog-npc-name" style="font-family: var(--font-header); font-size: 1.2rem; color: var(--color-primary);">${getLocText(npc, 'name')}</div>
            <div class="dialog-npc-title" style="color: var(--color-text-muted); font-size: 0.85rem;">${getLocText(npc, 'title')}</div>
          </div>
        </div>

        <div class="dialog-text-content" style="padding: 1rem 1.2rem; min-height: 80px; line-height: 1.8; background: rgba(0,0,0,0.25); border-left: 3px solid var(--color-primary); border-radius: 2px;">
          ${getLocText(dialog, 'text')}
        </div>

        <div class="dialog-options" style="margin-top: 1rem;">
          ${dialog.isEnding || dialog.options.length === 0 ? html`
            <button class="glass-btn primary dialog-close-btn" style="width: 100%; padding: 1rem; font-size: 1.1rem; margin-top: 0.5rem;" onClick=${() => setIsOpen(false)}>✕ ${lang === 'de' ? 'Schließen' : 'Close'}</button>
          ` : dialog.options.map(opt => html`
            <button class="glass-btn dialog-option-btn" style="width: 100%; padding: 0.8rem 1.2rem; margin-bottom: 0.5rem; justify-content: flex-start; text-align: left; background: rgba(0,0,0,0.2); border-left: 2px solid var(--color-text-muted); transition: all 0.3s ease;" 
                    onMouseOver=${(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onMouseOut=${(e) => { e.currentTarget.style.borderColor = 'var(--color-text-muted)'; }}
                    onClick=${() => handleOption(opt)}>
              ${getLocText(opt, 'text')}
            </button>
          `)}
        </div>
      </div>
    </div>
  `;
}