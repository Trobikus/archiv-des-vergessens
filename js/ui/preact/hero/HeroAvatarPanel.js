import { h, html } from '../setup.js';
import { EquipmentSlot } from './EquipmentSlot.js';

export function HeroAvatarPanel({ 
  hero, 
  attributes, 
  combatStats, 
  levelProgress,
  lang,
  onEquipmentSlotHover,
  onEquipmentSlotLeave,
  onEquipmentSlotClick,
  onSpendStatPoint,
  onSetTitle,
  getItemIcon
}) {

  // Helfer: Seltenheitsfarben
  const rarityColors = {
    common: '#aaa',
    uncommon: '#5a9a5a',
    rare: '#4a7aaa',
    epic: '#9a4aaa',
    legendary: '#d4af37'
  };

  // Slot-Konfiguration
  const slotKeys = ['weapon', 'shield', 'helmet', 'shoulders', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring', 'ring2'];
  const slotIcons = {
    weapon: '🗡️',
    shield: '🛡️',
    helmet: '⛑️',
    shoulders: '🪄',
    armor: '🛡️',
    gloves: '🧤',
    belt: '🔗',
    boots: '👢',
    amulet: '📿',
    ring: '💍',
    ring2: '💍'
  };

  const slotCoords = {
    helmet: { top: '6%', left: '50%' },
    amulet: { top: '18%', left: '50%' },
    shoulders: { top: '28%', left: '18%' },
    gloves: { top: '28%', left: '82%' },
    armor: { top: '46%', left: '50%' },
    shield: { top: '48%', left: '18%' },
    weapon: { top: '48%', left: '82%' },
    belt: { top: '70%', left: '50%' },
    ring: { top: '80%', left: '22%' },
    ring2: { top: '80%', left: '78%' },
    boots: { top: '88%', left: '50%' }
  };

  const renderAttributes = () => {
    if (!attributes) return null;
    const attrConfig = [
      { key: 'attack', label: lang === 'de' ? '⚔️ Stärke' : '⚔️ Attack' },
      { key: 'defense', label: lang === 'de' ? '🛡️ Zähigkeit' : '🛡️ Toughness' },
      { key: 'agility', label: lang === 'de' ? '⚡ Geschick' : '⚡ Agility' },
      { key: 'stamina', label: lang === 'de' ? '❤️ Vitalität' : '❤️ Vitality' }
    ];
    const canSpend = hero?.unspentStatPoints > 0;
    return attrConfig.map(({ key, label }) => {
      const val = attributes[key] || 0;
      return html`
        <div class="stat-row glass-inner-panel flex-between mb-1" style="padding: 0.5rem 0.8rem; margin-bottom: 0.5rem;">
          <span>
            <span class="text-muted">${label}:</span>
            <span class="text-highlight text-bold" style="font-size: 1.05rem;">${val}</span>
          </span>
          ${canSpend ? html`<button class="btn-stat-add" onClick=${() => onSpendStatPoint(key)}>+</button>` : ''}
        </div>
      `;
    });
  };

  const renderCombatStats = () => {
    if (!combatStats) return null;
    const stats = [
      { key: 'maxHp', label: lang === 'de' ? '❤️ Max Leben' : '❤️ Max HP', format: (v) => Math.floor(v) },
      { key: 'damageReduction', label: lang === 'de' ? '🛡️ Schadensreduktion' : '🛡️ Damage Reduction', format: (v) => (v * 100).toFixed(1) + '%' },
      { key: 'critChance', label: lang === 'de' ? '⚡ Krit-Chance' : '⚡ Crit Chance', format: (v) => v.toFixed(1) + '%' },
      { key: 'critDamage', label: lang === 'de' ? '💥 Krit-Schaden' : '💥 Crit Damage', format: (v) => v.toFixed(1) + '%' },
      { key: 'dodgeChance', label: lang === 'de' ? '🌀 Ausweichen' : '🌀 Dodge Chance', format: (v) => v.toFixed(1) + '%' }
    ];
    return stats.map(({ key, label, format }) => html`
      <div class="flex-between mb-1 py-1" style="border-bottom: 1px solid rgba(255,255,255,0.02); padding: 0.2rem 0.5rem;">
        <span class="text-muted">${label}</span>
        <span class="text-bold text-highlight">${format(combatStats[key] || 0)}</span>
      </div>
    `);
  };

  return html`
    <div class="hero-avatar-panel glass-inner-panel">
      <div class="hero-title-select-container text-center" style="margin-bottom: 0.4rem; display: flex; justify-content: center; width: 100%;">
        <select 
          class="ui-select" 
          style="padding: 0.2rem 0.5rem; font-size: 0.75rem; height: auto; min-width: 160px; max-width: 220px; font-style: italic; color: var(--color-gold-hover); text-align: center; border-color: rgba(197, 160, 89, 0.2); background: rgba(0, 0, 0, 0.4);"
          value=${hero?.title || ''}
          onChange=${(e) => onSetTitle(e.target.value)}
        >
          <option value="" style="font-style: normal; color: var(--color-text-muted);">${lang === 'de' ? 'Kein Titel' : 'No Title'}</option>
          ${Array.from(new Set(hero?.titles || [])).map(t => html`
            <option value=${t} style="font-style: italic;">« ${t} »</option>
          `)}
        </select>
      </div>
      <div class="hero-name cinzel text-lg text-gold glow-text text-center">${hero?.name || (lang === 'de' ? 'Held' : 'Hero')}</div>
      <div class="hero-level text-muted text-sm text-center">${lang === 'de' ? 'Stufe' : 'Level'} ${hero?.level || 1}</div>

      <div class="avatar-container">
        <div class="rune-halo"></div>
        <svg class="silhouette-svg" viewBox="0 0 120 240" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="hero-glow">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#hero-glow)" opacity="0.4" fill="#c5a059" transform="scale(1.2) translate(-10, -20)">
            <circle cx="50" cy="25" r="16" />
            <path d="M 28 45 Q 50 38 72 45 L 85 110 L 15 110 Z" />
            <path d="M 20 50 L 5 125 L 15 130 L 28 65 Z" />
            <path d="M 80 50 L 95 125 L 85 130 L 72 65 Z" />
            <path d="M 33 110 L 26 195 L 44 195 L 46 110 Z" />
            <path d="M 67 110 L 74 195 L 56 195 L 54 110 Z" />
          </g>
        </svg>
        ${hero && slotKeys.map(slot => {
          const item = hero.equipment?.[slot] || null;
          const color = item ? (rarityColors[item.rarity] || '#aaa') : '#3a3a4a';
          const icon = slotIcons[slot] || '?';
          const coords = slotCoords[slot] || { top: '0%', left: '0%' };
          
          return html`<${EquipmentSlot} 
            slotKey=${slot}
            item=${item}
            onHover=${onEquipmentSlotHover}
            onLeave=${onEquipmentSlotLeave}
            onClick=${onEquipmentSlotClick}
            getItemIcon=${getItemIcon}
            coords=${coords}
            defaultIcon=${icon}
            color=${color}
          />`;
        })}
      </div>

      <div class="hero-exp text-sm text-center text-muted mb-1 w-100" style="background: rgba(10,10,12,0.6); border: 1px solid rgba(197,160,89,0.15); padding: 0.4rem 1rem; border-radius: 2px;">
        ${lang === 'de' ? 'Erfahrung:' : 'Experience:'} ${Math.floor(hero?.experience || 0)} / ${hero?.expToNext || 50} (${Math.floor(levelProgress || 0)}%)
      </div>

      ${hero?.unspentStatPoints > 0 ? html`
        <div class="hero-stat-points w-100 mb-1 text-center" style="background: rgba(212,175,55,0.08); border: 1px solid var(--color-gold); padding: 0.5rem; border-radius: 2px;">
          <span class="text-gold glow-text text-bold">✨ ${hero.unspentStatPoints} ${lang === 'de' ? 'PUNKTE VERFÜGBAR' : 'POINTS AVAILABLE'} ✨</span>
        </div>
      ` : ''}

      <h3 class="options-header w-100 text-center cinzel text-sm" style="margin-bottom: 0.5rem;">${lang === 'de' ? 'Attribute' : 'Attributes'}</h3>
      <div class="stats-grid w-100 pr-1">${renderAttributes()}</div>

      <h3 class="options-header w-100 text-center cinzel text-sm" style="margin-top: 0.5rem; margin-bottom: 0.5rem;">${lang === 'de' ? 'Kampfwerte' : 'Combat Stats'}</h3>
      <div class="stats-grid w-100 pr-1">${renderCombatStats()}</div>
    </div>
  `;
}
