/**
 * ============================================================
 * FILE: ui/preact/codex/CodexUI.js – Codex (Lore & Wissen)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useMemo } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function CodexUI({ stateManager, eventBus, services }) {
  const { codexService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const entries = useStateSelector(stateManager, (state) => {
    const all = Object.values(state.codex.entries);
    return all.map(e => ({ ...e, unlocked: e.unlocked || false }));
  });

  const progress = useStateSelector(stateManager, (state) => {
    const all = Object.values(state.codex.entries);
    const unlocked = all.filter(e => e.unlocked).length;
    return Math.floor((unlocked / all.length) * 100);
  });

  useEventBus(eventBus, EVENTS.UI_OPEN_CODEX, () => setIsOpen(true));
  useEventBus(eventBus, 'codex:entryUnlocked', () => {});

  if (!isOpen) return null;

  const categories = ['all', 'bosses', 'locations', 'items', 'lore', 'endings'];
  const categoryLabels = {
    all: 'Alle',
    bosses: '👤 Bosse',
    locations: '🏛️ Orte',
    items: '📿 Items',
    lore: '📜 Lore',
    endings: '🏆 Enden'
  };

  // Gefilterte Einträge
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (currentCategory !== 'all') {
      result = result.filter(e => e.category === currentCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(e =>
        e.title.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        (e.lore && e.lore.toLowerCase().includes(term))
      );
    }
    // Sortierung: Entsperrte zuerst
    result.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return a.title.localeCompare(b.title);
    });
    return result;
  }, [entries, currentCategory, searchTerm]);

  const selectedEntry = selectedEntryId
    ? entries.find(e => e.id === selectedEntryId)
    : null;

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content-wide glass-panel" style="max-width: 1000px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">📚 Codex – Das Tagebuch des Archivs</h2>
        <p class="hub-subtitle text-center mb-1" style="text-align: center; color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Alle entdeckten Geheimnisse und Erinnerungen</p>

        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; flex: 1; min-height: 0; height: calc(100% - 130px); max-height: 60vh;">
          <!-- Linke Spalte: Kategorien + Liste -->
          <div class="glass-inner-panel" style="display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; padding: 1rem;">
            <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem;">
              ${categories.map(cat => html`
                <button class="glass-btn btn-small ${currentCategory === cat ? 'primary' : ''}" 
                        style="padding: 0.2rem 0.6rem; font-size: 0.65rem;"
                        onClick=${() => { setCurrentCategory(cat); setSelectedEntryId(null); }}>
                  ${categoryLabels[cat] || cat}
                </button>
              `)}
            </div>
            <input type="text" class="ui-select" placeholder="🔍 Suchen..." 
                   style="padding: 0.5rem; width: 100%; margin-bottom: 0.5rem;"
                   value=${searchTerm} onInput=${(e) => { setSearchTerm(e.target.value); setSelectedEntryId(null); }} />
            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 0.3rem;">
              ${filteredEntries.length === 0 ? html`
                <div class="text-muted text-center text-italic" style="padding: 2rem;">Keine Einträge gefunden.</div>
              ` : filteredEntries.map(entry => html`
                <div class="glass-inner-panel codex-entry ${entry.unlocked ? 'unlocked' : 'locked'}"
                     style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; margin-bottom: 0.4rem; cursor: ${entry.unlocked ? 'pointer' : 'default'}; opacity: ${entry.unlocked ? 1 : 0.5}; border-left: 3px solid ${entry.unlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'}; transition: all 0.2s ease;"
                     onClick=${() => { if (entry.unlocked) { setSelectedEntryId(entry.id); } }}>
                  <div>
                    <div style="font-family: var(--font-header); font-size: 0.9rem; color: ${entry.unlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'};">
                      ${entry.unlocked ? (entry.icon || '📄') : '🔒'} ${entry.title}
                    </div>
                    <div class="text-sm text-muted" style="font-size: 0.7rem;">
                      ${entry.unlocked ? entry.description : '??? – Noch nicht freigeschaltet'}
                    </div>
                  </div>
                  <div>
                    ${entry.unlocked ? html`<span class="text-success text-sm">✅</span>` : html`<span class="text-muted text-sm">🔒</span>`}
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- Rechte Spalte: Detailansicht -->
          <div class="glass-inner-panel" style="display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; padding: 1rem;">
            <div class="text-muted text-sm" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.3rem; flex-shrink: 0;">Details</div>
            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 0.3rem; margin-top: 0.5rem;">
              ${!selectedEntry ? html`
                <div class="text-muted text-center text-italic" style="padding: 2rem;">Wähle einen Eintrag aus, um mehr zu erfahren.</div>
              ` : !selectedEntry.unlocked ? html`
                <div class="text-muted text-center text-italic" style="padding: 2rem;">Dieser Eintrag ist noch nicht freigeschaltet.</div>
              ` : html`
                <div class="glass-inner-panel" style="padding: 1.2rem;">
                  <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 2rem;">${selectedEntry.icon || '📄'}</span>
                    <div>
                      <div class="text-gold text-bold text-lg cinzel" style="font-size: 1.2rem;">${selectedEntry.title}</div>
                      <div class="text-muted text-sm">${categoryLabels[selectedEntry.category] || selectedEntry.category}</div>
                    </div>
                  </div>
                  <div class="text-muted mb-1">${selectedEntry.description}</div>
                  ${selectedEntry.lore ? html`<div class="text-sm mt-1" style="border-top: 1px solid rgba(197,160,89,0.1); padding-top: 0.5rem;">${selectedEntry.lore}</div>` : ''}
                  ${selectedEntry.stats ? html`
                    <div class="mt-1 text-sm" style="border-top: 1px solid rgba(197,160,89,0.1); padding-top: 0.5rem;">
                      <span class="text-muted">Stats:</span>
                      <span class="text-highlight">HP: ${selectedEntry.stats.hp || '?'}</span>
                      <span class="text-danger">⚔️ ${selectedEntry.stats.attack || '?'}</span>
                      <span class="text-blue">🛡️ ${selectedEntry.stats.defense || '?'}</span>
                    </div>
                  ` : ''}
                  <div class="text-muted text-sm mt-1" style="border-top: 1px solid rgba(197,160,89,0.1); padding-top: 0.5rem;">
                    Freigeschaltet: ${selectedEntry.unlockedAt ? new Date(selectedEntry.unlockedAt).toLocaleDateString() : 'Unbekannt'}
                  </div>
                </div>
              `}
            </div>
          </div>
        </div>

        <div class="text-center text-muted text-sm mt-1" style="flex-shrink: 0; padding-top: 0.5rem;">
          Fortschritt: ${progress}% freigeschaltet
        </div>
      </div>
    </div>
  `;
}