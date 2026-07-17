/**
 * ============================================================
 * FILE: ui/preact/library/LibraryUI.js – Bibliothek (Forschungen)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function LibraryUI({ stateManager, eventBus, services }) {
  const { libraryService, resourceService } = services;
  const [isOpen, setIsOpen] = useState(false);

  const upgrades = useStateSelector(stateManager, (state) => {
    const upg = state.library.upgrades;
    return [
      { id: 'gather_boost', name: 'Mneme-Fokus', desc: '+10% Klick-Ertrag pro Stufe', level: upg.gather_boost || 0, maxLevel: 999, baseCost: { particles: 1000 }, costMult: 1.5 },
      { id: 'clan_boost', name: 'Synergie des Bundes', desc: '+5% Clan-Produktion pro Stufe', level: upg.clan_boost || 0, maxLevel: 999, baseCost: { particles: 5000, relics: 50 }, costMult: 1.6 },
      { id: 'forge_discount', name: 'Geheimnisse der Schmiede', desc: '-1% Schmiedekosten pro Stufe (Max -50%)', level: upg.forge_discount || 0, maxLevel: 50, baseCost: { particles: 10000, artifacts: 10 }, costMult: 1.8 }
    ];
  });

  const resources = useStateSelector(stateManager, (state) => state.resources);

  useEventBus(eventBus, EVENTS.UI_OPEN_LIBRARY, () => setIsOpen(true));
  useEventBus(eventBus, 'resources:updated', () => {});

  if (!isOpen) return null;

  const handleBuy = (id) => {
    const result = libraryService.buyUpgrade(id);
    if (result) {
      eventBus.publish('ui:showToast', {
        message: `📚 Forschung verbessert!`,
        type: 'success',
        duration: 2000
      });
    } else {
      eventBus.publish('ui:showToast', {
        message: `❌ Nicht genug Ressourcen.`,
        type: 'warning',
        duration: 2000
      });
    }
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 700px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text text-highlight cinzel text-center">Die Archiv-Bibliothek</h2>
        <div class="text-muted text-sm mb-1 glass-inner-panel text-center" style="padding: 0.8rem; margin-bottom: 1rem;">
          Erweitere dein Wissen für permanente Boni.<br />
          Forschungen können unbegrenzt aufgewertet werden.
        </div>

        <div class="modal-scroll-area" style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
          ${upgrades.map(upg => {
            const cost = libraryService.getUpgradeCost(upg.id);
            const canAfford = Object.entries(cost).every(([key, amt]) => (Number(resources[key] || 0) >= amt));
            const isMaxed = upg.level >= upg.maxLevel;

            return html`
              <div class="library-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; border-left: 3px solid ${isMaxed ? 'var(--color-success)' : canAfford ? 'var(--color-dust)' : 'var(--color-text-muted)'}; opacity: ${isMaxed ? 1 : canAfford ? 1 : 0.6}; transition: all 0.3s ease;">
                <div class="library-info" style="flex: 1; min-width: 0;">
                  <div class="library-name" style="font-family: var(--font-header); font-size: 1.05rem; color: ${isMaxed ? 'var(--color-success)' : 'var(--color-highlight)'};">${upg.name} (Stufe ${upg.level})</div>
                  <div class="library-desc" style="color: var(--color-text-muted); font-size: 0.85rem;">${upg.desc}</div>
                  <div class="library-cost" style="color: var(--color-text-muted); font-size: 0.8rem; margin-top: 0.1rem;">
                    ${isMaxed ? html`<span class="text-success">✦ Maximalstufe erreicht ✦</span>` :
                      html`Kosten: <span class="${canAfford ? 'text-dust' : 'text-danger'}">${Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' | ')}</span>`}
                  </div>
                </div>
                <div class="library-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 100px; text-align: center;">
                  ${!isMaxed ? html`
                    <button class="glass-btn primary btn-small research-btn" onClick=${() => handleBuy(upg.id)} disabled=${!canAfford}>
                      📚 Forschen
                    </button>
                  ` : html`<span class="library-maxed" style="color: var(--color-success); font-weight: bold;">✦ Max</span>`}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}