import { h, html } from '../setup.js';

export function ItemTooltip({ item, tooltipPos, lang, rarityColors, translateItemName, translateItemDescription }) {
  if (!item) return null;
  return html`
    <div class="custom-tooltip glass-panel" style="display: block; top: ${tooltipPos.y}px; left: ${tooltipPos.x}px; min-width: 220px; pointer-events: none; z-index: 10000;">
      <div class="tooltip-title" style="color: ${rarityColors[item.rarity] || '#aaa'}; font-weight: bold; font-size: 0.95rem; font-family: var(--font-header);">
        ${translateItemName(item.name)} <span class="text-muted text-sm" style="font-size: 0.75rem;">Lv.${item.level}</span>
      </div>
      <div class="tooltip-desc" style="font-size: 0.75rem; color: #aaa; margin: 0.3rem 0;">${translateItemDescription(item.description || 'Ein Ausrüstungsgegenstand.')}</div>
      <div class="tooltip-stats" style="margin-top: 0.4rem; font-size: 0.8rem;">
        ${Object.entries(item.stats || {}).map(([stat, val]) => html`
          <div class="tooltip-stat" style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 2px;">
            <span class="text-muted">${stat === 'attack' ? (lang === 'de' ? '⚔️ Stärke' : '⚔️ Attack') : stat === 'defense' ? (lang === 'de' ? '🛡️ Zähigkeit' : '🛡️ Toughness') : stat === 'agility' ? (lang === 'de' ? '⚡ Geschick' : '⚡ Agility') : (lang === 'de' ? '❤️ Vitalität' : '❤️ Vitality')}:</span>
            <span class="text-highlight text-bold" style="color: var(--color-gold);">+${val}</span>
          </div>
        `)}
      </div>
      ${item.sockets && item.sockets.length > 0 ? html`
        <div class="tooltip-sockets" style="margin-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem; text-align: left;">
          <div class="text-xs text-muted mb-1" style="font-size: 0.68rem; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.4);">${lang === 'de' ? 'Katalysatorsockel:' : 'Catalyst Sockets:'}</div>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            ${item.sockets.map((sock, sIdx) => html`
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: ${sock ? sock.color : '#888'};">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${sock ? sock.color : 'transparent'}; border: 1px solid ${sock ? sock.color : '#666'}; box-shadow: ${sock ? '0 0 4px ' + sock.color : 'none'};"></span>
                <span>
                  ${lang === 'de' ? `Sockel ${sIdx + 1}:` : `Socket ${sIdx + 1}:`} ${sock ? `${lang === 'de' ? sock.title : sock.title_en || sock.title} (+5 ${sock.id === 'attack' ? (lang === 'de' ? 'Angriff' : 'Attack') : sock.id === 'defense' ? (lang === 'de' ? 'Zähigkeit' : 'Defense') : sock.id === 'agility' ? (lang === 'de' ? 'Geschick' : 'Agility') : (lang === 'de' ? 'Vitalität' : 'Vitality')})` : (lang === 'de' ? 'Leerer Sockel' : 'Empty Socket')}
                </span>
              </div>
            `)}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
