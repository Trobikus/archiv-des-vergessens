// ============================================================
// FILE: js/ui/craftingui.js – Meisterwerkstatt
// ============================================================
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

        this._recipeCards = new Map();
        this._renderScheduled = false;

        this.eventBus.subscribe('ui:openCrafting', () => this.open());
        this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._scheduleRender());
    }

    _scheduleRender() {
        if (this._renderScheduled || !this.isOpen) return;
        this._renderScheduled = true;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            if (this.isOpen) this.render();
        });
    }

    onOpen() {
        this.resultContainer.textContent = '';
        this.render();
    }

    render() {
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
        const fragment = document.createDocumentFragment();

        if (recipes.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'crafting-empty-state';
            emptyMsg.innerHTML = '🔒 Noch keine Rezepte freigeschaltet.<br><span class="text-sm">Besiege Bosse, um neue Rezepte zu erhalten.</span>';
            this.recipesContainer.replaceChildren(emptyMsg);
            return;
        }

        for (const recipe of recipes) {
            let div = this._recipeCards.get(recipe.id);
            if (!div) {
                div = document.createElement('div');
                div.className = 'crafting-recipe-card glass-inner-panel';
                div.innerHTML = `
                    <div class="crafting-recipe-info">
                        <div class="crafting-recipe-name"></div>
                        <div class="crafting-recipe-desc"></div>
                        <div class="crafting-recipe-cost"></div>
                        <div class="crafting-recipe-unlock"></div>
                    </div>
                    <button class="glass-btn primary btn-small craft-btn" data-id="${recipe.id}">Herstellen</button>
                `;
                div.querySelector('.craft-btn').addEventListener('click', () => this._craft(recipe.id));
                this._recipeCards.set(recipe.id, div);
            }

            const cost = this.craftingManager.getRecipeCost(recipe);
            let costStr = [];
            for (const [res, amount] of Object.entries(cost)) {
                costStr.push(`${formatNumber(amount)} ${res}`);
            }

            div.querySelector('.crafting-recipe-name').textContent = recipe.name + (recipe.isResourceRecipe ? ' (Ressource)' : '');
            div.querySelector('.crafting-recipe-desc').textContent = recipe.desc;
            div.querySelector('.crafting-recipe-cost').textContent = `Kosten: ${costStr.join(' | ')}`;
            const unlockEl = div.querySelector('.crafting-recipe-unlock');
            unlockEl.textContent = recipe.unlockBoss ? `🔓 Freischaltung: Boss ${recipe.unlockBoss}` : '';
            fragment.appendChild(div);
        }

        this.recipesContainer.replaceChildren(fragment);
        this._updateButtons();
    }

    _updateButtons() {
        const res = this.resourceManager.getResources();
        const recipes = this.craftingManager.getAvailableRecipes();

        for (const [id, div] of this._recipeCards) {
            const recipe = recipes.find(r => r.id === id);
            if (!recipe) continue;
            const cost = this.craftingManager.getRecipeCost(recipe);
            let canAfford = true;
            for (const [key, amount] of Object.entries(cost)) {
                if ((res[key] || 0) < amount) { canAfford = false; break; }
            }
            div.querySelector('.craft-btn').disabled = !canAfford;
        }
    }

    _craft(recipeId) {
        const result = this.craftingManager.craftMasterRecipe(recipeId);
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
        this._scheduleRender();
    }

    destroy() {
        this._recipeCards.clear();
        super.destroy();
    }
}