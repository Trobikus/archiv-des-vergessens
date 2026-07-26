/**
 * ============================================================
 * FILE: ui/preact/hero/HeroUI.js – Helden-UI (Preact) – v2.0 FINAL
 * ============================================================
 * 
 * Zeigt die Haupt-Modal-Shell, verknüpft State und Handler
 * für den Helden, das Inventar und alle Tabs/Modals.
 * Beinhaltet:
 * - HeroAvatarPanel (Links)
 * - Tabs: ResourcesTab, EquipmentTab, LootTab (Rechts)
 * - Sub-Modals: Socketing, Pact Selection, Skill Tree
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
import { ResourcesTab } from './tabs/ResourcesTab.js';
import { EquipmentTab } from './tabs/EquipmentTab.js';
import { LootTab } from './tabs/LootTab.js';

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

  // Helfer: Seltenheitsfarben
  const rarityColors = {
    common: '#aaa',
    uncommon: '#5a9a5a',
    rare: '#4a7aaa',
    epic: '#9a4aaa',
    legendary: '#d4af37'
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
  // ausgelagert in ResourcesTab, EquipmentTab, LootTab

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

            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; padding-right: 0.3rem; margin-top: 0.3rem;">
              ${activeTab === 'resources' && html`
                <${ResourcesTab}
                  resources=${resources}
                  hero=${hero}
                  lang=${lang}
                  onOpenSkillTree=${() => setIsSkillTreeOpen(true)}
                  getLocText=${getLocText}
                />
              `}
              ${activeTab === 'equipment' && html`
                <${EquipmentTab}
                  hero=${hero}
                  lang=${lang}
                  isSelectMode=${isSelectMode}
                  selectedIndices=${selectedIndices}
                  onToggleSelectMode=${toggleSelectMode}
                  onToggleSelectItem=${toggleSelectItem}
                  onSelectAll=${handleSelectAll}
                  onBulkDestroySelected=${() => handleBulkDestroySelected(false)}
                  resources=${resources}
                  setPreviewItem=${setPreviewItem}
                  setTooltipPos=${setTooltipPos}
                  getItemIcon=${getItemIcon}
                  translateItemName=${translateItemName}
                  getRarityLabel=${getRarityLabel}
                  handleEquipItem=${handleEquipItem}
                  handleSalvageItem=${handleSalvageItem}
                  setSocketingItem=${setSocketingItem}
                  rarityColors=${rarityColors}
                />
              `}
              ${activeTab === 'loot' && html`
                <${LootTab}
                  hero=${hero}
                  lang=${lang}
                  isSelectMode=${isSelectMode}
                  selectedIndices=${selectedIndices}
                  onToggleSelectMode=${toggleSelectMode}
                  onToggleSelectItem=${toggleSelectItem}
                  onSelectAll=${handleSelectAll}
                  onBulkDestroySelected=${() => handleBulkDestroySelected(true)}
                  bulkRarity=${bulkRarity}
                  setBulkRarity=${setBulkRarity}
                  matchingLootCount=${matchingLootCount}
                  handleBulkSell=${handleBulkSell}
                  handleSellLoot=${handleSellLoot}
                  handleSalvageItem=${handleSalvageItem}
                  setPreviewItem=${setPreviewItem}
                  setTooltipPos=${setTooltipPos}
                  translateItemName=${translateItemName}
                  getRarityLabel=${getRarityLabel}
                  rarityColors=${rarityColors}
                />
              `}
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