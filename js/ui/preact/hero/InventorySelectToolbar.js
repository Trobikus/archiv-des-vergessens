import { h, html } from '../setup.js';

export function InventorySelectToolbar({ 
  items, 
  isSelectMode, 
  selectedIndices, 
  onToggleSelectMode, 
  onSelectAll, 
  onBulkDestroy, 
  lang,
  isLoot = false
}) {
  return html`
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.8rem; background: rgba(0,0,0,0.35); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
      ${!isSelectMode ? html`
        <span class="text-muted text-sm">${items.length} ${isLoot ? (lang === 'de' ? 'Loot-Gegenstände im Besitz' : 'Loot items in inventory') : (lang === 'de' ? 'Gegenstände im Inventar' : 'Items in Inventory')}</span>
        <button 
          class="glass-btn btn-small cinzel" 
          style="border-color: var(--color-gold); color: var(--color-gold); font-size: 0.75rem; padding: 0.3rem 0.8rem;"
          onClick=${onToggleSelectMode}
        >
          ☑️ ${lang === 'de' ? 'Mehrfachauswahl' : 'Select Items'}
        </button>
      ` : html`
        <div style="display: flex; align-items: center; gap: 8px; width: 100%; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button 
              class="glass-btn btn-small" 
              style="font-size: 0.75rem; padding: 0.25rem 0.6rem;"
              onClick=${() => onSelectAll(items.length)}
            >
              ${selectedIndices.length === items.length ? (lang === 'de' ? 'Keine' : 'Deselect All') : (lang === 'de' ? 'Alle wählen' : 'Select All')}
            </button>
            <span class="text-gold text-bold text-sm">
              ${selectedIndices.length} / ${items.length} ${lang === 'de' ? 'ausgewählt' : 'selected'}
            </span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button 
              class="${isLoot ? 'glass-btn btn-small' : 'glass-btn btn-danger btn-small'}" 
              style="font-size: 0.75rem; padding: 0.25rem 0.8rem; font-weight: bold; ${isLoot ? 'border-color: var(--color-blue); color: var(--color-blue);' : ''}"
              disabled=${selectedIndices.length === 0}
              onClick=${() => onBulkDestroy(isLoot)}
            >
              ${isLoot ? `💰 ${lang === 'de' ? 'Ausgewählte verkaufen' : 'Sell Selected'} (${selectedIndices.length})` : `🔥 ${lang === 'de' ? 'Ausgewählte zerlegen' : 'Salvage Selected'} (${selectedIndices.length})`}
            </button>
            <button 
              class="glass-btn btn-small" 
              style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #aaa;"
              onClick=${onToggleSelectMode}
            >
              ✕
            </button>
          </div>
        </div>
      `}
    </div>
  `;
}
