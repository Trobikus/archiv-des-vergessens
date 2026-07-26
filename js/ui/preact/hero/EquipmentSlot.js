import { h, html } from '../setup.js';

export function EquipmentSlot({ slotKey, item, onHover, onLeave, onClick, getItemIcon, coords, defaultIcon, color }) {
  return html`
    <div 
      class="equip-node ${item ? '' : 'empty'}" 
      style="border-color: ${color}; color: ${color}; top: ${coords.top}; left: ${coords.left};"
      onMouseEnter=${(e) => onHover(e, item)}
      onMouseMove=${(e) => onHover(e, item)}
      onMouseLeave=${onLeave}
      onClick=${() => onClick(slotKey, item)}
    >
      ${item && getItemIcon(item) ? html`<img src="${getItemIcon(item)}" class="equip-icon-img" alt="${item.name}" />` : defaultIcon}
    </div>
  `;
}
