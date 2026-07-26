import { h, html } from '../../setup.js';
import { InventorySelectToolbar } from '../InventorySelectToolbar.js';

export function LootTab({
  hero,
  lang,
  isSelectMode,
  selectedIndices,
  onToggleSelectMode,
  onToggleSelectItem,
  onSelectAll,
  onBulkDestroySelected,
  bulkRarity,
  setBulkRarity,
  matchingLootCount,
  handleBulkSell,
  handleSellLoot,
  handleSalvageItem,
  setPreviewItem,
  setTooltipPos,
  translateItemName,
  getRarityLabel,
  rarityColors
}) {
  const items = hero?.inventory?.loot || [];
  
  if (items.length === 0) {
    return html`<div class="text-disabled text-italic pt-1 text-center">${lang === 'de' ? 'Kein Loot im Besitz.' : 'No loot owned.'}</div>`;
  }

  return html`
    <div class="bulk-actions-container" style="margin-bottom: 8px;">
      <span class="text-muted text-xs cinzel" style="margin-right: auto; letter-spacing: 0.5px;">${lang === 'de' ? 'Massenverkauf:' : 'Bulk Sell:'}</span>
      <select 
        class="ui-select" 
        value=${bulkRarity} 
        onChange=${(e) => setBulkRarity(e.target.value)}
        style="background: rgba(0, 0, 0, 0.4); border-color: rgba(197, 160, 89, 0.15); color: var(--color-gold-hover);"
      >
        <option value="common">${lang === 'de' ? 'Nur Gewöhnlich' : 'Common only'}</option>
        <option value="uncommon">${lang === 'de' ? 'Ungewöhnlich & schlechter' : 'Uncommon & lower'}</option>
        <option value="rare">${lang === 'de' ? 'Selten & schlechter' : 'Rare & lower'}</option>
        <option value="epic">${lang === 'de' ? 'Episch & schlechter' : 'Epic & lower'}</option>
        <option value="all">${lang === 'de' ? 'Alle Gegenstände' : 'All items'}</option>
      </select>
      <button 
        class="glass-btn btn-danger btn-small" 
        disabled=${matchingLootCount === 0}
        onClick=${handleBulkSell}
      >
        ${lang === 'de' ? 'Verkaufen' : 'Sell'} (${matchingLootCount})
      </button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <${InventorySelectToolbar}
        items=${items}
        isSelectMode=${isSelectMode}
        selectedIndices=${selectedIndices}
        onToggleSelectMode=${onToggleSelectMode}
        onSelectAll=${onSelectAll}
        onBulkDestroy=${onBulkDestroySelected}
        lang=${lang}
        isLoot=${true}
      />

      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${items.map((item, idx) => {
          const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0);
          const isSelected = selectedIndices.includes(idx);
          return html`
            <div 
              class="inventory-item-card" 
              style="border-left: 3px solid ${rarityColors[item.rarity] || '#aaa'}; display: flex; align-items: center; justify-content: space-between; ${isSelected ? 'border-color: var(--color-gold); background: rgba(212, 175, 55, 0.12);' : ''} cursor: ${isSelectMode ? 'pointer' : 'default'};"
              onClick=${isSelectMode ? () => onToggleSelectItem(idx) : null}
              onMouseEnter=${(e) => {
                if (!isSelectMode) {
                  setPreviewItem(item);
                  setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
                }
              }}
              onMouseMove=${(e) => { if (!isSelectMode) setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 }); }}
              onMouseLeave=${() => setPreviewItem(null)}
            >
              <div style="display: flex; align-items: center; gap: 10px;">
                ${isSelectMode ? html`
                  <input 
                    type="checkbox" 
                    checked=${isSelected} 
                    onChange=${(e) => { e.stopPropagation(); onToggleSelectItem(idx); }}
                    style="transform: scale(1.2); cursor: pointer; accent-color: var(--color-gold);"
                  />
                ` : null}
                <div class="item-name" style="color: ${rarityColors[item.rarity] || '#aaa'};">
                  ${translateItemName(item.name)} <span class="text-muted text-sm">(${getRarityLabel(item.rarity)})</span>
                </div>
              </div>

              ${!isSelectMode ? html`
                <div class="item-actions">
                  <span class="text-muted text-sm" style="margin-right: 8px;">+${value} ${lang === 'de' ? 'Partikel' : 'Particles'}</span>
                  <button class="glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);" onClick=${(e) => { e.stopPropagation(); handleSellLoot(item, idx); }}>${lang === 'de' ? 'Verkaufen' : 'Sell'}</button>
                  <button class="glass-btn btn-danger btn-small" onClick=${(e) => { e.stopPropagation(); handleSalvageItem(item, idx, true); }}>${lang === 'de' ? 'Zerlegen' : 'Salvage'}</button>
                </div>
              ` : html`
                <div style="font-size: 0.75rem; color: var(--color-gold); font-weight: bold;">
                  ${isSelected ? '✓ ' + (lang === 'de' ? 'Ausgewählt' : 'Selected') : ''}
                </div>
              `}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
