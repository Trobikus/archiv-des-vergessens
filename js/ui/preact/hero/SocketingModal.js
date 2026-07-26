import { h, html } from '../setup.js';

export function SocketingModal({ socketingItem, catalystCount, onClose, onConfirmSocket, translateItemName, getRarityLabel, lang }) {
  const rarityColors = {
    common: '#aaa',
    uncommon: '#5a9a5a',
    rare: '#4a7aaa',
    epic: '#9a4aaa',
    legendary: '#d4af37'
  };

  const catalysts = [
    { id: 'attack', title: lang === 'de' ? 'Rubin der Glut' : 'Ruby of Embers', bonus: lang === 'de' ? '+5 Angriff' : '+5 Attack', desc: lang === 'de' ? 'Fügt dem Gegenstand Angriffskraft hinzu' : 'Adds attack power to the item', color: '#ff4d4d', icon: '⚔️' },
    { id: 'defense', title: lang === 'de' ? 'Saphir des Schutzes' : 'Sapphire of Protection', bonus: lang === 'de' ? '+5 Zähigkeit' : '+5 Toughness', desc: lang === 'de' ? 'Fügt dem Gegenstand Zähigkeit hinzu' : 'Adds toughness to the item', color: '#4d79ff', icon: '🛡️' },
    { id: 'agility', title: lang === 'de' ? 'Smaragd der Schnelligkeit' : 'Emerald of Swiftness', bonus: lang === 'de' ? '+5 Geschick' : '+5 Agility', desc: lang === 'de' ? 'Fügt dem Gegenstand Geschicklichkeit hinzu' : 'Adds agility to the item', color: '#33cc33', icon: '⚡' },
    { id: 'stamina', title: lang === 'de' ? 'Bernstein des Lebens' : 'Amber of Vitality', bonus: lang === 'de' ? '+5 Vitalität' : '+5 Vitality', desc: lang === 'de' ? 'Fügt dem Gegenstand Vitalität hinzu' : 'Adds vitality to the item', color: '#ffaa00', icon: '❤️' }
  ];

  const emptySocketIdx = socketingItem.item.sockets?.findIndex(s => s === null);
  const hasCatalyst = BigInt(catalystCount || '0') >= BigInt(1);
  const canSocket = emptySocketIdx !== -1 && hasCatalyst;

  return html`
    <div class="modal-overlay" style="display: flex; z-index: 11000;" onClick=${onClose}>
      <div class="modal-content glass-panel" style="max-width: 440px; text-align: center; padding: 1.5rem; border: 1px solid rgba(197,160,89,0.25);" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${onClose}>×</button>
        <h3 class="modal-title glow-text cinzel" style="font-size: 1.3rem; margin-bottom: 0.3rem;">💎 ${lang === 'de' ? 'Katalysatorsockel' : 'Catalyst Sockets'}</h3>
        <p class="text-muted text-sm mb-1" style="font-size: 0.8rem; line-height: 1.3; color: #bbb;">${lang === 'de' ? 'Wähle eine Katalysator-Rune, um sie in den nächsten freien Sockel dieses Gegenstandes einzusetzen.' : 'Choose a catalyst rune to insert into the next free socket of this item.'}</p>

        <div class="glass-inner-panel mb-1" style="padding: 0.8rem; border-color: ${rarityColors[socketingItem.item.rarity] || 'var(--color-gold)'}; background: rgba(0,0,0,0.3); margin: 0.8rem 0;">
          <div class="text-bold cinzel" style="color: ${rarityColors[socketingItem.item.rarity] || 'var(--color-gold)'}; font-size: 1.1rem; text-shadow: 0 0 5px rgba(255,255,255,0.05);">
            ${translateItemName(socketingItem.item.name)}
          </div>
          <div class="text-muted text-xs" style="font-size: 0.72rem; margin-top: 2px;">Lv.${socketingItem.item.level} (${getRarityLabel(socketingItem.item.rarity)})</div>
          
          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px;">
            ${socketingItem.item.sockets?.map((sock, sIdx) => html`
              <div style="padding: 0.3rem 0.6rem; border-radius: 4px; background: ${sock ? sock.color + '15' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${sock ? sock.color : 'rgba(255,255,255,0.15)'}; color: ${sock ? sock.color : '#888'}; font-size: 0.72rem; display: flex; align-items: center; gap: 4px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${sock ? sock.color : 'transparent'}; border: 1px solid ${sock ? sock.color : '#666'};"></span>
                ${lang === 'de' ? `Sockel ${sIdx + 1}:` : `Socket ${sIdx + 1}:`} ${sock ? (lang === 'de' ? sock.title : sock.title_en || sock.title) : (lang === 'de' ? 'Leerer Sockel' : 'Empty Socket')}
              </div>
            `)}
          </div>
        </div>

        <div class="text-gold text-sm mb-1 text-bold" style="font-family: var(--font-header); font-size: 0.85rem;">
          ${lang === 'de' ? 'Verfügbare Katalysatoren:' : 'Available Catalysts:'} <span class="text-highlight" style="font-size: 1rem; color: var(--color-gold);">${catalystCount || 0}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
          ${catalysts.map(cat => html`
            <button class="glass-btn" 
                    style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.8rem; border-color: rgba(255,255,255,0.08); cursor: ${canSocket ? 'pointer' : 'not-allowed'}; opacity: ${canSocket ? 1 : 0.55}; text-align: left; background: rgba(255,255,255,0.01);"
                    disabled=${!canSocket}
                    onClick=${() => {
                      if (canSocket) {
                        onConfirmSocket(cat.id, emptySocketIdx);
                      }
                    }}>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem; color: ${cat.color};">${cat.icon}</span>
                <div>
                  <div style="color: ${cat.color}; font-weight: bold; font-size: 0.8rem; font-family: var(--font-header);">${cat.title}</div>
                  <div class="text-muted" style="font-size: 0.68rem; line-height: 1.1; color: #999;">${cat.desc}</div>
                </div>
              </div>
              <div class="text-success text-bold" style="font-size: 0.8rem; font-family: var(--font-header); color: #2ecc71;">${cat.bonus}</div>
            </button>
          `)}
        </div>
      </div>
    </div>
  `;
}
