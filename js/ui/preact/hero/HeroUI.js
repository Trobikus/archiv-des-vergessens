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

  const getLocText = (obj, prop = 'text') => {
    if (!obj) return '';
    if (lang === 'en' && obj[prop + '_en']) {
      return obj[prop + '_en'];
    }
    return obj[prop] || '';
  };

  const translateItemName = (name) => {
    if (!name) return '';
    if (lang !== 'en') return name;
    const dict = {
      'Schattenklinge': 'Shadow Blade',
      'Abgrundplatte': 'Abyss Plate',
      'Amulett der Namenlosen': 'Amulet of the Nameless',
      'Ring der Leere': 'Ring of the Void',
      'Archiv-Klinge': 'Archive Blade',
      'Chronisten-Robe': 'Chronicle Robe',
      'Mneme-Amulett': 'Mneme Amulet',
      'Ring der Erinnerung': 'Ring of Memory',
      'Klinge der Ersten': 'Blade of the First',
      'Ur-Rüstung': 'Ancient Armor',
      'Amulett der Ewigkeit': 'Amulet of Eternity',
      'Ring der Unendlichkeit': 'Ring of Infinity',
      'Gott-Klinge': 'God Blade',
      'Gott-Rüstung': 'God Armor',
      'Mneme-Krone': 'Mneme Crown',
      'Mneme-Krone der Wiederkehr': 'Mneme Crown of Return',
      'Ring der Wiedergeburt': 'Ring of Rebirth',
      'Amulett der Dämmerung': 'Amulet of Dawn',
      'Amulett der Dämmerung ': 'Amulet of Dawn',
      'Staubige Klinge': 'Dusty Blade',
      'Architekten-Klinge': 'Architect Blade',
      'Grundlegende Klinge': 'Basic Blade',
      'Stahlklinge': 'Steel Blade',
      'Dämonenklinge': 'Demon Blade',
      'Göttliche Klinge': 'Divine Blade',
      'Schicksalsklinge der Raids': 'Fate Blade of Raids',
      'Schmuck-Katalysator': 'Jewelry Catalyst',
      'Katalysator': 'Catalyst',
      'Erinnerungssplitter': 'Memory Shard'
    };
    return dict[name.trim()] || name;
  };

  const translateItemDescription = (desc) => {
    if (!desc) return '';
    if (lang !== 'en') return desc;
    let res = desc;
    res = res.replace('Ein Werk der Artefakt-Schmiede.', 'A work of the Artifact Forge.');
    res = res.replace('Gewonnen aus einem heroischen Clan-Raid.', 'Won from a heroic Clan Raid.');
    res = res.replace('Meisterwerk-Qualität:', 'Masterwork Quality:');
    res = res.replace('Ein Ausrüstungsgegenstand.', 'An equipment item.');
    return res;
  };

  const getRarityLabel = (rarity) => {
    if (lang === 'en') {
      return {
        common: 'Common',
        uncommon: 'Uncommon',
        rare: 'Rare',
        epic: 'Epic',
        legendary: 'Legendary'
      }[rarity] || rarity;
    }
    return {
      common: 'Gewöhnlich',
      uncommon: 'Ungewöhnlich',
      rare: 'Selten',
      epic: 'Episch',
      legendary: 'Legendär'
    }[rarity] || rarity;
  };

  const getSlotLabel = (slot) => {
    if (lang === 'en') {
      return {
        weapon: 'Weapon',
        shield: 'Shield',
        helmet: 'Helmet',
        shoulders: 'Shoulders',
        armor: 'Armor',
        gloves: 'Gloves',
        belt: 'Belt',
        boots: 'Boots',
        amulet: 'Amulet',
        ring: 'Ring (left)',
        ring2: 'Ring (right)'
      }[slot] || slot;
    }
    return {
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
    }[slot] || slot;
  };

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
          ${canSpend ? html`<button class="btn-stat-add" onClick=${() => handleSpendStat(key)}>+</button>` : ''}
        </div>
      `;
    });
  };

  // Rendering: Kampfstats
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
              ${renderEquipmentSlots()}
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

      ${socketingItem ? html`
        <div class="modal-overlay" style="display: flex; z-index: 11000;" onClick=${() => setSocketingItem(null)}>
          <div class="modal-content glass-panel" style="max-width: 440px; text-align: center; padding: 1.5rem; border: 1px solid rgba(197,160,89,0.25);" onClick=${(e) => e.stopPropagation()}>
            <button class="modal-close" onClick=${() => setSocketingItem(null)}>×</button>
            <h3 class="modal-title glow-text cinzel" style="font-size: 1.3rem; margin-bottom: 0.3rem;">💎 ${lang === 'de' ? 'Katalysatorsockel' : 'Catalyst Sockets'}</h3>
            <p class="text-muted text-sm mb-1" style="font-size: 0.8rem; line-height: 1.3; color: #bbb;">${lang === 'de' ? 'Wähle eine Katalysator-Rune, um sie in den nächsten freien Sockel dieses Gegenstandes einzusetzen.' : 'Choose a catalyst rune to insert into the next free socket of this item.'}</p>

            <div class="glass-inner-panel mb-1" style="padding: 0.8rem; border-color: ${rarityColors[socketingItem.item.rarity] || 'var(--color-gold)'}; background: rgba(0,0,0,0.3); margin: 0.8rem 0;">
              <div class="text-bold cinzel" style="color: ${rarityColors[socketingItem.item.rarity] || 'var(--color-gold)'}; font-size: 1.1rem; text-shadow: 0 0 5px rgba(255,255,255,0.05);">
                ${translateItemName(socketingItem.item.name)}
              </div>
              <div class="text-muted text-xs" style="font-size: 0.72rem; margin-top: 2px;">Lv.${socketingItem.item.level} (${getRarityLabel(socketingItem.item.rarity)})</div>
              
              <!-- Sockets state -->
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
              ${lang === 'de' ? 'Verfügbare Katalysatoren:' : 'Available Catalysts:'} <span class="text-highlight" style="font-size: 1rem; color: var(--color-gold);">${resources.catalyst || 0}</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
              ${[
                { id: 'attack', title: lang === 'de' ? 'Rubin der Glut' : 'Ruby of Embers', bonus: lang === 'de' ? '+5 Angriff' : '+5 Attack', desc: lang === 'de' ? 'Fügt dem Gegenstand Angriffskraft hinzu' : 'Adds attack power to the item', color: '#ff4d4d', icon: '⚔️' },
                { id: 'defense', title: lang === 'de' ? 'Saphir des Schutzes' : 'Sapphire of Protection', bonus: lang === 'de' ? '+5 Zähigkeit' : '+5 Toughness', desc: lang === 'de' ? 'Fügt dem Gegenstand Zähigkeit hinzu' : 'Adds toughness to the item', color: '#4d79ff', icon: '🛡️' },
                { id: 'agility', title: lang === 'de' ? 'Smaragd der Schnelligkeit' : 'Emerald of Swiftness', bonus: lang === 'de' ? '+5 Geschick' : '+5 Agility', desc: lang === 'de' ? 'Fügt dem Gegenstand Geschicklichkeit hinzu' : 'Adds agility to the item', color: '#33cc33', icon: '⚡' },
                { id: 'stamina', title: lang === 'de' ? 'Bernstein des Lebens' : 'Amber of Vitality', bonus: lang === 'de' ? '+5 Vitalität' : '+5 Vitality', desc: lang === 'de' ? 'Fügt dem Gegenstand Vitalität hinzu' : 'Adds vitality to the item', color: '#ffaa00', icon: '❤️' }
              ].map(cat => {
                // Finde den ersten freien Sockel
                const emptySocketIdx = socketingItem.item.sockets?.findIndex(s => s === null);
                const hasCatalyst = BigInt(resources.catalyst || '0') >= BigInt(1);
                const canSocket = emptySocketIdx !== -1 && hasCatalyst;

                const handleConfirmSocket = () => {
                  if (!canSocket) return;
                  const res = services.forgeService.socketCatalyst(
                    socketingItem.isEquipped,
                    socketingItem.isEquipped ? socketingItem.slot : socketingItem.idx,
                    emptySocketIdx,
                    cat.id
                  );
                  if (res.success) {
                    setSocketingItem(null);
                  }
                };

                return html`
                  <button class="glass-btn" 
                          style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.8rem; border-color: rgba(255,255,255,0.08); cursor: ${canSocket ? 'pointer' : 'not-allowed'}; opacity: ${canSocket ? 1 : 0.55}; text-align: left; background: rgba(255,255,255,0.01);"
                          disabled=${!canSocket}
                          onClick=${handleConfirmSocket}>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 1.1rem; color: ${cat.color};">${cat.icon}</span>
                      <div>
                        <div style="color: ${cat.color}; font-weight: bold; font-size: 0.8rem; font-family: var(--font-header);">${cat.title}</div>
                        <div class="text-muted" style="font-size: 0.68rem; line-height: 1.1; color: #999;">${cat.desc}</div>
                      </div>
                    </div>
                    <div class="text-success text-bold" style="font-size: 0.8rem; font-family: var(--font-header); color: #2ecc71;">${cat.bonus}</div>
                  </button>
                `;
              })}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Finstre Pakte Modal Overlay -->
      ${pactSelectionActive ? html`
        <div class="modal-overlay fade-in active" style="z-index: 12000; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
          <div class="glass-panel" style="max-width: 850px; width: 90%; max-height: 90vh; overflow-y: auto; padding: 2rem; border-color: var(--color-gold); background: rgba(10, 8, 5, 0.9); box-shadow: 0 0 40px rgba(212, 175, 55, 0.15); border-radius: 8px; position: relative;">
            
            <h2 class="glow-text text-center text-gold cinzel" style="font-size: 1.8rem; letter-spacing: 2px; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(212, 175, 55, 0.4); text-transform: uppercase;">${lang === 'de' ? '🌀 Finstre Pakte der Verewigung 🌀' : '🌀 Dark Pacts of Eternalization 🌀'}</h2>
            <p class="subtitle text-center" style="color: #ccc; font-size: 0.88rem; line-height: 1.4; max-width: 650px; margin: 0 auto 2rem auto; font-family: var(--font-header);">
              ${lang === 'de'
                ? 'Du stehst an den Grenzen des Archivs des Vergessens. Um den Kreislauf neu zu beginnen und deine Stufe zu erhöhen, musst du einen der drei angebotenen finsteren Pakte schließen. Wähle mit Bedacht – die Entscheidung ist bis zur nächsten Verewigung unumkehrbar.'
                : 'You stand at the threshold of the Archive of the Forgotten. To begin the cycle anew and raise your level, you must seal one of the three dark pacts offered. Choose wisely – this decision is irreversible until the next eternalization.'
              }
            </p>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; margin-bottom: 1.5rem;">
              ${pactChoices.map(pact => html`
                <div class="glass-panel text-center" 
                     style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.2rem; border-color: rgba(212, 175, 55, 0.15); background: rgba(255, 255, 255, 0.01); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 15px rgba(0,0,0,0.3); border-radius: 6px; cursor: pointer; position: relative; overflow: hidden;"
                     onMouseEnter=${(e) => {
                       e.currentTarget.style.borderColor = 'var(--color-gold)';
                       e.currentTarget.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.25)';
                       e.currentTarget.style.transform = 'translateY(-4px)';
                       e.currentTarget.style.background = 'rgba(212, 175, 55, 0.03)';
                     }}
                     onMouseLeave=${(e) => {
                       e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                       e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                       e.currentTarget.style.transform = 'translateY(0)';
                       e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                     }}
                     onClick=${() => handleSelectPact(pact.id)}>
                  
                  <div>
                    <h3 class="text-gold cinzel" style="font-size: 1.1rem; margin-top: 0.2rem; margin-bottom: 0.8rem; font-weight: bold; letter-spacing: 1px;">${getLocText(pact, 'name')}</h3>
                    <div style="width: 40px; height: 1px; background: linear-gradient(90deg, transparent, var(--color-gold), transparent); margin: 0 auto 1rem auto;"></div>
                    <p style="font-size: 0.75rem; color: #aaa; line-height: 1.4; margin-bottom: 1.2rem; min-height: 3.2rem; display: flex; align-items: center; justify-content: center;">
                      „${getLocText(pact, 'desc')}“
                    </p>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 0.8rem; background: rgba(0,0,0,0.4); padding: 0.8rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.03);">
                    <!-- Segen -->
                    <div>
                      <div class="text-success text-bold" style="font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; color: #2ecc71;">${lang === 'de' ? '🌌 Segen (Positiv)' : '🌌 Blessing (Positive)'}</div>
                      <div style="font-size: 0.78rem; font-weight: bold; color: #e5ffe5; line-height: 1.2;">
                        ${getLocText(pact, 'passiveText')}
                      </div>
                    </div>

                    <div style="height: 1px; background: rgba(255,255,255,0.05); margin: 0 auto; width: 60%;"></div>

                    <!-- Fluch -->
                    <div>
                      <div class="text-danger text-bold" style="font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; color: #e74c3c;">${lang === 'de' ? '💀 Fluch (Negativ)' : '💀 Curse (Negative)'}</div>
                      <div style="font-size: 0.78rem; font-weight: bold; color: #ffe5e5; line-height: 1.2;">
                        ${getLocText(pact, 'curseText')}
                      </div>
                    </div>
                  </div>

                  <button class="glass-btn primary cinzel" style="width: 100%; margin-top: 1.2rem; padding: 0.45rem; font-size: 0.75rem; border-color: rgba(212, 175, 55, 0.3); pointer-events: none;">
                    ${lang === 'de' ? 'Pakt besiegeln' : 'Seal Pact'}
                  </button>
                </div>
              `)}
            </div>

            <div class="text-center" style="margin-top: 1.5rem;">
              <button class="glass-btn secondary cinzel" style="font-size: 0.75rem; padding: 0.4rem 1.2rem; border-color: rgba(255,255,255,0.15);" onClick=${() => setPactSelectionActive(false)}>${lang === 'de' ? 'Abbrechen' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      ` : ''}

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