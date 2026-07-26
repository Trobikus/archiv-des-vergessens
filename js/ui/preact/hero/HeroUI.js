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

import { h, html, useState, useCallback, useMemo, useEventBus } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
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
import { useHeroState } from './useHeroState.js';
import { ItemTooltip } from './ItemTooltip.js';

/**
 * Helden-UI – Hauptkomponente.
 */
export function HeroUI({ stateManager, eventBus, services }) {
  const { heroService, resourceService, forgeService, i18nService } = services;
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
  useEventBus(eventBus, 'i18n:languageChanged', setLang);

  const { getLocText, translateItemName, translateItemDescription, getRarityLabel, getItemIcon } = useItemDisplay(lang);
  const { hero, attributes, combatStats, levelProgress, resources } = useHeroState(stateManager);

  const matchingLootCount = useMemo(() => {
    const items = hero?.inventory?.loot || [];
    const targetRank = { common: 0, uncommon: 1, rare: 2, epic: 3, all: 4 }[bulkRarity] ?? 0;
    const rarityRanks = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    return items.filter(item => bulkRarity === 'all' || (rarityRanks[item.rarity] ?? 0) <= targetRank).length;
  }, [hero?.inventory?.loot, bulkRarity]);

  // Events abonnieren
  useEventBus(eventBus, EVENTS.UI_OPEN_HERO, () => setIsOpen(true));
  useEventBus(eventBus, 'ui:closeAllModals', () => setIsOpen(false));
  useEventBus(eventBus, EVENTS.HERO_UPDATED, () => {});

  if (!isOpen) return null;

  const rarityColors = { common: '#aaa', uncommon: '#5a9a5a', rare: '#4a7aaa', epic: '#9a4aaa', legendary: '#d4af37' };

  const handleSpendStat = (statKey) => { if (heroService?.spendStatPoint) heroService.spendStatPoint(statKey); };

  const handlePrestige = async () => {
    if (!hero) return;
    if (hero.prestige?.bossProgress < 20) {
      eventBus.publish('ui:showToast', { message: lang === 'de' ? '⚔️ Verewigung erst nach dem letzten Boss möglich.' : '⚔️ Eternalization only possible after the last Boss.', type: 'warning', duration: 3000 });
      return;
    }
    const confirmMsg = lang === 'de' ? 'Möchtest du deinen Helden verewigen? Alle Fortschritte außer Prestige-Level werden zurückgesetzt. Du kannst danach einen Finstren Pakt wählen.' : 'Do you want to eternalize your hero? All progress except Prestige Level will be reset. You can then choose a Dark Pact.';
    if (await window.gameConfirm(confirmMsg, lang === 'de' ? 'VEREWIGUNG' : 'ETERNALIZATION')) {
      setPactChoices([...Object.values(PACTS)].sort(() => 0.5 - Math.random()).slice(0, 3));
      setPactSelectionActive(true);
    }
  };

  const handleSelectPact = (pactId) => {
    if (heroService?.performPrestige) heroService.performPrestige(resourceService, services?.clanService, pactId);
    setPactSelectionActive(false);
  };

  const handleEquipItem = (itemData, idx) => {
    if (!hero || !stateManager) return;
    stateManager.dispatch((state) => {
      if (!state?.hero) return state;
      let targetIdx = idx;
      const invItem = state.hero.inventory.equipment[targetIdx];
      if (!invItem || invItem.name !== itemData.name || invItem.slot !== itemData.slot) {
        targetIdx = state.hero.inventory.equipment.findIndex(i => i.name === itemData.name && i.slot === itemData.slot && i.level === itemData.level && i.rarity === itemData.rarity);
        if (targetIdx === -1) return state;
      }
      let newEquipInventory = state.hero.inventory.equipment.filter((_, i) => i !== targetIdx);
      const oldItem = state.hero.equipment[itemData.slot];
      if (oldItem) newEquipInventory = [...newEquipInventory, oldItem];
      return { ...state, hero: { ...state.hero, inventory: { ...state.hero.inventory, equipment: newEquipInventory }, equipment: { ...state.hero.equipment, [itemData.slot]: itemData } } };
    }, 'hero/equipItem');
    setPreviewItem(null);
    eventBus.publish(EVENTS.HERO_UPDATED);
  };

  const handleSalvageItem = async (itemData, idx, isLoot = false) => {
    if (!(await window.gameConfirm(lang === 'de' ? 'Gegenstand wirklich zerlegen?' : 'Really salvage item?'))) return;
    if (!forgeService?.salvageItem) return;
    const inventory = isLoot ? hero?.inventory?.loot : hero?.inventory?.equipment;
    if (!inventory) return;
    let targetIdx = idx;
    const currentItem = inventory[targetIdx];
    if (!currentItem || currentItem.name !== itemData.name) {
      targetIdx = inventory.findIndex(i => i.name === itemData.name && (isLoot ? i.rarity === itemData.rarity : i.slot === itemData.slot && i.level === itemData.level));
      if (targetIdx === -1) return;
    }
    const result = forgeService.salvageItem(targetIdx, isLoot);
    if (result?.success) eventBus.publish('ui:showToast', { message: lang === 'de' ? result.message : result.message.replace('zerlegt', 'salvaged').replace('Erhalten:', 'Received:'), type: 'success', duration: 2000 });
  };

  const handleSellLoot = (itemData, idx) => {
    if (!hero || !resourceService) return;
    const inventory = hero.inventory?.loot;
    if (!inventory) return;
    let targetIdx = idx;
    const currentItem = inventory[targetIdx];
    if (!currentItem || currentItem.name !== itemData.name) {
      targetIdx = inventory.findIndex(i => i.name === itemData.name && i.rarity === itemData.rarity);
      if (targetIdx === -1) return;
    }
    const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[itemData.rarity] || 0);
    resourceService.addParticles(value);
    stateManager.dispatch((state) => {
      if (!state?.hero) return state;
      return { ...state, hero: { ...state.hero, inventory: { ...state.hero.inventory, loot: state.hero.inventory.loot.filter((_, i) => i !== targetIdx) } } };
    }, 'hero/sellLoot');
    eventBus.publish('ui:showToast', { message: lang === 'de' ? `Loot für ${value} Partikel verkauft.` : `Loot sold for ${value} particles.`, type: 'success', duration: 2000 });
  };

  const handleBulkSell = async () => {
    if (!hero || !resourceService || matchingLootCount === 0) return;
    const targetRank = { common: 0, uncommon: 1, rare: 2, epic: 3, all: 4 }[bulkRarity] ?? 0;
    const rarityRanks = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    const itemsToKeep = [], itemsToSell = [];
    (hero.inventory?.loot || []).forEach(item => {
      if (bulkRarity === 'all' || (rarityRanks[item.rarity] ?? 0) <= targetRank) itemsToSell.push(item);
      else itemsToKeep.push(item);
    });
    if (itemsToSell.length === 0) return;
    if (itemsToSell.some(item => ['rare', 'epic', 'legendary'].includes(item.rarity))) {
      const confirmMsg = lang === 'de' ? 'Möchtest du wirklich alle ausgewählten Loot-Gegenstände (einschließlich seltener, epischer oder legendärer) verkaufen?' : 'Do you really want to sell all selected loot items (including rare, epic, or legendary)?';
      if (!(await window.gameConfirm(confirmMsg, lang === 'de' ? 'MASSENVERKAUF' : 'BULK SELL'))) return;
    }
    const totalValue = itemsToSell.reduce((acc, item) => acc + 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0), 0);
    resourceService.addParticles(totalValue);
    stateManager.dispatch((state) => ({ ...state, hero: { ...state.hero, inventory: { ...state.hero.inventory, loot: itemsToKeep } } }), 'hero/bulkSellLoot');
    eventBus.publish(EVENTS.HERO_UPDATED);
    eventBus.publish('ui:showToast', { message: lang === 'de' ? `${itemsToSell.length} Gegenstände für ${totalValue} Partikel verkauft.` : `${itemsToSell.length} items sold for ${totalValue} particles.`, type: 'success', duration: 3000 });
  };

  const switchTab = (tab) => { setActiveTab(tab); setPreviewItem(null); setIsSelectMode(false); setSelectedIndices([]); };
  const toggleSelectMode = () => { setIsSelectMode(!isSelectMode); setSelectedIndices([]); };
  const toggleSelectItem = (idx) => setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  const handleSelectAll = (totalCount) => setSelectedIndices(selectedIndices.length === totalCount ? [] : Array.from({length: totalCount}, (_, i) => i));

  const handleBulkDestroySelected = async (isLoot = false) => {
    if (selectedIndices.length === 0) return;
    const count = selectedIndices.length;
    const confirmMsg = lang === 'de' ? `Möchtest du die ${count} ausgewählten Gegenstände wirklich zerlegen / zerstören?` : `Do you really want to salvage / destroy the ${count} selected items?`;
    if (window.gameConfirm ? !(await window.gameConfirm(confirmMsg, lang === 'de' ? 'MEHRFACHAUSWAHL ZERLEGEN' : 'SALVAGE SELECTED')) : !confirm(confirmMsg)) return;

    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);
    let totalDustGained = 0;
    for (const idx of sortedDesc) {
      if (isLoot) {
        handleSellLoot(hero?.inventory?.loot?.[idx], idx);
      } else {
        const itemData = hero?.inventory?.equipment?.[idx];
        if (itemData && forgeService?.salvageItem) {
          const res = forgeService.salvageItem(idx, false);
          if (res?.success) totalDustGained += ({ common: 1, uncommon: 3, rare: 10, epic: 25, legendary: 100 }[itemData.rarity] || 1) * (itemData.level || 1);
        }
      }
    }
    const toastMsg = isLoot ? (lang === 'de' ? `${count} Loot-Gegenstände verkauft.` : `${count} loot items sold.`) : (lang === 'de' ? `🔥 ${count} Gegenstände zerlegt. Erhalten: +${totalDustGained} Erinnerungsstaub.` : `🔥 ${count} items salvaged. Received: +${totalDustGained} Memory Dust.`);
    eventBus.publish('ui:showToast', { message: toastMsg, type: 'success', duration: 3000 });
    setSelectedIndices([]);
    setIsSelectMode(false);
    eventBus.publish(EVENTS.HERO_UPDATED);
  };

  const handleEquipmentSlotHover = (e, item) => { if (item) { setPreviewItem(item); setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 }); } };
  const handleEquipmentSlotLeave = () => setPreviewItem(null);
  const handleEquipmentSlotClick = (slot, item) => {
    if (item && stateManager) {
      stateManager.dispatch((state) => {
        if (!state?.hero || !state.hero.equipment[slot]) return state;
        return { ...state, hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: null }, inventory: { ...state.hero.inventory, equipment: [...state.hero.inventory.equipment, state.hero.equipment[slot]] } } };
      }, 'hero/unequip');
      setPreviewItem(null);
      eventBus.publish(EVENTS.HERO_UPDATED);
    }
  };

  const handleSetTitle = (newTitle) => {
    if (heroService?.setTitle) heroService.setTitle(newTitle);
    else {
      stateManager.dispatch((state) => ({ ...state, hero: { ...state.hero, title: newTitle } }), 'hero/setTitle');
      eventBus.publish('hero:updated', { title: newTitle });
    }
  };

  const handleConfirmSocket = (catalystId, emptySocketIdx) => {
    const res = forgeService?.socketCatalyst(socketingItem.isEquipped, socketingItem.isEquipped ? socketingItem.slot : socketingItem.idx, emptySocketIdx, catalystId);
    if (res?.success) setSocketingItem(null);
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="hero-modal-wide glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" id="hero-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">${lang === 'de' ? 'Mein Held' : 'My Hero'}</h2>

        <div class="hero-split-layout">
          <${HeroAvatarPanel} hero=${hero} attributes=${attributes} combatStats=${combatStats} levelProgress=${levelProgress} lang=${lang} onEquipmentSlotHover=${handleEquipmentSlotHover} onEquipmentSlotLeave=${handleEquipmentSlotLeave} onEquipmentSlotClick=${handleEquipmentSlotClick} onSpendStatPoint=${handleSpendStat} onSetTitle=${handleSetTitle} getItemIcon=${getItemIcon} />

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
              ${activeTab === 'resources' && html`<${ResourcesTab} resources=${resources} hero=${hero} lang=${lang} onOpenSkillTree=${() => setIsSkillTreeOpen(true)} getLocText=${getLocText} />`}
              ${activeTab === 'equipment' && html`<${EquipmentTab} hero=${hero} lang=${lang} isSelectMode=${isSelectMode} selectedIndices=${selectedIndices} onToggleSelectMode=${toggleSelectMode} onToggleSelectItem=${toggleSelectItem} onSelectAll=${handleSelectAll} onBulkDestroySelected=${() => handleBulkDestroySelected(false)} resources=${resources} setPreviewItem=${setPreviewItem} setTooltipPos=${setTooltipPos} getItemIcon=${getItemIcon} translateItemName=${translateItemName} getRarityLabel=${getRarityLabel} handleEquipItem=${handleEquipItem} handleSalvageItem=${handleSalvageItem} setSocketingItem=${setSocketingItem} rarityColors=${rarityColors} />`}
              ${activeTab === 'loot' && html`<${LootTab} hero=${hero} lang=${lang} isSelectMode=${isSelectMode} selectedIndices=${selectedIndices} onToggleSelectMode=${toggleSelectMode} onToggleSelectItem=${toggleSelectItem} onSelectAll=${handleSelectAll} onBulkDestroySelected=${() => handleBulkDestroySelected(true)} bulkRarity=${bulkRarity} setBulkRarity=${setBulkRarity} matchingLootCount=${matchingLootCount} handleBulkSell=${handleBulkSell} handleSellLoot=${handleSellLoot} handleSalvageItem=${handleSalvageItem} setPreviewItem=${setPreviewItem} setTooltipPos=${setTooltipPos} translateItemName=${translateItemName} getRarityLabel=${getRarityLabel} rarityColors=${rarityColors} />`}
            </div>
          </div>
        </div>

        <div class="hero-modal-footer" style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding-top: 0.8rem; border-top: 1px solid rgba(197,160,89,0.08); flex-shrink: 0; margin-top: 0.3rem;">
          <span class="text-muted text-sm cinzel">MEMENTO MEMORIAE</span>
          <span class="footer-gem">✦</span>
          <span class="text-gold text-sm cinzel">${lang === 'de' ? 'DER MNEME-BUND' : 'THE MNEME COVENANT'}</span>
        </div>
      </div>

      <${ItemTooltip} item=${previewItem} tooltipPos=${tooltipPos} lang=${lang} rarityColors=${rarityColors} translateItemName=${translateItemName} translateItemDescription=${translateItemDescription} />
      ${socketingItem && html`<${SocketingModal} socketingItem=${socketingItem} catalystCount=${resources.catalyst} onClose=${() => setSocketingItem(null)} onConfirmSocket=${handleConfirmSocket} translateItemName=${translateItemName} getRarityLabel=${getRarityLabel} lang=${lang} />`}
      <${PactSelectionModal} isOpen=${pactSelectionActive} pactChoices=${pactChoices} onSelectPact=${handleSelectPact} onClose=${() => setPactSelectionActive(false)} lang=${lang} />
      ${isSkillTreeOpen && html`<${SkillTreeModal} talentService=${services?.talentService} eventBus=${eventBus} services=${services} onClose=${() => setIsSkillTreeOpen(false)} />`}
    </div>
  `;
}

export default HeroUI;