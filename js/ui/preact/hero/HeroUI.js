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
import { PACTS } from '../../../data/pacts.js';
import { SkillTreeModal } from '../skilltree/SkillTreeModal.js';
import { useItemDisplay } from './useItemDisplay.js';
import { HeroAvatarPanel } from './HeroAvatarPanel.js';
import { PactSelectionModal } from './PactSelectionModal.js';
import { SocketingModal } from './SocketingModal.js';

/**
 * Helden-UI – Hauptkomponente.
 */
export function HeroUI({ stateManager, eventBus, services }) {
  const { heroService, resourceService, forgeService, achievementService, dailyRewardService, i18nService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [previewItem, setPreviewItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [bulkRarity, setBulkRarity] = useState('common');
  const [socketingItem, setSocketingItem] = useState(null);
  const [pactSelectionActive, setPactSelectionActive] = useState(false);
  const [pactChoices, setPactChoices] = useState([]);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);

  // i18n Reaktivität
  const [lang, setLang] = useState(i18nService.getLanguage());
  useEventBus(eventBus, 'i18n:languageChanged', (newLang) => {
    setLang(newLang);
  });

  const {
    getLocText,
    translateItemName,
    translateItemDescription,
    getRarityLabel,
    getSlotLabel,
    getItemIcon
  } = useItemDisplay(lang);

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
  useEventBus(eventBus, 'ui:closeAllModals', () => setIsOpen(false));
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

  // Stat-Punkt verteilen
  const handleSpendStat = (statKey) => {
    if (heroService && heroService.spendStatPoint) {
      heroService.spendStatPoint(statKey);
    }
  };

  // Prestige durchführen
  const handlePrestige = async () => {
    if (!hero) return;
    if (hero.prestige?.bossProgress < 20) {
      eventBus.publish('ui:showToast', {
        message: lang === 'de' ? '⚔️ Verewigung erst nach dem letzten Boss möglich.' : '⚔️ Eternalization only possible after the last Boss.',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    const confirmMsg = lang === 'de'
      ? 'Möchtest du deinen Helden verewigen? Alle Fortschritte außer Prestige-Level werden zurückgesetzt. Du kannst danach einen Finstren Pakt wählen.'
      : 'Do you want to eternalize your hero? All progress except Prestige Level will be reset. You can then choose a Dark Pact.';
    const confirmTitle = lang === 'de' ? 'VEREWIGUNG' : 'ETERNALIZATION';
    if (await window.gameConfirm(confirmMsg, confirmTitle)) {
      // 3 zufällige Pakte auswählen
      const allPacts = Object.values(PACTS);
      const shuffled = [...allPacts].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      setPactChoices(selected);
      setPactSelectionActive(true);
    }
  };

  const handleSelectPact = (pactId) => {
    if (heroService && heroService.performPrestige) {
      heroService.performPrestige(resourceService, services?.clanService, pactId);
    }
    setPactSelectionActive(false);
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
  const handleSalvageItem = async (itemData, idx, isLoot = false) => {
    const confirmMsg = lang === 'de' ? 'Gegenstand wirklich zerlegen?' : 'Really salvage item?';
    if (!(await window.gameConfirm(confirmMsg))) return;
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
      const msg = lang === 'de' ? result.message : result.message.replace('zerlegt', 'salvaged').replace('Erhalten:', 'Received:');
      eventBus.publish('ui:showToast', { message: msg, type: 'success', duration: 2000 });
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
    const msg = lang === 'de' ? `Loot für ${value} Partikel verkauft.` : `Loot sold for ${value} particles.`;
    eventBus.publish('ui:showToast', { message: msg, type: 'success', duration: 2000 });
  };

  // Massenverkauf (Loot)
  const handleBulkSell = async () => {
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
      const confirmMsg = lang === 'de'
        ? 'Möchtest du wirklich alle ausgewählten Loot-Gegenstände (einschließlich seltener, epischer oder legendärer) verkaufen?'
        : 'Do you really want to sell all selected loot items (including rare, epic, or legendary)?';
      const confirmTitle = lang === 'de' ? 'MASSENVERKAUF' : 'BULK SELL';
      if (!(await window.gameConfirm(confirmMsg, confirmTitle))) return;
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
    const msg = lang === 'de'
      ? `${itemsToSell.length} Gegenstände für ${totalValue} Partikel verkauft.`
      : `${itemsToSell.length} items sold for ${totalValue} particles.`;
    eventBus.publish('ui:showToast', { 
      message: msg, 
      type: 'success', 
      duration: 3000 
    });
  };

  // Tab wechseln
  const switchTab = (tab) => {
    setActiveTab(tab);
    setPreviewItem(null);
    setIsSelectMode(false);
    setSelectedIndices([]);
  };

  // Mehrfachauswahl Handlers
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIndices([]);
  };

  const toggleSelectItem = (idx) => {
    setSelectedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectAll = (totalCount) => {
    if (selectedIndices.length === totalCount) {
      setSelectedIndices([]);
    } else {
      const all = [];
      for (let i = 0; i < totalCount; i++) all.push(i);
      setSelectedIndices(all);
    }
  };

  const handleBulkDestroySelected = async (isLoot = false) => {
    if (selectedIndices.length === 0) return;

    const count = selectedIndices.length;
    const confirmMsg = lang === 'de'
      ? `Möchtest du die ${count} ausgewählten Gegenstände wirklich zerlegen / zerstören?`
      : `Do you really want to salvage / destroy the ${count} selected items?`;
    const confirmTitle = lang === 'de' ? 'MEHRFACHAUSWAHL ZERLEGEN' : 'SALVAGE SELECTED';

    if (window.gameConfirm ? !(await window.gameConfirm(confirmMsg, confirmTitle)) : !confirm(confirmMsg)) {
      return;
    }

    // Absteigend sortieren, damit sich beim Entfernen die Indizes der restlichen Elemente nicht verfälschen
    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);
    let totalDustGained = 0;

    for (const idx of sortedDesc) {
      if (isLoot) {
        handleSellLoot(hero?.inventory?.loot?.[idx], idx);
      } else {
        const itemData = hero?.inventory?.equipment?.[idx];
        if (itemData && forgeService?.salvageItem) {
          const res = forgeService.salvageItem(idx, false);
          if (res && res.success) {
            const dustAmounts = { common: 1, uncommon: 3, rare: 10, epic: 25, legendary: 100 };
            totalDustGained += (dustAmounts[itemData.rarity] || 1) * (itemData.level || 1);
          }
        }
      }
    }

    const toastMsg = isLoot
      ? (lang === 'de' ? `${count} Loot-Gegenstände verkauft.` : `${count} loot items sold.`)
      : (lang === 'de' ? `🔥 ${count} Gegenstände zerlegt. Erhalten: +${totalDustGained} Erinnerungsstaub.` : `🔥 ${count} items salvaged. Received: +${totalDustGained} Memory Dust.`);

    eventBus.publish('ui:showToast', {
      message: toastMsg,
      type: 'success',
      duration: 3000
    });

    setSelectedIndices([]);
    setIsSelectMode(false);
    eventBus.publish(EVENTS.HERO_UPDATED);
  };

  const handleEquipmentSlotHover = (e, item) => {
    if (item) {
      setPreviewItem(item);
      setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
    }
  };

  const handleEquipmentSlotLeave = () => {
    setPreviewItem(null);
  };

  const handleEquipmentSlotClick = (slot, item) => {
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
  };

  const handleSetTitle = (newTitle) => {
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
  };

  // Tab-Inhalte
  const renderTabContent = () => {
    if (activeTab === 'resources') {
      return html`
        <div class="glass-inner-panel mb-2">
          <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">${lang === 'de' ? 'Erinnerungsschatz' : 'Memory Vault'}</h3>
          <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Mneme-Partikel:' : 'Mneme Particles:'}</span> <span class="text-gold text-bold">${resources.particles}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Mneme-Relikte:' : 'Mneme Relics:'}</span> <span class="text-gold text-bold">${resources.relics}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Mneme-Artefakte:' : 'Mneme Artifacts:'}</span> <span class="text-gold text-bold">${resources.artifacts}</span></div>
          <div class="flex-between"><span class="text-muted">${lang === 'de' ? 'Erinnerungsstaub:' : 'Memory Dust:'}</span> <span class="text-dust text-bold">${resources.memoryDust}</span></div>
        </div>
        <div class="glass-inner-panel mb-2">
          <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">${lang === 'de' ? 'Heldentum & Prestige' : 'Heroism & Prestige'}</h3>
          <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Prestige-Stufe:' : 'Prestige Level:'}</span> <span class="text-gold text-bold">${lang === 'de' ? 'Stufe' : 'Level'} ${hero?.prestige?.level || 0}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Prestige-Punkte:' : 'Prestige Points:'}</span> <span class="text-gold text-bold">${hero?.prestige?.points || 0}</span></div>
          <div style="margin-top: 0.8rem;">
            <button
              class="glass-btn primary cinzel"
              style="width: 100%; padding: 0.6rem; font-size: 0.85rem; border-color: #00e5ff; color: #00e5ff;"
              onClick=${() => setIsSkillTreeOpen(true)}
            >
              🌌 Mneme-Talentbaum
            </button>
          </div>
          ${(() => {
            const activePactId = hero?.prestige?.activePact;
            const activePactData = activePactId ? PACTS[activePactId] : null;
            if (activePactData) {
              return html`
                <div style="margin-top: 0.6rem; padding: 0.5rem; background: rgba(212,175,55,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 4px; box-shadow: inset 0 0 10px rgba(212,175,55,0.05);">
                  <div style="font-size: 0.58rem; text-transform: uppercase; color: var(--color-gold); font-family: var(--font-header); font-weight: bold; letter-spacing: 0.5px;">${lang === 'de' ? 'Aktiver finsterer Pakt' : 'Active Dark Pact'}</div>
                  <div class="text-gold text-bold" style="font-size: 0.78rem; font-family: var(--font-header); margin-top: 1px;">${getLocText(activePactData, 'name')}</div>
                  <div style="font-size: 0.68rem; color: #2ecc71; margin-top: 4px; font-weight: 500;">${getLocText(activePactData, 'passiveText')}</div>
                  <div style="font-size: 0.68rem; color: #e74c3c; margin-top: 2px; font-weight: 500;">${getLocText(activePactData, 'curseText')}</div>
                </div>
              `;
            } else {
              return html`
                <div class="text-muted text-center" style="font-size: 0.68rem; margin-top: 0.6rem; font-style: italic; opacity: 0.6;">${lang === 'de' ? 'Kein aktiver Sündenpakt vorhanden.' : 'No active sin pact present.'}</div>
              `;
            }
          })()}
        </div>
        <div class="glass-inner-panel">
          <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">${lang === 'de' ? 'Statistiken' : 'Statistics'}</h3>
          <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Besiegte Bosse:' : 'Defeated Bosses:'}</span> <span class="text-highlight text-bold">${hero?.prestige?.defeatedBosses?.length || 0}</span></div>
          <div class="flex-between"><span class="text-muted">${lang === 'de' ? 'Erworbene Titel:' : 'Acquired Titles:'}</span> <span class="text-gold text-bold">${Array.from(new Set(hero?.titles || [])).length}</span></div>
        </div>
      `;
    }

    if (activeTab === 'equipment') {
      const items = hero?.inventory?.equipment || [];
      if (items.length === 0) {
        return html`<div class="text-disabled text-italic pt-1 text-center">${lang === 'de' ? 'Keine Ausrüstungsteile im Inventar.' : 'No equipment items in inventory.'}</div>`;
      }

      return html`
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Select Mode Toolbar -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.8rem; background: rgba(0,0,0,0.35); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
            ${!isSelectMode ? html`
              <span class="text-muted text-sm">${items.length} ${lang === 'de' ? 'Gegenstände im Inventar' : 'Items in Inventory'}</span>
              <button 
                class="glass-btn btn-small cinzel" 
                style="border-color: var(--color-gold); color: var(--color-gold); font-size: 0.75rem; padding: 0.3rem 0.8rem;"
                onClick=${toggleSelectMode}
              >
                ☑️ ${lang === 'de' ? 'Mehrfachauswahl' : 'Select Items'}
              </button>
            ` : html`
              <div style="display: flex; align-items: center; gap: 8px; width: 100%; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button 
                    class="glass-btn btn-small" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.6rem;"
                    onClick=${() => handleSelectAll(items.length)}
                  >
                    ${selectedIndices.length === items.length ? (lang === 'de' ? 'Keine' : 'Deselect All') : (lang === 'de' ? 'Alle wählen' : 'Select All')}
                  </button>
                  <span class="text-gold text-bold text-sm">
                    ${selectedIndices.length} / ${items.length} ${lang === 'de' ? 'ausgewählt' : 'selected'}
                  </span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button 
                    class="glass-btn btn-danger btn-small" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.8rem; font-weight: bold;"
                    disabled=${selectedIndices.length === 0}
                    onClick=${() => handleBulkDestroySelected(false)}
                  >
                    🔥 ${lang === 'de' ? 'Ausgewählte zerlegen' : 'Salvage Selected'} (${selectedIndices.length})
                  </button>
                  <button 
                    class="glass-btn btn-small" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #aaa;"
                    onClick=${toggleSelectMode}
                  >
                    ✕
                  </button>
                </div>
              </div>
            `}
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${items.map((item, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return html`
                <div 
                  class="inventory-item-card" 
                  style="border-left: 3px solid ${rarityColors[item.rarity] || '#aaa'}; display: flex; align-items: center; justify-content: space-between; ${isSelected ? 'border-color: var(--color-gold); background: rgba(212, 175, 55, 0.12);' : ''} cursor: ${isSelectMode ? 'pointer' : 'default'};"
                  onClick=${isSelectMode ? () => toggleSelectItem(idx) : null}
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
                        onChange=${(e) => { e.stopPropagation(); toggleSelectItem(idx); }}
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

    if (activeTab === 'loot') {
      const items = hero?.inventory?.loot || [];
      if (items.length === 0) {
        return html`<div class="text-disabled text-italic pt-1 text-center">${lang === 'de' ? 'Kein Loot im Besitz.' : 'No loot owned.'}</div>`;
      }
      return html`
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Select Mode Toolbar -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.8rem; background: rgba(0,0,0,0.35); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
            ${!isSelectMode ? html`
              <span class="text-muted text-sm">${items.length} ${lang === 'de' ? 'Loot-Gegenstände im Besitz' : 'Loot items in inventory'}</span>
              <button 
                class="glass-btn btn-small cinzel" 
                style="border-color: var(--color-gold); color: var(--color-gold); font-size: 0.75rem; padding: 0.3rem 0.8rem;"
                onClick=${toggleSelectMode}
              >
                ☑️ ${lang === 'de' ? 'Mehrfachauswahl' : 'Select Items'}
              </button>
            ` : html`
              <div style="display: flex; align-items: center; gap: 8px; width: 100%; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button 
                    class="glass-btn btn-small" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.6rem;"
                    onClick=${() => handleSelectAll(items.length)}
                  >
                    ${selectedIndices.length === items.length ? (lang === 'de' ? 'Keine' : 'Deselect All') : (lang === 'de' ? 'Alle wählen' : 'Select All')}
                  </button>
                  <span class="text-gold text-bold text-sm">
                    ${selectedIndices.length} / ${items.length} ${lang === 'de' ? 'ausgewählt' : 'selected'}
                  </span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button 
                    class="glass-btn btn-small" 
                    style="border-color: var(--color-blue); color: var(--color-blue); font-size: 0.75rem; padding: 0.25rem 0.8rem; font-weight: bold;"
                    disabled=${selectedIndices.length === 0}
                    onClick=${() => handleBulkDestroySelected(true)}
                  >
                    💰 ${lang === 'de' ? 'Ausgewählte verkaufen' : 'Sell Selected'} (${selectedIndices.length})
                  </button>
                  <button 
                    class="glass-btn btn-small" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #aaa;"
                    onClick=${toggleSelectMode}
                  >
                    ✕
                  </button>
                </div>
              </div>
            `}
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${items.map((item, idx) => {
              const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0);
              const isSelected = selectedIndices.includes(idx);
              return html`
                <div 
                  class="inventory-item-card" 
                  style="border-left: 3px solid ${rarityColors[item.rarity] || '#aaa'}; display: flex; align-items: center; justify-content: space-between; ${isSelected ? 'border-color: var(--color-gold); background: rgba(212, 175, 55, 0.12);' : ''} cursor: ${isSelectMode ? 'pointer' : 'default'};"
                  onClick=${isSelectMode ? () => toggleSelectItem(idx) : null}
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
                        onChange=${(e) => { e.stopPropagation(); toggleSelectItem(idx); }}
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

    return null;
  };

  // Haupt-Render
  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="hero-modal-wide glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" id="hero-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">${lang === 'de' ? 'Mein Held' : 'My Hero'}</h2>

        <div class="hero-split-layout">
          <!-- Linke Seite: Avatar & Stats -->
          <${HeroAvatarPanel}
            hero=${hero}
            attributes=${attributes}
            combatStats=${combatStats}
            levelProgress=${levelProgress}
            lang=${lang}
            onEquipmentSlotHover=${handleEquipmentSlotHover}
            onEquipmentSlotLeave=${handleEquipmentSlotLeave}
            onEquipmentSlotClick=${handleEquipmentSlotClick}
            onSpendStatPoint=${handleSpendStat}
            onSetTitle=${handleSetTitle}
            getItemIcon=${getItemIcon}
          />

          <!-- Rechte Seite: Tabs & Inventar -->
          <div class="hero-details-panel" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: rgba(0,0,0,0.2); border-radius: 2px; padding: 0.5rem 0.5rem 0.5rem 0.8rem; border: 1px solid rgba(197,160,89,0.05);">
            <div class="hero-action-buttons" style="display: flex; gap: 0.8rem; flex-wrap: wrap; margin-bottom: 0.8rem; flex-shrink: 0;">
              <button class="glass-btn primary btn-small ${hero?.prestige?.bossProgress >= 20 ? 'epic-pulse' : ''}" onClick=${handlePrestige}>
                ${hero?.prestige?.bossProgress >= 20 ? (lang === 'de' ? '🌌 Verewigen' : '🌌 Eternalize') : (lang === 'de' ? '🔒 Gesperrt' : '🔒 Locked')}
              </button>
            </div>

            <div class="tab-container" style="display: flex; gap: 4px; border-bottom: 2px solid rgba(197,160,89,0.12); margin-bottom: 0.5rem; flex-shrink: 0;">
              <button class="inv-tab-btn ${activeTab === 'resources' ? 'active' : ''}" onClick=${() => switchTab('resources')}>${lang === 'de' ? 'Ressourcen' : 'Resources'}</button>
              <button class="inv-tab-btn ${activeTab === 'equipment' ? 'active' : ''}" onClick=${() => switchTab('equipment')}>${lang === 'de' ? 'Ausrüstung' : 'Equipment'}</button>
              <button class="inv-tab-btn ${activeTab === 'loot' ? 'active' : ''}" onClick=${() => switchTab('loot')}>${lang === 'de' ? 'Loot' : 'Loot'}</button>
            </div>

            ${activeTab === 'loot' && hero?.inventory?.loot?.length > 0 ? html`
              <div class="bulk-actions-container">
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
            ` : ''}

            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; padding-right: 0.3rem; margin-top: 0.3rem;">
              ${renderTabContent()}
            </div>
          </div>
        </div>

        <div class="hero-modal-footer" style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding-top: 0.8rem; border-top: 1px solid rgba(197,160,89,0.08); flex-shrink: 0; margin-top: 0.3rem;">
          <span class="text-muted text-sm cinzel">MEMENTO MEMORIAE</span>
          <span class="footer-gem">✦</span>
          <span class="text-gold text-sm cinzel">${lang === 'de' ? 'DER MNEME-BUND' : 'THE MNEME COVENANT'}</span>
        </div>
      </div>

      ${previewItem ? html`
        <div class="custom-tooltip glass-panel" style="display: block; top: ${tooltipPos.y}px; left: ${tooltipPos.x}px; min-width: 220px; pointer-events: none; z-index: 10000;">
          <div class="tooltip-title" style="color: ${rarityColors[previewItem.rarity] || '#aaa'}; font-weight: bold; font-size: 0.95rem; font-family: var(--font-header);">
            ${translateItemName(previewItem.name)} <span class="text-muted text-sm" style="font-size: 0.75rem;">Lv.${previewItem.level}</span>
          </div>
          <div class="tooltip-desc" style="font-size: 0.75rem; color: #aaa; margin: 0.3rem 0;">${translateItemDescription(previewItem.description || 'Ein Ausrüstungsgegenstand.')}</div>
          <div class="tooltip-stats" style="margin-top: 0.4rem; font-size: 0.8rem;">
            ${Object.entries(previewItem.stats || {}).map(([stat, val]) => html`
              <div class="tooltip-stat" style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 2px;">
                <span class="text-muted">${
                  stat === 'attack' ? (lang === 'de' ? '⚔️ Stärke' : '⚔️ Attack') :
                  stat === 'defense' ? (lang === 'de' ? '🛡️ Zähigkeit' : '🛡️ Toughness') :
                  stat === 'agility' ? (lang === 'de' ? '⚡ Geschick' : '⚡ Agility') :
                  (lang === 'de' ? '❤️ Vitalität' : '❤️ Vitality')
                }:</span>
                <span class="text-highlight text-bold" style="color: var(--color-gold);">+${val}</span>
              </div>
            `)}
          </div>
          ${previewItem.sockets && previewItem.sockets.length > 0 ? html`
            <div class="tooltip-sockets" style="margin-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem; text-align: left;">
              <div class="text-xs text-muted mb-1" style="font-size: 0.68rem; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.4);">${lang === 'de' ? 'Katalysatorsockel:' : 'Catalyst Sockets:'}</div>
              <div style="display: flex; flex-direction: column; gap: 3px;">
                ${previewItem.sockets.map((sock, sIdx) => html`
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: ${sock ? sock.color : '#888'};">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${sock ? sock.color : 'transparent'}; border: 1px solid ${sock ? sock.color : '#666'}; box-shadow: ${sock ? '0 0 4px ' + sock.color : 'none'};"></span>
                    <span>
                      ${lang === 'de' ? `Sockel ${sIdx + 1}:` : `Socket ${sIdx + 1}:`} ${
                        sock ? `${lang === 'de' ? sock.title : sock.title_en || sock.title} (+5 ${
                          sock.id === 'attack' ? (lang === 'de' ? 'Angriff' : 'Attack') :
                          sock.id === 'defense' ? (lang === 'de' ? 'Zähigkeit' : 'Defense') :
                          sock.id === 'agility' ? (lang === 'de' ? 'Geschick' : 'Agility') :
                          (lang === 'de' ? 'Vitalität' : 'Vitality')
                        })` : (lang === 'de' ? 'Leerer Sockel' : 'Empty Socket')
                      }
                    </span>
                  </div>
                `)}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${socketingItem && html`
        <${SocketingModal}
          socketingItem=${socketingItem}
          catalystCount=${resources.catalyst}
          onClose=${() => setSocketingItem(null)}
          onConfirmSocket=${(catalystId, emptySocketIdx) => {
            const res = services.forgeService.socketCatalyst(
              socketingItem.isEquipped,
              socketingItem.isEquipped ? socketingItem.slot : socketingItem.idx,
              emptySocketIdx,
              catalystId
            );
            if (res.success) {
              setSocketingItem(null);
            }
          }}
          translateItemName=${translateItemName}
          getRarityLabel=${getRarityLabel}
          lang=${lang}
        />
      `}

      <!-- Finstre Pakte Modal Overlay -->
      <${PactSelectionModal}
        isOpen=${pactSelectionActive}
        pactChoices=${pactChoices}
        onSelectPact=${handleSelectPact}
        onClose=${() => setPactSelectionActive(false)}
        lang=${lang}
      />

      ${isSkillTreeOpen && html`
        <${SkillTreeModal}
          talentService=${services?.talentService}
          eventBus=${eventBus}
          services=${services}
          onClose=${() => setIsSkillTreeOpen(false)}
        />
      `}
    </div>
  `;
}

export default HeroUI;