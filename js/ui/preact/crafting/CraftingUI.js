/**
 * ============================================================
 * FILE: ui/preact/crafting/CraftingUI.js – Meisterwerkstatt (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function CraftingUI({ stateManager, eventBus, services }) {
  const { craftingService, resourceService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState('');

  const resources = useStateSelector(stateManager, (state) => state.resources);
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const crafting = useStateSelector(stateManager, (state) => state.crafting);
  const recipes = craftingService.getAvailableRecipes();

  useEventBus(eventBus, EVENTS.UI_OPEN_CRAFTING, () => setIsOpen(true));

  if (!isOpen) return null;

  const handleCraft = (recipeId) => {
    const res = craftingService.craftMasterRecipe(recipeId);
    if (res.success) {
      setResult(`✅ ${res.message}`);
      setTimeout(() => setResult(''), 3000);
    } else {
      setResult(`❌ ${res.message}`);
      setTimeout(() => setResult(''), 3000);
    }
  };

  const progress = Math.min(100, (crafting.exp / crafting.expToNext) * 100);

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content-wide glass-panel" onClick=${(e) => e.stopPropagation()} style="max-width: 900px;">
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="glow-text text-gold cinzel text-center">Meisterwerkstatt</h2>
        <p class="text-muted text-sm text-center mb-1">Hier schmiedest du die mächtigsten Artefakte.</p>

        <div class="crafting-resource-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem; margin-bottom: 1rem;">
          <div class="resource-chip"><span class="text-muted text-sm">Partikel</span><span class="text-gold text-bold">${resources.particles}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Relikte</span><span class="text-gold text-bold">${resources.relics}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Artefakte</span><span class="text-gold text-bold">${resources.artifacts}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Staub</span><span class="text-dust text-bold">${resources.memoryDust}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Katalysator</span><span class="text-highlight text-bold">${resources.catalyst}</span></div>
          <div class="resource-chip"><span class="text-muted text-sm">Essenz</span><span class="text-success text-bold">${resources.essence}</span></div>
        </div>

        <div class="crafting-skill-panel glass-inner-panel" style="padding: 0.8rem 1.2rem; margin-bottom: 1rem; border-left: 3px solid var(--color-dust);">
          <div class="crafting-skill-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
            <span class="text-muted">🛠️ Handwerks-Skill:</span>
            <span class="text-gold text-bold cinzel">Stufe ${crafting.level}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
            <div class="progress-text">${Math.floor(progress)}%</div>
          </div>
        </div>

        <div class="modal-scroll-area" style="max-height: 40vh; overflow-y: auto;">
          ${recipes.map(recipe => {
            const cost = craftingService.getRecipeCost(recipe);
            const canAfford = Object.entries(cost).every(([key, amt]) => (resources[key] || 0) >= amt);
            const isUnlocked = (crafting.unlockedRecipes || []).includes(recipe.id) || recipe.id === 'catalyst_from_essence';
            return html`
              <div class="crafting-recipe-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; border-left: 3px solid ${isUnlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'}; opacity: ${isUnlocked ? 1 : 0.5};">
                <div class="crafting-recipe-info">
                  <div class="crafting-recipe-name">${recipe.name}</div>
                  <div class="crafting-recipe-desc">${recipe.desc}</div>
                  <div class="crafting-recipe-cost">Kosten: ${Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' | ')}</div>
                  ${recipe.unlockBoss ? html`<div class="crafting-recipe-unlock">🔓 Freischaltung: Boss ${recipe.unlockBoss}</div>` : ''}
                </div>
                <button class="glass-btn primary btn-small craft-btn" onClick=${() => handleCraft(recipe.id)} disabled=${!canAfford || !isUnlocked}>
                  Herstellen
                </button>
              </div>
            `;
          })}
        </div>

        ${result ? html`<div class="crafting-result mt-1 text-center text-bold">${result}</div>` : ''}
      </div>
    </div>
  `;
}