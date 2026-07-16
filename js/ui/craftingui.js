// --- START OF FILE ui/craftingui.js ---

import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js';
import BaseModalUI from './basemodal.js';

export default class CraftingUI extends BaseModalUI {
    constructor(context) {
        // Wir verwenden ein eigenes Overlay oder erweitern die Schmiede? Ich erstelle ein eigenes Modal.
        super('crafting-overlay', 'crafting-close');
        this.eventBus = context.eventBus;
        this.craftingManager = context.craftingManager;
        this.resourceManager = context.resourceManager;
        this.hero = context.hero;

        this.recipesContainer = document.getElementById('crafting-recipes');
        this.resourcesContainer = document.getElementById('crafting-resources');
        this.skillContainer = document.getElementById('crafting-skill');
        this.resultContainer = document.getElementById('crafting-result');

        // Event: UI öffnen (über Hub-Button)
        this.eventBus.subscribe(EVENTS.UI_OPEN_CRAFTING, () => this.open());
        this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => {
            if (this.isOpen) {
                this._renderResources();
                this._updateRecipeButtons();
            }
        });
        this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
            if (this.isOpen) {
                this._renderSkill();
                this._renderRecipes();
            }
        });
    }

    onOpen() {
        this.resultContainer.textContent = '';
        this._renderResources();
        this._renderSkill();
        this._renderRecipes();
    }

    _renderResources() {
        const res = this.resourceManager.getResources();
        this.resourcesContainer.innerHTML = `
      <div class="resource-grid" style="display: grid; grid-template-columns: repeat(4,1fr); gap: 0.5rem; text-align: center;">
        <div><span class="text-muted">Partikel</span><br><span class="text-gold">${formatNumber(res.particles)}</span></div>
        <div><span class="text-muted">Relikte</span><br><span class="text-gold">${formatNumber(res.relics)}</span></div>
        <div><span class="text-muted">Artefakte</span><br><span class="text-gold">${formatNumber(res.artifacts)}</span></div>
        <div><span class="text-muted">Staub</span><br><span class="text-dust">${formatNumber(res.memoryDust)}</span></div>
        <div><span class="text-muted">Katalysator</span><br><span class="text-highlight">${formatNumber(res.catalyst)}</span></div>
        <div><span class="text-muted">Essenz</span><br><span class="text-success">${formatNumber(res.essence)}</span></div>
      </div>
    `;
    }

    _renderSkill() {
        const lvl = this.craftingManager.craftingLevel;
        const exp = this.craftingManager.craftingExp;
        const max = this.craftingManager.craftingExpToNext;
        const progress = Math.min(100, (exp / max) * 100);
        this.skillContainer.innerHTML = `
      <div class="flex-between">
        <span class="text-muted">Handwerks-Skill:</span>
        <span class="text-gold text-bold">Stufe ${lvl}</span>
      </div>
      <div class="progress-bar-container" style="margin-top: 0.3rem;">
        <div class="progress-bar-fill" style="width: ${progress}%;"></div>
        <div class="progress-text">${Math.floor(progress)}%</div>
      </div>
    `;
    }

    _renderRecipes() {
        const recipes = this.craftingManager.getAvailableRecipes();
        this.recipesContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.className = 'ui-card craft-recipe-card';
            const cost = this.craftingManager.getRecipeCost(recipe);
            let costStr = [];
            for (const [res, amount] of Object.entries(cost)) {
                costStr.push(`${formatNumber(amount)} ${res}`);
            }

            div.innerHTML = `
        <div>
          <div class="ui-card-title">${recipe.name}</div>
          <div class="ui-card-desc">${recipe.desc}</div>
          <div class="ui-card-meta text-muted">Kosten: ${costStr.join(' | ')}</div>
          ${recipe.unlockBoss ? `<div class="ui-card-meta text-sm text-muted">🔓 Freischaltung: Boss ${recipe.unlockBoss}</div>` : ''}
        </div>
        <button class="ui-btn ui-btn-gold craft-btn" data-id="${recipe.id}">Herstellen</button>
      `;

            const btn = div.querySelector('.craft-btn');
            btn.addEventListener('click', () => {
                const result = this.craftingManager.craftMasterRecipe(recipe.id);
                if (result.success) {
                    this.resultContainer.innerHTML = `<span style="color: var(--color-gold);">${result.message}</span>`;
                    // Optional: Item im Inventar anzeigen?
                } else {
                    this.resultContainer.innerHTML = `<span class="text-danger">${result.message}</span>`;
                }
                this._updateRecipeButtons();
            });

            fragment.appendChild(div);
        });

        this.recipesContainer.appendChild(fragment);
        this._updateRecipeButtons();
    }

    _updateRecipeButtons() {
        const res = this.resourceManager.getResources();
        const buttons = this.recipesContainer.querySelectorAll('.craft-btn');
        buttons.forEach(btn => {
            const recipe = this.craftingManager.getAvailableRecipes().find(r => r.id === btn.dataset.id);
            if (!recipe) return;
            const cost = this.craftingManager.getRecipeCost(recipe);
            let canAfford = true;
            for (const [key, amount] of Object.entries(cost)) {
                if ((res[key] || 0) < amount) { canAfford = false; break; }
            }
            btn.disabled = !canAfford;
        });
    }
}