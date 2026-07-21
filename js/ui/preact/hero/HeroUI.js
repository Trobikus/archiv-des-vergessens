/**
 * ============================================================
 * FILE: ui/preact/hero/HeroUI.js – Helden-UI (Preact) – v2.0 FINAL
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

import { h, html, useState, useEffect, useCallback, useMemo, useStateSelector, useEventBus } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { selectHero, selectHeroAttributes, selectHeroCombatStats, selectHeroLevelProgress, selectResources } from '../../../core/state/selectors.js';
import { Item } from '../../../models/item.js';

/**
 * Helden-UI – Hauptkomponente.
 */
export function HeroUI({ stateManager, eventBus, services }) {
  const { heroService, resourceService, forgeService, achievementService, dailyRewardService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [previewItem, setPreviewItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [bulkRarity, setBulkRarity] = useState('common');

  // Hilfsfunktion für Custom-Icons
  const getItemIcon = (item) => {
    if (!item) return null;
    const name = item.name;
    if (name === "Amulett der Dämmerung") {
      return "icons/Amulett der Dämmerung .png";
    }
    if (name === "Mneme-Krone" || name === "Mneme-Krone der Wiederkehr") {
      return "icons/Die Mneme-Krone.png";
    }
    if (
      name === "Klinge der Ersten" || 
      name === "Ewige Mneme-Klinge" || 
      name === "Staubige Klinge" || 
      name === "Schattenklinge" || 
      name === "Archiv-Klinge" || 
      name === "Architekten-Klinge" || 
      name === "Gott-Klinge" || 
      name === "Grundlegende Klinge" || 
      name === "Stahlklinge" || 
      name === "Dämonenklinge" || 
      name === "Göttliche Klinge"
    ) {
      return "icons/Die Klinge der Ersten.png";
    }
    return null;
  };

  // State-Selektoren
  const hero = useStateSelector(stateManager, (state) => state?.hero || null);
  const attributes = useStateSelector(stateManager, (state) => {
    if (!state?.hero) return { attack: 0, defense: 0, agility: 0, stamina: 0 };
    const h = state.hero;
    const base = h.baseStats || { attack: 5, defense: 3, agility: 4, stamina: 6 };
    const spent = h.spentStats || { attack: 0, defense: 0, agility: 0, stamina: 0 };
    return {
      attack: base.attack + spent.attack,
      defense: base.defense + spent.defense,
      agility: base.agility + spent.agility,
      stamina: base.stamina + spent.stamina
    };
  });

  const combatStats = useStateSelector(stateManager, (state) => {
    if (!state?.hero) return { maxHp: 100, damageReduction: 0, critChance: 0, critDamage: 150, dodgeChance: 0 };
    const attr = attributes;
    return {
      ...attr,
      maxHp: 100 + (attr.stamina * 10) + (attr.defense * 2),
      damageReduction: attr.defense / (attr.defense + 100),
      critChance: Math.min(80, 5 + (attr.agility * 0.5)),
      critDamage: 150 + (attr.attack * 0.5),
      dodgeChance: Math.min(50, attr.agility * 0.25)
    };
  });

  const levelProgress = useStateSelector(stateManager, (state) => {
    if (!state?.hero) return 0;
    const h = state.hero;
    if (h.expToNext === Infinity) return 100;
    return (h.experience / h.expToNext) * 100;
  });

  const resources = useStateSelector(stateManager, (state) => {
    if (!state?.resources) return { particles: 0, relics: 0, artifacts: 0, memoryDust: 0 };
    const r = state.resources;
    return {
      particles: Number(r.particles || '0'),
      relics: Number(r.relics || '0'),
      artifacts: Number(r.artifacts || '0'),
      memoryDust: Number(r.memoryDust || '0')
    };
  });

  const matchingLootCount = useMemo(() => {
    const items = hero?.inventory?.loot || [];
    const targetRank = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      all: 4
    }[bulkRarity] ?? 0;

    const rarityRanks = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4
    };

    return items.filter(item => {
      const rank = rarityRanks[item.rarity] ?? 0;
      return bulkRarity === 'all' ? true : rank <= targetRank;
    }).length;
  }, [hero?.inventory?.loot, bulkRarity]);

  // Events abonnieren
  useEventBus(eventBus, EVENTS.UI_OPEN_HERO, () => setIsOpen(true));
  useEventBus(eventBus, EVENTS.HERO_UPDATED, () => {});

  // Wenn nicht geöffnet, nichts rendern
  if (!isOpen) return null;

  // Helfer: Seltenheitsfarben und -labels
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

  const slotLabels = {
    weapon: 'Waffe',
    shield: 'Schild',
    helmet: 'Helm',
    shoulders: 'Schultern',
    armor: 'Rüstung',
    gloves: 'Handschuhe',
    belt: 'Gürtel',
    boots: 'Stiefel',
    amulet: 'Amulett',
    ring: 'Ring (links)',
    ring2: 'Ring (rechts)'
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

  // Stat-Punkt verteilen
  const handleSpendStat = (statKey) => {
    if (heroService && heroService.spendStatPoint) {
      heroService.spendStatPoint(statKey);
    }
  };

  // Prestige durchführen
  const handlePrestige = () => {
    if (!hero) return;
    if (hero.prestige?.bossProgress < 20) {
      eventBus.publish('ui:showToast', {
        message: '⚔️ Verewigung erst nach dem letzten Boss möglich.',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    if (confirm('Möchtest du deinen Helden verewigen? Alle Fortschritte außer Prestige-Level werden zurückgesetzt.')) {
      if (heroService && heroService.performPrestige) {
        heroService.performPrestige(resourceService, services?.clanService);
      }
    }
  };

  // Item anlegen
  const handleEquipItem = (itemData, idx) => {
    if (!hero) return;
    const item = Item.fromJSON(itemData);
    const targetSlot = item.slot;
    
    if (stateManager) {
      stateManager.dispatch((state) => {
        if (!state?.hero) return state;
        
        let targetIdx = idx;
        const inventoryItem = state.hero.inventory.equipment[targetIdx];
        if (!inventoryItem || inventoryItem.name !== itemData.name || inventoryItem.slot !== itemData.slot) {
          const fallbackIdx = state.hero.inventory.equipment.findIndex(
            i => i.name === itemData.name && i.slot === itemData.slot && i.level === itemData.level && i.rarity === itemData.rarity
          );
          if (fallbackIdx === -1) return state;
          targetIdx = fallbackIdx;
        }
        
        let newEquipInventory = state.hero.inventory.equipment.filter((_, i) => i !== targetIdx);
        const oldItem = state.hero.equipment[targetSlot];
        if (oldItem) {
          newEquipInventory = [...newEquipInventory, oldItem];
        }
        return {
          ...state,
          hero: {
            ...state.hero,
            inventory: {
              ...state.hero.inventory,
              equipment: newEquipInventory
            },
            equipment: {
              ...state.hero.equipment,
              [targetSlot]: itemData
            }
          }
        };
      }, 'hero/equipItem');
      setPreviewItem(null);
      eventBus.publish(EVENTS.HERO_UPDATED);
    }
  };

  // Item zerlegen
  const handleSalvageItem = (itemData, idx, isLoot = false) => {
    if (!confirm('Gegenstand wirklich zerlegen?')) return;
    if (!forgeService || !forgeService.salvageItem) return;
    
    const inventory = isLoot ? hero?.inventory?.loot : hero?.inventory?.equipment;
    if (!inventory) return;
    
    let targetIdx = idx;
    const currentItem = inventory[targetIdx];
    if (!currentItem || currentItem.name !== itemData.name) {
      const fallbackIdx = inventory.findIndex(
        i => i.name === itemData.name && i.slot === itemData.slot && i.level === itemData.level
      );
      if (fallbackIdx === -1) return;
      targetIdx = fallbackIdx;
    }
    
    const result = forgeService.salvageItem(targetIdx, isLoot);
    if (result?.success) {
      eventBus.publish('ui:showToast', { message: result.message, type: 'success', duration: 2000 });
    }
  };

  // Item verkaufen (Loot)
  const handleSellLoot = (itemData, idx) => {
    if (!hero || !resourceService) return;
    const inventory = hero.inventory?.loot;
    if (!inventory) return;
    
    let targetIdx = idx;
    const currentItem = inventory[targetIdx];
    if (!currentItem || currentItem.name !== itemData.name) {
      const fallbackIdx = inventory.findIndex(
        i => i.name === itemData.name && i.rarity === itemData.rarity
      );
      if (fallbackIdx === -1) return;
      targetIdx = fallbackIdx;
    }
    
    const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[itemData.rarity] || 0);
    resourceService.addParticles(value);
    stateManager.dispatch((state) => {
      if (!state?.hero) return state;
      return {
        ...state,
        hero: {
          ...state.hero,
          inventory: {
            ...state.hero.inventory,
            loot: state.hero.inventory.loot.filter((_, i) => i !== targetIdx)
          }
        }
      };
    }, 'hero/sellLoot');
    eventBus.publish('ui:showToast', { message: `Loot für ${value} Partikel verkauft.`, type: 'success', duration: 2000 });
  };

  // Massenverkauf (Loot)
  const handleBulkSell = () => {
    if (!hero || !resourceService || matchingLootCount === 0) return;

    const targetRank = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      all: 4
    }[bulkRarity] ?? 0;

    const rarityRanks = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4
    };

    const itemsToKeep = [];
    const itemsToSell = [];

    const items = hero.inventory?.loot || [];
    items.forEach(item => {
      const rank = rarityRanks[item.rarity] ?? 0;
      const shouldSell = bulkRarity === 'all' ? true : rank <= targetRank;
      if (shouldSell) {
        itemsToSell.push(item);
      } else {
        itemsToKeep.push(item);
      }
    });

    if (itemsToSell.length === 0) return;

    // Sicherheitsabfrage für höhere Seltenheiten
    const containsHighRarity = itemsToSell.some(item => ['rare', 'epic', 'legendary'].includes(item.rarity));
    if (containsHighRarity) {
      const confirmMsg = 'Möchtest du wirklich alle ausgewählten Loot-Gegenstände (einschließlich seltener, epischer oder legendärer) verkaufen?';
      if (!confirm(confirmMsg)) return;
    }

    const totalValue = itemsToSell.reduce((acc, item) => {
      const bonus = { common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0;
      return acc + 5 + bonus;
    }, 0);

    resourceService.addParticles(totalValue);

    stateManager.dispatch((state) => {
      if (!state?.hero) return state;
      return {
        ...state,
        hero: {
          ...state.hero,
          inventory: {
            ...state.hero.inventory,
            loot: itemsToKeep
          }
        }
      };
    }, 'hero/bulkSellLoot');

    eventBus.publish(EVENTS.HERO_UPDATED);
    eventBus.publish('ui:showToast', { 
      message: `${itemsToSell.length} Gegenstände für ${totalValue} Partikel verkauft.`, 
      type: 'success', 
      duration: 3000 
    });
  };

  // Tab wechseln
  const switchTab = (tab) => {
    setActiveTab(tab);
    setPreviewItem(null);
  };

  // Rendering: Equipment-Slots
  const renderEquipmentSlots = () => {
    if (!hero) return null;
    return slotKeys.map(slot => {
      const item = hero.equipment?.[slot] || null;
      const color = item ? (rarityColors[item.rarity] || '#aaa') : '#3a3a4a';
      const icon = slotIcons[slot] || '?';
      const coords = slotCoords[slot] || { top: '0%', left: '0%' };
      return html`
        <div 
          class="equip-node ${item ? '' : 'empty'}" 
          style="border-color: ${color}; color: ${color}; top: ${coords.top}; left: ${coords.left};"
          onMouseEnter=${(e) => {
            if (item) {
              setPreviewItem(item);
              setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
            }
          }}
          onMouseMove=${(e) => {
            if (item) {
              setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
            }
          }}
          onMouseLeave=${() => setPreviewItem(null)}
          onClick=${() => {
            if (item && stateManager) {
              stateManager.dispatch((state) => {
                if (!state?.hero) return state;
                const oldItem = state.hero.equipment[slot];
                if (!oldItem) return state;
                return {
                  ...state,
                  hero: {
                    ...state.hero,
                    equipment: {
                      ...state.hero.equipment,
                      [slot]: null
                    },
                    inventory: {
                      ...state.hero.inventory,
                      equipment: [...state.hero.inventory.equipment, oldItem]
                    }
                  }
                };
              }, 'hero/unequip');
              setPreviewItem(null);
              eventBus.publish(EVENTS.HERO_UPDATED);
            }
          }}
        >
          ${item && getItemIcon(item) ? html`<img src="${getItemIcon(item)}" class="equip-icon-img" alt="${item.name}" />` : icon}
        </div>
      `;
    });
  };

  // Rendering: Attribute
  const renderAttributes = () => {
    if (!attributes) return null;
    const attrConfig = [
      { key: 'attack', label: '⚔️ Stärke' },
      { key: 'defense', label: '🛡️ Zähigkeit' },
      { key: 'agility', label: '⚡ Geschick' },
      { key: 'stamina', label: '❤️ Vitalität' }
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
          ${canSpend ? html`<button class="btn-stat-add" onClick=${() => handleSpendStat(key)}>+</button>` : ''}
        </div>
      `;
    });
  };

  // Rendering: Kampfstats
  const renderCombatStats = () => {
    if (!combatStats) return null;
    const stats = [
      { key: 'maxHp', label: '❤️ Max Leben', format: (v) => Math.floor(v) },
      { key: 'damageReduction', label: '🛡️ Schadensreduktion', format: (v) => (v * 100).toFixed(1) + '%' },
      { key: 'critChance', label: '⚡ Krit-Chance', format: (v) => v.toFixed(1) + '%' },
      { key: 'critDamage', label: '💥 Krit-Schaden', format: (v) => v.toFixed(1) + '%' },
      { key: 'dodgeChance', label: '🌀 Ausweichen', format: (v) => v.toFixed(1) + '%' }
    ];
    return stats.map(({ key, label, format }) => html`
      <div class="flex-between mb-1 py-1" style="border-bottom: 1px solid rgba(255,255,255,0.02); padding: 0.2rem 0.5rem;">
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
          <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">Erinnerungsschatz</h3>
          <div class="flex-between mb-1"><span class="text-muted">Mneme-Partikel:</span> <span class="text-gold text-bold">${resources.particles}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">Mneme-Relikte:</span> <span class="text-gold text-bold">${resources.relics}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">Mneme-Artefakte:</span> <span class="text-gold text-bold">${resources.artifacts}</span></div>
          <div class="flex-between"><span class="text-muted">Erinnerungsstaub:</span> <span class="text-dust text-bold">${resources.memoryDust}</span></div>
        </div>
        <div class="glass-inner-panel mb-2">
          <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">Heldentum & Prestige</h3>
          <div class="flex-between mb-1"><span class="text-muted">Prestige-Stufe:</span> <span class="text-gold text-bold">Stufe ${hero?.prestige?.level || 0}</span></div>
          <div class="flex-between"><span class="text-muted">Prestige-Punkte:</span> <span class="text-gold text-bold">${hero?.prestige?.points || 0}</span></div>
        </div>
        <div class="glass-inner-panel">
          <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">Statistiken</h3>
          <div class="flex-between mb-1"><span class="text-muted">Besiegte Bosse:</span> <span class="text-highlight text-bold">${hero?.prestige?.defeatedBosses?.length || 0}</span></div>
          <div class="flex-between"><span class="text-muted">Erworbene Titel:</span> <span class="text-gold text-bold">${Array.from(new Set(hero?.titles || [])).length}</span></div>
        </div>
      `;
    }

    if (activeTab === 'equipment') {
      const items = hero?.inventory?.equipment || [];
      if (items.length === 0) {
        return html`<div class="text-disabled text-italic pt-1 text-center">Keine Ausrüstungsteile im Inventar.</div>`;
      }
      return items.map((item, idx) => html`
        <div 
          class="inventory-item-card" 
          style="border-left: 3px solid ${rarityColors[item.rarity] || '#aaa'}; display: flex; align-items: center; justify-content: space-between;"
          onMouseEnter=${(e) => {
            setPreviewItem(item);
            setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
          }}
          onMouseMove=${(e) => setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 })}
          onMouseLeave=${() => setPreviewItem(null)}
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            ${getItemIcon(item) ? html`<img src="${getItemIcon(item)}" style="width: 32px; height: 32px; object-fit: contain; border-radius: 2px; border: 1px solid rgba(255,255,255,0.1);" alt="${item.name}" />` : ''}
            <div class="item-name" style="color: ${rarityColors[item.rarity] || '#aaa'};">
              ${item.name} <span class="text-muted text-sm">Lv.${item.level}</span>
              <span class="text-muted text-sm">(${rarityLabels[item.rarity] || item.rarity})</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);" onClick=${(e) => { e.stopPropagation(); handleEquipItem(item, idx); }}>Anlegen</button>
            <button class="glass-btn btn-danger btn-small" onClick=${(e) => { e.stopPropagation(); handleSalvageItem(item, idx, false); }}>Zerlegen</button>
          </div>
        </div>
      `);
    }

    if (activeTab === 'loot') {
      const items = hero?.inventory?.loot || [];
      if (items.length === 0) {
        return html`<div class="text-disabled text-italic pt-1 text-center">Kein Loot im Besitz.</div>`;
      }
      return items.map((item, idx) => {
        const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0);
        return html`
          <div 
            class="inventory-item-card" 
            style="border-left: 3px solid ${rarityColors[item.rarity] || '#aaa'};"
            onMouseEnter=${(e) => {
              setPreviewItem(item);
              setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
            }}
            onMouseMove=${(e) => setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 })}
            onMouseLeave=${() => setPreviewItem(null)}
          >
            <div class="item-name" style="color: ${rarityColors[item.rarity] || '#aaa'};">
              ${item.name} <span class="text-muted text-sm">(${rarityLabels[item.rarity] || item.rarity})</span>
            </div>
            <div class="item-actions">
              <span class="text-muted text-sm" style="margin-right: 8px;">+${value} Partikel</span>
              <button class="glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);" onClick=${(e) => { e.stopPropagation(); handleSellLoot(item, idx); }}>Verkaufen</button>
              <button class="glass-btn btn-danger btn-small" onClick=${(e) => { e.stopPropagation(); handleSalvageItem(item, idx, true); }}>Zerlegen</button>
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
        <button class="modal-close" id="hero-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">Mein Held</h2>

        <div class="hero-split-layout">
          <!-- Linke Seite: Avatar & Stats -->
          <div class="hero-avatar-panel glass-inner-panel">
            <div class="hero-title-select-container text-center" style="margin-bottom: 0.4rem; display: flex; justify-content: center; width: 100%;">
              <select 
                class="ui-select" 
                style="padding: 0.2rem 0.5rem; font-size: 0.75rem; height: auto; min-width: 160px; max-width: 220px; font-style: italic; color: var(--color-gold-hover); text-align: center; border-color: rgba(197, 160, 89, 0.2); background: rgba(0, 0, 0, 0.4);"
                value=${hero?.title || ''}
                onChange=${(e) => {
                  const newTitle = e.target.value;
                  if (heroService && heroService.setTitle) {
                    heroService.setTitle(newTitle);
                  } else {
                    stateManager.dispatch((state) => ({
                      ...state,
                      hero: {
                        ...state.hero,
                        title: newTitle
                      }
                    }), 'hero/setTitle');
                    eventBus.publish('hero:updated', { title: newTitle });
                  }
                }}
              >
                <option value="" style="font-style: normal; color: var(--color-text-muted);">Kein Titel</option>
                ${Array.from(new Set(hero?.titles || [])).map(t => html`
                  <option value=${t} style="font-style: italic;">« ${t} »</option>
                `)}
              </select>
            </div>
            <div class="hero-name cinzel text-lg text-gold glow-text text-center">${hero?.name || 'Held'}</div>
            <div class="hero-level text-muted text-sm text-center">Stufe ${hero?.level || 1}</div>

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

            <div class="hero-exp text-sm text-center text-muted mb-1 w-100" style="background: rgba(10,10,12,0.6); border: 1px solid rgba(197,160,89,0.15); padding: 0.4rem 1rem; border-radius: 2px;">
              Erfahrung: ${Math.floor(hero?.experience || 0)} / ${hero?.expToNext || 50} (${Math.floor(levelProgress || 0)}%)
            </div>

            ${hero?.unspentStatPoints > 0 ? html`
              <div class="hero-stat-points w-100 mb-1 text-center" style="background: rgba(212,175,55,0.08); border: 1px solid var(--color-gold); padding: 0.5rem; border-radius: 2px;">
                <span class="text-gold glow-text text-bold">✨ ${hero.unspentStatPoints} PUNKTE VERFÜGBAR ✨</span>
              </div>
            ` : ''}

            <h3 class="options-header w-100 text-center cinzel text-sm" style="margin-bottom: 0.5rem;">Attribute</h3>
            <div class="stats-grid w-100 pr-1">${renderAttributes()}</div>

            <h3 class="options-header w-100 text-center cinzel text-sm" style="margin-top: 0.5rem; margin-bottom: 0.5rem;">Kampfwerte</h3>
            <div class="stats-grid w-100 pr-1">${renderCombatStats()}</div>
          </div>

          <!-- Rechte Seite: Tabs & Inventar -->
          <div class="hero-details-panel" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: rgba(0,0,0,0.2); border-radius: 2px; padding: 0.5rem 0.5rem 0.5rem 0.8rem; border: 1px solid rgba(197,160,89,0.05);">
            <div class="hero-action-buttons" style="display: flex; gap: 0.8rem; flex-wrap: wrap; margin-bottom: 0.8rem; flex-shrink: 0;">
              <button class="glass-btn primary btn-small ${hero?.prestige?.bossProgress >= 20 ? 'epic-pulse' : ''}" onClick=${handlePrestige}>
                ${hero?.prestige?.bossProgress >= 20 ? '🌌 Verewigen' : '🔒 Gesperrt'}
              </button>
            </div>

            <div class="tab-container" style="display: flex; gap: 4px; border-bottom: 2px solid rgba(197,160,89,0.12); margin-bottom: 0.5rem; flex-shrink: 0;">
              <button class="inv-tab-btn ${activeTab === 'resources' ? 'active' : ''}" onClick=${() => switchTab('resources')}>Ressourcen</button>
              <button class="inv-tab-btn ${activeTab === 'equipment' ? 'active' : ''}" onClick=${() => switchTab('equipment')}>Ausrüstung</button>
              <button class="inv-tab-btn ${activeTab === 'loot' ? 'active' : ''}" onClick=${() => switchTab('loot')}>Loot</button>
            </div>

            ${activeTab === 'loot' && hero?.inventory?.loot?.length > 0 ? html`
              <div class="bulk-actions-container">
                <span class="text-muted text-xs cinzel" style="margin-right: auto; letter-spacing: 0.5px;">Massenverkauf:</span>
                <select 
                  class="ui-select" 
                  value=${bulkRarity} 
                  onChange=${(e) => setBulkRarity(e.target.value)}
                  style="background: rgba(0, 0, 0, 0.4); border-color: rgba(197, 160, 89, 0.15); color: var(--color-gold-hover);"
                >
                  <option value="common">Nur Gewöhnlich</option>
                  <option value="uncommon">Ungewöhnlich & schlechter</option>
                  <option value="rare">Selten & schlechter</option>
                  <option value="epic">Episch & schlechter</option>
                  <option value="all">Alle Gegenstände</option>
                </select>
                <button 
                  class="glass-btn btn-danger btn-small" 
                  disabled=${matchingLootCount === 0}
                  onClick=${handleBulkSell}
                >
                  Verkaufen (${matchingLootCount})
                </button>
              </div>
            ` : ''}

            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; padding-right: 0.3rem; margin-top: 0.3rem;">
              ${renderTabContent()}
            </div>
          </div>
        </div>

        <div class="hero-modal-footer" style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding-top: 0.8rem; border-top: 1px solid rgba(197,160,89,0.08); flex-shrink: 0; margin-top: 0.3rem;">
          <span class="text-muted text-sm cinzel">MEMENTO MEMORIAE</span>
          <span class="footer-gem">✦</span>
          <span class="text-gold text-sm cinzel">DER MNEME-BUND</span>
        </div>
      </div>

      ${previewItem ? html`
        <div class="custom-tooltip glass-panel" style="display: block; top: ${tooltipPos.y}px; left: ${tooltipPos.x}px;">
          <div class="tooltip-title" style="color: ${rarityColors[previewItem.rarity] || '#aaa'};">
            ${previewItem.name} <span class="text-muted text-sm">Lv.${previewItem.level}</span>
          </div>
          <div class="tooltip-desc">${previewItem.description || 'Ein Ausrüstungsgegenstand.'}</div>
          <div class="tooltip-stats">
            ${Object.entries(previewItem.stats || {}).map(([stat, val]) => html`
              <div class="tooltip-stat">
                <span class="text-muted">${stat === 'attack' ? '⚔️ Stärke' : stat === 'defense' ? '🛡️ Zähigkeit' : stat === 'agility' ? '⚡ Geschick' : '❤️ Vitalität'}:</span>
                <span class="text-highlight text-bold">+${val}</span>
              </div>
            `)}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export default HeroUI;