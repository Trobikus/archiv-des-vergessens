// --- START OF FILE ui/craftingui.js ---

import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js';
import BaseModalUI from './basemodal.js';

export default class CraftingUI extends BaseModalUI {
    constructor(context) {
        super('crafting-overlay', 'crafting-close');
        this.eventBus = context.eventBus;
        this.craftingManager = context.craftingManager;
        this.resourceManager = context.resourceManager;
        this.hero = context.hero;

        this.recipesContainer = document.getElementById('crafting-recipes');
        this.resourcesContainer = document.getElementById('crafting-resources');
        this.skillContainer = document.getElementById('crafting-skill');
        this.resultContainer = document.getElementById('crafting-result');

        this.eventBus.subscribe('ui:openCrafting', () => this.open());
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
            <div class="crafting-resource-grid">
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Partikel</span><span class="text-gold text-bold">${formatNumber(res.particles)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Relikte</span><span class="text-gold text-bold">${formatNumber(res.relics)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Artefakte</span><span class="text-gold text-bold">${formatNumber(res.artifacts)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Staub</span><span class="text-dust text-bold">${formatNumber(res.memoryDust)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Katalysator</span><span class="text-highlight text-bold">${formatNumber(res.catalyst)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Essenz</span><span class="text-success text-bold">${formatNumber(res.essence)}</span></div>
            </div>
        `;
    }

    _renderSkill() {
        const lvl = this.craftingManager.craftingLevel;
        const exp = this.craftingManager.craftingExp;
        const max = this.craftingManager.craftingExpToNext;
        const progress = Math.min(100, (exp / max) * 100);
        this.skillContainer.innerHTML = `
            <div class="glass-inner-panel crafting-skill-panel">
                <div class="crafting-skill-header">
                    <span class="text-muted">🛠️ Handwerks-Skill:</span>
                    <span class="text-gold text-bold cinzel">Stufe ${lvl}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                    <div class="progress-text">${Math.floor(progress)}%</div>
                </div>
            </div>
        `;
    }

    _renderRecipes() {
        const recipes = this.craftingManager.getAvailableRecipes();
        this.recipesContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (recipes.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'crafting-empty-state';
            emptyMsg.innerHTML = '🔒 Noch keine Rezepte freigeschaltet.<br><span class="text-sm">Besiege Bosse, um neue Rezepte zu erhalten.</span>';
            this.recipesContainer.appendChild(emptyMsg);
            return;
        }

        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.className = 'crafting-recipe-card glass-inner-panel';

            const cost = this.craftingManager.getRecipeCost(recipe);
            let costStr = [];
            for (const [res, amount] of Object.entries(cost)) {
                costStr.push(`${formatNumber(amount)} ${res}`);
            }

            div.innerHTML = `
                <div class="crafting-recipe-info">
                    <div class="crafting-recipe-name">${recipe.name} ${recipe.isResourceRecipe ? '<span class="text-sm text-muted">(Ressource)</span>' : ''}</div>
                    <div class="crafting-recipe-desc">${recipe.desc}</div>
                    <div class="crafting-recipe-cost">Kosten: ${costStr.join(' | ')}</div>
                    ${recipe.unlockBoss ? `<div class="crafting-recipe-unlock">🔓 Freischaltung: Boss ${recipe.unlockBoss}</div>` : ''}
                </div>
                <button class="glass-btn primary btn-small craft-btn" data-id="${recipe.id}">
                    ${recipe.isResourceRecipe ? '⚗️ Herstellen' : '🔨 Herstellen'}
                </button>
            `;

            const btn = div.querySelector('.craft-btn');
            btn.addEventListener('click', () => {
                const result = this.craftingManager.craftMasterRecipe(recipe.id);
                if (result.success) {
                    this.resultContainer.innerHTML = `
                        <div class="crafting-result-success">
                            <span class="text-gold glow-text">✦ ${result.message} ✦</span>
                            ${result.item ? `<br><span class="text-muted text-sm">Qualität: ${result.quality}%</span>` : ''}
                        </div>
                    `;
                } else {
                    this.resultContainer.innerHTML = `<div class="crafting-result-error">❌ ${result.message}</div>`;
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