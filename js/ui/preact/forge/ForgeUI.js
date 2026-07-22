/**
 * ============================================================
 * FILE: ui/preact/forge/ForgeUI.js – Master Forge (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { Item } from '../../../models/item.js';
import { GEMS, ENCHANTMENTS } from '../../../data/gems_enchants.js';

export function ForgeUI({ stateManager, eventBus, services }) {
  const { forgeService, resourceService, heroService, i18nService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('crafting'); // 'crafting', 'sockets', 'enchant'
  const [result, setResult] = useState('');

  const [lang, setLang] = useState(i18nService ? i18nService.getLanguage() : 'de');
  useEffect(() => {
    if (eventBus) {
      const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
        setLang(data.language);
      });
      return () => eventBus.unsubscribe(unsub);
    }
  }, [eventBus]);

  const resources = useStateSelector(stateManager, (state) => state.resources);
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const recipes = forgeService.getRecipes();

  useEventBus(eventBus, EVENTS.UI_OPEN_FORGE, () => setIsOpen(true));

  if (!isOpen) return null;

  const handleCraft = (recipeId) => {
    const res = forgeService.craft(recipeId);
    setResult(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
    setTimeout(() => setResult(''), 3000);
  };

  const handleUpgrade = (slot) => {
    const res = forgeService.upgradeEquipped(slot);
    setResult(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
    setTimeout(() => setResult(''), 3000);
  };

  const handleSocketGem = (slot, socketIndex, gemId) => {
    const res = forgeService.socketGem(slot, socketIndex, gemId, true);
    setResult(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
    setTimeout(() => setResult(''), 3000);
  };

  const handleEnchant = (slot, scrollId) => {
    const res = forgeService.enchantItem(slot, scrollId, true);
    setResult(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
    setTimeout(() => setResult(''), 3000);
  };

  const rarityColors = {
    common: '#aaa',
    uncommon: '#5a9a5a',
    rare: '#4a7aaa',
    epic: '#9a4aaa',
    legendary: '#d4af37'
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content-wide glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="glow-text text-gold cinzel text-center">
          ${lang === 'de' ? 'Artefakt-Schmiede' : 'Artifact Forge'}
        </h2>
        <p class="text-center text-muted mb-1">
          ${lang === 'de' ? 'Schmiede, sockele Edelsteine und verzaubere deine Ausrüstung' : 'Craft, socket gems, and enchant your equipment'}
        </p>

        <!-- Tab Navigation -->
        <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 1rem;">
          <button
            class=${`glass-btn ${activeTab === 'crafting' ? 'primary' : ''}`}
            onClick=${() => setActiveTab('crafting')}
          >
            ⚒️ ${lang === 'de' ? 'Meisterschmiede' : 'Master Forge'}
          </button>
          <button
            class=${`glass-btn ${activeTab === 'sockets' ? 'primary' : ''}`}
            onClick=${() => setActiveTab('sockets')}
          >
            💎 ${lang === 'de' ? 'Edelsteine Sockeln' : 'Socket Gems'}
          </button>
          <button
            class=${`glass-btn ${activeTab === 'enchant' ? 'primary' : ''}`}
            onClick=${() => setActiveTab('enchant')}
          >
            📜 ${lang === 'de' ? 'Verzauberung' : 'Enchantment'}
          </button>
        </div>

        <!-- Resource Overview Bar -->
        <div class="forge-resource-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.8rem; margin-bottom: 1.2rem;">
          <div class="resource-chip"><span class="text-muted text-sm">${lang === 'de' ? 'Partikel' : 'Particles'}</span><span class="text-gold text-bold">${resources.particles}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">${lang === 'de' ? 'Relikte' : 'Relics'}</span><span class="text-gold text-bold">${resources.relics}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">${lang === 'de' ? 'Artefakte' : 'Artifacts'}</span><span class="text-gold text-bold">${resources.artifacts}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">${lang === 'de' ? 'Staub' : 'Dust'}</span><span class="text-dust text-bold">${resources.memoryDust}</span></div>
        </div>

        <!-- Tab 1: Crafting & Upgrading -->
        ${activeTab === 'crafting' && html`
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="forge-column glass-inner-panel">
              <h3 class="options-header text-center">${lang === 'de' ? 'Rezepte' : 'Recipes'}</h3>
              <div class="modal-scroll-area" style="max-height: 280px; overflow-y: auto;">
                ${recipes.map(recipe => {
                  const cost = forgeService.getRecipeCost(recipe);
                  const canAfford = Object.entries(cost).every(([key, amt]) => (resources[key] || 0) >= amt);
                  const isUnlocked = !recipe.unlockLevel || hero.prestige.level >= recipe.unlockLevel;
                  const recipeName = lang === 'en' ? (recipe.name_en || recipe.name) : recipe.name;
                  const recipeDesc = lang === 'en' ? (recipe.desc_en || recipe.desc) : recipe.desc;
                  return html`
                    <div class="forge-recipe-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; border-left: 3px solid ${isUnlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'}; opacity: ${isUnlocked ? 1 : 0.5};">
                      <div class="forge-recipe-info">
                        <div class="forge-recipe-name">${recipeName}</div>
                        <div class="forge-recipe-desc">${recipeDesc}</div>
                        <div class="forge-recipe-cost">${lang === 'de' ? 'Kosten:' : 'Cost:'} ${Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' | ')}</div>
                      </div>
                      <button class="glass-btn primary btn-small forge-craft-btn" onClick=${() => handleCraft(recipe.id)} disabled=${!canAfford || !isUnlocked}>
                        ⚒️ ${lang === 'de' ? 'Schmieden' : 'Craft'}
                      </button>
                    </div>
                  `;
                })}
              </div>
            </div>

            <div class="forge-column glass-inner-panel">
              <h3 class="options-header text-center" style="color: var(--color-blue);">${lang === 'de' ? 'Ausrüstung Aufwerten' : 'Upgrade Equipment'}</h3>
              <div class="modal-scroll-area" style="max-height: 280px; overflow-y: auto;">
                ${Object.entries(hero.equipment).filter(([slot, item]) => item !== null).map(([slot, itemData]) => {
                  const item = Item.fromJSON(itemData);
                  const cost = item.level * 10 * (item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 3 : item.rarity === 'rare' ? 2 : 1);
                  const canAfford = resources.memoryDust >= cost && item.level < 10;
                  return html`
                    <div class="forge-upgrade-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1.2rem; margin-bottom: 0.5rem; border-left: 3px solid ${rarityColors[item.rarity]};">
                      <div class="forge-upgrade-info">
                        <div class="forge-upgrade-name" style="color: ${rarityColors[item.rarity]};">${item.name} <span class="text-muted text-sm">(Lv. ${item.level})</span></div>
                        <div class="forge-upgrade-cost">${item.level < 10 ? (lang === 'de' ? `Kosten: <span class="text-dust">${cost} Staub</span>` : `Cost: <span class="text-dust">${cost} Dust</span>`) : (lang === 'de' ? 'Maximales Level erreicht' : 'Max Level Reached')}</div>
                      </div>
                      <button class="glass-btn btn-small" onClick=${() => handleUpgrade(slot)} disabled=${!canAfford || item.level >= 10}>⬆ ${lang === 'de' ? 'Aufwerten' : 'Upgrade'}</button>
                    </div>
                  `;
                })}
              </div>
            </div>
          </div>
        `}

        <!-- Tab 2: Socketing Gems -->
        ${activeTab === 'sockets' && html`
          <div class="glass-inner-panel" style="padding: 1rem;">
            <h3 class="options-header text-center" style="color: #00e5ff;">💎 ${lang === 'de' ? 'Edelsteine Sockeln' : 'Socket Gems'}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-height: 280px; overflow-y: auto;">
              ${Object.entries(hero.equipment).filter(([slot, item]) => item !== null).map(([slot, itemData]) => {
                const item = Item.fromJSON(itemData);
                const sockets = item.sockets || [];
                return html`
                  <div class="glass-inner-panel" style="padding: 1rem; border-left: 3px solid ${rarityColors[item.rarity]};">
                    <div style="font-weight: bold; color: ${rarityColors[item.rarity]}; mb-1">${item.name}</div>
                    <div style="font-size: 0.85rem; color: #8a9bb0; margin-bottom: 8px;">${lang === 'de' ? `Sockelplätze (${sockets.length}):` : `Sockets (${sockets.length}):`}</div>
                    ${sockets.length === 0 ? html`<div style="font-size: 0.8rem; color: #6a7a8a;">${lang === 'de' ? 'Dieser Gegenstand hat keine Sockelplätze.' : 'This item has no sockets.'}</div>` : ''}
                    ${sockets.map((s, idx) => html`
                      <div style="display: flex; alignItems: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px;">
                        <span>${s ? `${s.icon} ${lang === 'de' ? s.title : (s.title_en || s.title)}` : (lang === 'de' ? '⚪ Leerer Sockel' : '⚪ Empty Socket')}</span>
                        ${!s && html`
                          <select
                            style="background: #101728; color: #ffd700; border: 1px solid #3a4a5e; border-radius: 4px; padding: 2px 6px;"
                            onChange=${(e) => handleSocketGem(slot, idx, e.target.value)}
                          >
                            <option value="">${lang === 'de' ? 'Wähle Edelstein...' : 'Select Gem...'}</option>
                            ${Object.values(GEMS).map(g => html`<option value=${g.id}>${g.icon} ${lang === 'de' ? g.name : (g.name_en || g.name)}</option>`)}
                          </select>
                        `}
                      </div>
                    `)}
                  </div>
                `;
              })}
            </div>
          </div>
        `}

        <!-- Tab 3: Enchantments -->
        ${activeTab === 'enchant' && html`
          <div class="glass-inner-panel" style="padding: 1rem;">
            <h3 class="options-header text-center" style="color: #ffaa00;">📜 ${lang === 'de' ? 'Verzauberungen' : 'Enchantments'}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-height: 280px; overflow-y: auto;">
              ${Object.entries(hero.equipment).filter(([slot, item]) => item !== null).map(([slot, itemData]) => {
                const item = Item.fromJSON(itemData);
                return html`
                  <div class="glass-inner-panel" style="padding: 1rem; border-left: 3px solid ${rarityColors[item.rarity]};">
                    <div style="font-weight: bold; color: ${rarityColors[item.rarity]};">${item.name}</div>
                    <div style="font-size: 0.85rem; color: #8a9bb0; margin: 4px 0 8px 0;">
                      ${lang === 'de' ? 'Verzauberung:' : 'Enchantment:'} <strong style="color: #00e5ff;">${item.enchantment ? (lang === 'de' ? item.enchantment.name : (item.enchantment.name_en || item.enchantment.name)) : (lang === 'de' ? 'Keine' : 'None')}</strong>
                    </div>
                    <select
                      style="width: 100%; background: #101728; color: #ffd700; border: 1px solid #3a4a5e; border-radius: 4px; padding: 6px;"
                      onChange=${(e) => {
                        if (e.target.value) handleEnchant(slot, e.target.value);
                      }}
                    >
                      <option value="">${lang === 'de' ? 'Schriftrolle anwenden...' : 'Apply Scroll...'}</option>
                      ${Object.values(ENCHANTMENTS).map(e => html`<option value=${e.id}>${e.icon} ${lang === 'de' ? e.name : (e.name_en || e.name)} (${lang === 'de' ? e.description : (e.description_en || e.description)})</option>`)}
                    </select>
                  </div>
                `;
              })}
            </div>
          </div>
        `}

        ${result ? html`<div class="forge-result mt-1 text-center text-bold">${result}</div>` : ''}
      </div>
    </div>
  `;
}