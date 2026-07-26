import { h, html } from '../../setup.js';
import { InventorySelectToolbar } from '../InventorySelectToolbar.js';

export function EquipmentTab({
  hero,
  lang,
  isSelectMode,
  selectedIndices,
  onToggleSelectMode,
  onToggleSelectItem,
  onSelectAll,
  onBulkDestroySelected,
  resources,
  setPreviewItem,
  setTooltipPos,
  getItemIcon,
  translateItemName,
  getRarityLabel,
  handleEquipItem,
  handleSalvageItem,
  setSocketingItem,
  rarityColors
}) {
  const items = hero?.inventory?.equipment || [];
  
  if (items.length === 0) {
    return html`<div class="text-disabled text-italic pt-1 text-center">${lang === 'de' ? 'Keine Ausrüstungsteile im Inventar.' : 'No equipment items in inventory.'}</div>`;
  }

  return html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <${InventorySelectToolbar}
        items=${items}
        isSelectMode=${isSelectMode}
        selectedIndices=${selectedIndices}
        onToggleSelectMode=${onToggleSelectMode}
        onSelectAll=${onSelectAll}
        onBulkDestroy=${onBulkDestroySelected}
        lang=${lang}
        isLoot=${false}
      />

      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${items.map((item, idx) => {
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
                ${getItemIcon(item) ? html`<img src="${getItemIcon(item)}" style="width: 32px; height: 32px; object-fit: contain; border-radius: 2px; border: 1px solid rgba(255,255,255,0.1);" alt="${translateItemName(item.name)}" />` : ''}
                <div class="item-name" style="color: ${rarityColors[item.rarity] || '#aaa'};">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span>${translateItemName(item.name)}</span>
                    <span class="text-muted text-sm">Lv.${item.level}</span>
                  </div>
                  <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-bottom: 2px;">
                    ${getRarityLabel(item.rarity)}
                  </div>
                  ${item.sockets && item.sockets.length > 0 ? html`
                    <div style="display: flex; gap: 4px; margin-top: 2px;">
                      ${item.sockets.map(sock => html`
                        <span style="font-size: 0.62rem; padding: 1px 4px; border-radius: 3px; background: ${sock ? sock.color + '15' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${sock ? sock.color : 'rgba(255,255,255,0.15)'}; color: ${sock ? sock.color : '#888'}; display: inline-flex; align-items: center; gap: 2px;">
                          ${sock ? '💎 ' + (lang === 'de' ? sock.title : sock.title_en || sock.title) : (lang === 'de' ? '⚪ Sockel leer' : '⚪ Socket empty')}
                        </span>
                      `)}
                    </div>
                  ` : ''}
                </div>
              </div>

              ${!isSelectMode ? html`
                <div class="item-actions" style="display: flex; gap: 4px; align-items: center;">
                  <button class="glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue); padding: 0.2rem 0.5rem;" onClick=${(e) => { e.stopPropagation(); handleEquipItem(item, idx); }}>${lang === 'de' ? 'Anlegen' : 'Equip'}</button>
                  ${item.sockets && item.sockets.some(s => s === null) && BigInt(resources.catalyst || '0') >= BigInt(1) ? html`
                    <button class="glass-btn btn-small" style="border-color: var(--color-gold); color: var(--color-gold); padding: 0.2rem 0.5rem;" onClick=${(e) => { e.stopPropagation(); setSocketingItem({ item, idx, isEquipped: false }); }}>💎 ${lang === 'de' ? 'Sockeln' : 'Socket'}</button>
                  ` : ''}
                  <button class="glass-btn btn-danger btn-small" style="padding: 0.2rem 0.5rem;" onClick=${(e) => { e.stopPropagation(); handleSalvageItem(item, idx, false); }}>${lang === 'de' ? 'Zerlegen' : 'Salvage'}</button>
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
