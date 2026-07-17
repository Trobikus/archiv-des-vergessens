/**
 * ============================================================
 * FILE: ui/preact/hero/HeroUI.js – Helden-UI (Preact)
 * ============================================================
 * 
 * Zeigt:
 * - Avatar mit 13 Equipment-Slots
 * - Attribute & Kampfstats
 * - Stat-Punkte-Verwaltung
 * - 3 Tabs: Ressourcen, Ausrüstung, Loot
 * - Prestige-Button
 * ============================================================
 */

import { h, Component, html, useStateSelector, useEventBus } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { selectHero, selectHeroAttributes, selectHeroCombatStats, selectHeroLevelProgress, selectResources } from '../../../core/state/selectors.js';

export function HeroUI({ stateManager, eventBus, services }) {
  const { heroService, resourceService, forgeService, achievementService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [previewItem, setPreviewItem] = useState(null);

  // State-Selektoren
  const hero = useStateSelector(stateManager, selectHero);
  const attributes = useStateSelector(stateManager, selectHeroAttributes);
  const combatStats = useStateSelector(stateManager, selectHeroCombatStats);
  const levelProgress = useStateSelector(stateManager, selectHeroLevelProgress);
  const resources = useStateSelector(stateManager, selectResources);

  // Events abonnieren
  useEventBus(eventBus, EVENTS.UI_OPEN_HERO, () => setIsOpen(true));
  useEventBus(eventBus, EVENTS.HERO_UPDATED, () => { /* State-Update triggert automatisch Neu-Render */ });

  if (!isOpen) return null;

  // Helfer: Seltenheitsfarben
  const rarityColors = {
    common: '#aaa',
    uncommon: '#5a9a5a',
    rare: '#4a7aaa',
    epic: '#9a4aaa',
    legendary: '#d4af37'
  };

  const rarityLabels = {
    common: 'Gewöhnlich',
    uncommon: 'Ungewöhnlich',
    rare: 'Selten',
    epic: 'Episch',
    legendary: 'Legendär'
  };

  // Slot-Namen für die 13 Slots
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

  // Stat-Punkt verteilen
  const handleSpendStat = (statKey) => {
    heroService.spendStatPoint(statKey);
  };

  // Prestige durchführen
  const handlePrestige = () => {
    if (hero.prestige.bossProgress < 20) {
      eventBus.publish('ui:showToast', {
        message: '⚔️ Verewigung erst nach dem letzten Boss möglich.',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    if (confirm('Möchtest du deinen Helden verewigen? Alle Fortschritte außer Prestige-Level werden zurückgesetzt.')) {
      heroService.performPrestige(resourceService, services.clanService);
    }
  };

  // Item anlegen
  const handleEquipItem = (itemData) => {
    const item = Item.fromJSON(itemData);
    const targetSlot = item.slot;
    const hasPacifistRing = stateManager.getState().challenges.completed.includes('pacifist');
    // Entferne Item aus Inventar und lege es an
    heroService._stateManager.dispatch((state) => {
      const hero = { ...state.hero };
      const idx = hero.inventory.equipment.findIndex(i => i === itemData);
      if (idx === -1) return state;
      hero.inventory.equipment.splice(idx, 1);
      const oldItem = hero.equipment[targetSlot];
      if (oldItem) hero.inventory.equipment.push(oldItem);
      hero.equipment[targetSlot] = itemData;
      return { ...state, hero };
    }, 'hero/equipItem');
    setPreviewItem(null);
  };

  // Item zerlegen
  const handleSalvageItem = (itemData, isLoot = false) => {
    if (!confirm('Gegenstand wirklich zerlegen?')) return;
    const result = forgeService.salvageItem(
      isLoot ? hero.inventory.loot.indexOf(itemData) : hero.inventory.equipment.indexOf(itemData),
      isLoot
    );
    if (result.success) {
      eventBus.publish('ui:showToast', { message: result.message, type: 'success', duration: 2000 });
    }
  };

  // Item verkaufen (Loot)
  const handleSellLoot = (itemData) => {
    const idx = hero.inventory.loot.indexOf(itemData);
    if (idx === -1) return;
    const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[itemData.rarity] || 0);
    resourceService.addParticles(value);
    heroService._stateManager.dispatch((state) => {
      const hero = { ...state.hero };
      hero.inventory.loot.splice(idx, 1);
      return { ...state, hero };
    }, 'hero/sellLoot');
    eventBus.publish('ui:showToast', { message: `Loot für ${value} Partikel verkauft.`, type: 'success', duration: 2000 });
  };

  // Tab wechseln
  const switchTab = (tab) => {
    setActiveTab(tab);
    setPreviewItem(null);
  };

  // Rendering-Hilfe: Equipment-Slots
  const renderEquipmentSlots = () => {
    return slotKeys.map(slot => {
      const item = hero.equipment[slot];
      const color = item ? rarityColors[item.rarity] : '#3a3a4a';
      const icon = slotIcons[slot] || '?';
      return html`
        <div 
          class="equip-node ${item ? '' : 'empty'}" 
          style="border-color: ${color}; color: ${color};"
          title="${item ? `${item.name} (${rarityLabels[item.rarity]})` : `${slot} – leer`}"
          onMouseEnter=${() => { if (item) setPreviewItem(item); }}
          onMouseLeave=${() => setPreviewItem(null)}
          onClick=${() => {
            if (item) {
              // Ausgerüstetes Item ablegen
              heroService._stateManager.dispatch((state) => {
                const hero = { ...state.hero };
                const oldItem = hero.equipment[slot];
                if (oldItem) {
                  hero.equipment[slot] = null;
                  hero.inventory.equipment.push(oldItem);
                }
                return { ...state, hero };
              }, 'hero/unequip');
            }
          }}
        >
          ${icon}
        </div>
      `;
    });
  };

  // Rendering-Hilfe: Attribute
  const renderAttributes = () => {
    const attrConfig = [
      { key: 'attack', label: '⚔️ Stärke' },
      { key: 'defense', label: '🛡️ Zähigkeit' },
      { key: 'agility', label: '⚡ Geschick' },
      { key: 'stamina', label: '❤️ Vitalität' }
    ];
    return attrConfig.map(({ key, label }) => {
      const val = attributes[key] || 0;
      const canSpend = hero.unspentStatPoints > 0;
      return html`
        <div class="stat-row glass-inner-panel flex-between mb-1">
          <span>
            <span class="text-muted">${label}:</span>
            <span class="text-highlight text-bold">${val}</span>
          </span>
          ${canSpend ? html`<button class="btn-stat-add" onClick=${() => handleSpendStat(key)}>+</button>` : ''}
        </div>
      `;
    });
  };

  // Rendering-Hilfe: Kampfstats
  const renderCombatStats = () => {
    const stats = [
      { key: 'maxHp', label: '❤️ Max Leben', format: (v) => Math.floor(v) },
      { key: 'damageReduction', label: '🛡️ Schadensreduktion', format: (v) => (v * 100).toFixed(1) + '%' },
      { key: 'critChance', label: '⚡ Krit-Chance', format: (v) => v.toFixed(1) + '%' },
      { key: 'critDamage', label: '💥 Krit-Schaden', format: (v) => v.toFixed(1) + '%' },
      { key: 'dodgeChance', label: '🌀 Ausweichen', format: (v) => v.toFixed(1) + '%' }
    ];
    return stats.map(({ key, label, format }) => html`
      <div class="flex-between mb-1 py-1">
        <span class="text-muted">${label}</span>
        <span class="text-bold text-highlight">${format(combatStats[key] || 0)}</span>
      </div>
    `);
  };

  // Tab-Inhalte
  const renderTabContent = () => {
    if (activeTab === 'resources') {
      return html`
        <div class="glass-inner-panel mb-2">
          <h3 class="options-header cinzel text-sm">Erinnerungsschatz</h3>
          <div class="flex-between mb-1"><span class="text-muted">Mneme-Partikel:</span> <span class="text-gold text-bold">${resources.particles}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">Mneme-Relikte:</span> <span class="text-gold text-bold">${resources.relics}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">Mneme-Artefakte:</span> <span class="text-gold text-bold">${resources.artifacts}</span></div>
          <div class="flex-between"><span class="text-muted">Erinnerungsstaub:</span> <span class="text-dust text-bold">${resources.memoryDust}</span></div>
        </div>
        <div class="glass-inner-panel mb-2">
          <h3 class="options-header cinzel text-sm">Heldentum & Prestige</h3>
          <div class="flex-between mb-1"><span class="text-muted">Prestige-Stufe:</span> <span class="text-gold text-bold">Stufe ${hero.prestige.level}</span></div>
          <div class="flex-between"><span class="text-muted">Prestige-Punkte:</span> <span class="text-gold text-bold">${hero.prestige.points}</span></div>
        </div>
        <div class="glass-inner-panel">
          <h3 class="options-header cinzel text-sm">Statistiken</h3>
          <div class="flex-between mb-1"><span class="text-muted">Besiegte Bosse:</span> <span class="text-highlight text-bold">${hero.prestige.defeatedBosses.length}</span></div>
          <div class="flex-between"><span class="text-muted">Titel:</span> <span class="text-gold text-bold">${hero.title || 'Kein Titel'}</span></div>
        </div>
      `;
    }

    if (activeTab === 'equipment') {
      const items = hero.inventory.equipment;
      if (items.length === 0) {
        return html`<div class="text-disabled text-italic pt-1 text-center">Keine Ausrüstungsteile im Inventar.</div>`;
      }
      return items.map(item => html`
        <div class="inventory-item-card" style="border-left: 3px solid ${rarityColors[item.rarity]};">
          <div class="item-name" style="color: ${rarityColors[item.rarity]};">
            ${item.name} <span class="text-muted text-sm">Lv.${item.level}</span>
            <span class="text-muted text-sm">(${rarityLabels[item.rarity]})</span>
          </div>
          <div class="item-actions">
            <button class="glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);" onClick=${() => handleEquipItem(item)}>Anlegen</button>
            <button class="glass-btn btn-danger btn-small" onClick=${() => handleSalvageItem(item, false)}>Zerlegen</button>
          </div>
        </div>
      `);
    }

    if (activeTab === 'loot') {
      const items = hero.inventory.loot;
      if (items.length === 0) {
        return html`<div class="text-disabled text-italic pt-1 text-center">Kein Loot im Besitz.</div>`;
      }
      return items.map(item => {
        const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0);
        return html`
          <div class="inventory-item-card" style="border-left: 3px solid ${rarityColors[item.rarity]};">
            <div class="item-name" style="color: ${rarityColors[item.rarity]};">
              ${item.name} <span class="text-muted text-sm">(${rarityLabels[item.rarity]})</span>
            </div>
            <div class="item-actions">
              <span class="text-muted text-sm" style="margin-right: 8px;">+${value} Partikel</span>
              <button class="glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);" onClick=${() => handleSellLoot(item)}>Verkaufen</button>
              <button class="glass-btn btn-danger btn-small" onClick=${() => handleSalvageItem(item, true)}>Zerlegen</button>
            </div>
          </div>
        `;
      });
    }

    return null;
  };

  // Haupt-Render
  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="hero-modal-wide glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">Mein Held</h2>

        <div class="hero-split-layout">
          <!-- Linke Seite: Avatar & Stats -->
          <div class="hero-avatar-panel glass-inner-panel">
            <div class="hero-name cinzel text-lg text-gold glow-text text-center">${hero.name}</div>
            <div class="hero-level text-muted text-sm text-center">Stufe ${hero.level}</div>

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
              ${renderEquipmentSlots()}
            </div>

            <div class="hero-exp text-sm text-center text-muted mb-1 w-100">
              Erfahrung: ${hero.experience} / ${hero.expToNext} (${Math.floor(levelProgress)}%)
            </div>

            ${hero.unspentStatPoints > 0 ? html`
              <div class="hero-stat-points w-100 mb-1 text-center" style="background: rgba(212, 175, 55, 0.08); border: 1px solid var(--color-gold); padding: 0.5rem;">
                <span class="text-gold glow-text text-bold">✨ ${hero.unspentStatPoints} PUNKTE VERFÜGBAR ✨</span>
              </div>
            ` : ''}

            <h3 class="options-header w-100 text-center cinzel text-sm">Attribute</h3>
            <div class="stats-grid w-100 pr-1">${renderAttributes()}</div>

            <h3 class="options-header w-100 text-center cinzel text-sm">Kampfwerte</h3>
            <div class="stats-grid w-100 pr-1">${renderCombatStats()}</div>
          </div>

          <!-- Rechte Seite: Tabs & Inventar -->
          <div class="hero-details-panel">
            <div class="hero-action-buttons">
              <button class="glass-btn primary btn-small ${hero.prestige.bossProgress >= 20 ? 'epic-pulse' : ''}" onClick=${handlePrestige}>
                ${hero.prestige.bossProgress >= 20 ? '🌌 Verewigen' : '🔒 Gesperrt'}
              </button>
            </div>

            <div class="tab-container">
              <button class="inv-tab-btn ${activeTab === 'resources' ? 'active' : ''}" onClick=${() => switchTab('resources')}>Ressourcen</button>
              <button class="inv-tab-btn ${activeTab === 'equipment' ? 'active' : ''}" onClick=${() => switchTab('equipment')}>Ausrüstung</button>
              <button class="inv-tab-btn ${activeTab === 'loot' ? 'active' : ''}" onClick=${() => switchTab('loot')}>Loot</button>
            </div>

            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; padding-right: 0.3rem;">
              ${renderTabContent()}
            </div>
          </div>
        </div>

        <div class="hero-modal-footer">
          <span class="text-muted text-sm cinzel">MEMENTO MEMORIAE</span>
          <span class="footer-gem">✦</span>
          <span class="text-gold text-sm cinzel">DER MNEME-BUND</span>
        </div>
      </div>
    </div>
  `;
}