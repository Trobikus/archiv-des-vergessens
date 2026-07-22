/**
 * ============================================================
 * FILE: ui/preact/forge/ForgeUI.js – Master Forge (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { Item } from '../../../models/item.js';
import { GEMS, ENCHANTMENTS } from '../../../data/gems_enchants.js';

export function ForgeUI({ stateManager, eventBus, services }) {
  const { forgeService, resourceService, heroService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('crafting'); // 'crafting', 'sockets', 'enchant'
  const [result, setResult] = useState('');

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
        <h2 class="glow-text text-gold cinzel text-center">Artefakt-Schmiede</h2>
        <p class="text-center text-muted mb-1">Schmiede, sockele Edelsteine und verzaubere deine Ausrüstung</p>

        <!-- Tab Navigation -->
        <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 1rem;">
          <button
            class=${`glass-btn ${activeTab === 'crafting' ? 'primary' : ''}`}
            onClick=${() => setActiveTab('crafting')}
          >
            ⚒️ Meisterschmiede
          </button>
          <button
            class=${`glass-btn ${activeTab === 'sockets' ? 'primary' : ''}`}
            onClick=${() => setActiveTab('sockets')}
          >
            💎 Edelsteine Sockeln
          </button>
          <button
            class=${`glass-btn ${activeTab === 'enchant' ? 'primary' : ''}`}
            onClick=${() => setActiveTab('enchant')}
          >
            📜 Verzauberung
          </button>
        </div>

        <!-- Resource Overview Bar -->
        <div class="forge-resource-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.8rem; margin-bottom: 1.2rem;">
          <div class="resource-chip"><span class="text-muted text-sm">Partikel</span><span class="text-gold text-bold">${resources.particles}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Relikte</span><span class="text-gold text-bold">${resources.relics}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Artefakte</span><span class="text-gold text-bold">${resources.artifacts}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Staub</span><span class="text-dust text-bold">${resources.memoryDust}</span></div>
        </div>

        <!-- Tab 1: Crafting & Upgrading -->
        ${activeTab === 'crafting' && html`
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="forge-column glass-inner-panel">
              <h3 class="options-header text-center">Rezepte</h3>
              <div class="modal-scroll-area" style="max-height: 280px; overflow-y: auto;">
                ${recipes.map(recipe => {
                  const cost = forgeService.getRecipeCost(recipe);
                  const canAfford = Object.entries(cost).every(([key, amt]) => (resources[key] || 0) >= amt);
                  const isUnlocked = !recipe.unlockLevel || hero.prestige.level >= recipe.unlockLevel;
                  return html`
                    <div class="forge-recipe-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; border-left: 3px solid ${isUnlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'}; opacity: ${isUnlocked ? 1 : 0.5};">
                      <div class="forge-recipe-info">
                        <div class="forge-recipe-name">${recipe.name}</div>
                        <div class="forge-recipe-desc">${recipe.desc}</div>
                        <div class="forge-recipe-cost">Kosten: ${Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' | ')}</div>
                      </div>
                      <button class="glass-btn primary btn-small forge-craft-btn" onClick=${() => handleCraft(recipe.id)} disabled=${!canAfford || !isUnlocked}>
                        ⚒️ Schmieden
                      </button>
                    </div>
                  `;
                })}
              </div>
            </div>

            <div class="forge-column glass-inner-panel">
              <h3 class="options-header text-center" style="color: var(--color-blue);">Ausrüstung Aufwerten</h3>
              <div class="modal-scroll-area" style="max-height: 280px; overflow-y: auto;">
                ${Object.entries(hero.equipment).filter(([slot, item]) => item !== null).map(([slot, itemData]) => {
                  const item = Item.fromJSON(itemData);
                  const cost = item.level * 10 * (item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 3 : item.rarity === 'rare' ? 2 : 1);
                  const canAfford = resources.memoryDust >= cost && item.level < 10;
                  return html`
                    <div class="forge-upgrade-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1.2rem; margin-bottom: 0.5rem; border-left: 3px solid ${rarityColors[item.rarity]};">
                      <div class="forge-upgrade-info">
                        <div class="forge-upgrade-name" style="color: ${rarityColors[item.rarity]};">${item.name} <span class="text-muted text-sm">(Lv. ${item.level})</span></div>
                        <div class="forge-upgrade-cost">${item.level < 10 ? `Kosten: <span class="text-dust">${cost} Staub</span>` : 'Maximales Level erreicht'}</div>
                      </div>
                      <button class="glass-btn btn-small" onClick=${() => handleUpgrade(slot)} disabled=${!canAfford || item.level >= 10}>⬆ Aufwerten</button>
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
            <h3 class="options-header text-center" style="color: #00e5ff;">💎 Edelsteine Sockeln</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-height: 280px; overflow-y: auto;">
              ${Object.entries(hero.equipment).filter(([slot, item]) => item !== null).map(([slot, itemData]) => {
                const item = Item.fromJSON(itemData);
                const sockets = item.sockets || [];
                return html`
                  <div class="glass-inner-panel" style="padding: 1rem; border-left: 3px solid ${rarityColors[item.rarity]};">
                    <div style="font-weight: bold; color: ${rarityColors[item.rarity]}; mb-1">${item.name}</div>
                    <div style="font-size: 0.85rem; color: #8a9bb0; margin-bottom: 8px;">Sockelplätze (${sockets.length}):</div>
                    ${sockets.length === 0 ? html`<div style="font-size: 0.8rem; color: #6a7a8a;">Dieser Gegenstand hat keine Sockelplätze.</div>` : ''}
                    ${sockets.map((s, idx) => html`
                      <div style="display: flex; alignItems: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px;">
                        <span>${s ? `${s.icon} ${s.title}` : '⚪ Leerer Sockel'}</span>
                        ${!s && html`
                          <select
                            style="background: #101728; color: #ffd700; border: 1px solid #3a4a5e; border-radius: 4px; padding: 2px 6px;"
                            onChange=${(e) => handleSocketGem(slot, idx, e.target.value)}
                          >
                            <option value="">Wähle Edelstein...</option>
                            ${Object.values(GEMS).map(g => html`<option value=${g.id}>${g.icon} ${g.name}</option>`)}
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
            <h3 class="options-header text-center" style="color: #ffaa00;">📜 Verzauberungen</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-height: 280px; overflow-y: auto;">
              ${Object.entries(hero.equipment).filter(([slot, item]) => item !== null).map(([slot, itemData]) => {
                const item = Item.fromJSON(itemData);
                return html`
                  <div class="glass-inner-panel" style="padding: 1rem; border-left: 3px solid ${rarityColors[item.rarity]};">
                    <div style="font-weight: bold; color: ${rarityColors[item.rarity]};">${item.name}</div>
                    <div style="font-size: 0.85rem; color: #8a9bb0; margin: 4px 0 8px 0;">
                      Verzauberung: <strong style="color: #00e5ff;">${item.enchantment ? item.enchantment.name : 'Keine'}</strong>
                    </div>
                    <select
                      style="width: 100%; background: #101728; color: #ffd700; border: 1px solid #3a4a5e; border-radius: 4px; padding: 6px;"
                      onChange=${(e) => {
                        if (e.target.value) handleEnchant(slot, e.target.value);
                      }}
                    >
                      <option value="">Schriftrolle anwenden...</option>
                      ${Object.values(ENCHANTMENTS).map(e => html`<option value=${e.id}>${e.icon} ${e.name} (${e.description})</option>`)}
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