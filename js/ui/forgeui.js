// ============================================================
// FILE: js/ui/forgeui.js – Artefakt-Schmiede
// ============================================================
import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js';
import BaseModalUI from './basemodal.js';

export default class ForgeUI extends BaseModalUI {
    constructor(context) {
        super('forge-overlay', 'forge-close');
        this.eventBus = context.eventBus;
        this.forgeManager = context.forgeManager;
        this.resourceManager = context.resourceManager;

        this.recipesContainer = document.getElementById('forge-recipes');
        this.upgradesContainer = document.getElementById('forge-upgrades');
        this.resourcesContainer = document.getElementById('forge-resources');
        this.resultContainer = document.getElementById('forge-result');

        this._recipeButtons = new Map();
        this._upgradeButtons = new Map();
        this._renderScheduled = false;

        this.eventBus.subscribe(EVENTS.UI_OPEN_FORGE, () => this.open());
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
        this._renderRecipes();
        this._renderUpgrades();
        this._updateButtons();
    }

    _renderResources() {
        const res = this.resourceManager.getResources();
        this.resourcesContainer.innerHTML = `
            <div class="forge-resource-grid">
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Partikel</span><span class="text-gold text-bold">${formatNumber(res.particles)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Relikte</span><span class="text-gold text-bold">${formatNumber(res.relics)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Artefakte</span><span class="text-gold text-bold">${formatNumber(res.artifacts)}</span></div>
                <div class="glass-inner-panel resource-chip"><span class="text-muted text-sm">Staub</span><span class="text-dust text-bold">${formatNumber(res.memoryDust)}</span></div>
            </div>
        `;
    }

    _renderRecipes() {
        const recipes = this.forgeManager.getRecipes();
        const fragment = document.createDocumentFragment();

        for (const recipe of recipes) {
            let div = this._recipeButtons.get(recipe.id);
            if (!div) {
                div = document.createElement('div');
                div.className = 'forge-recipe-card glass-inner-panel';
                div.dataset.recipeId = recipe.id;
                div.innerHTML = `
                    <div class="forge-recipe-info">
                        <div class="forge-recipe-name">${recipe.name}</div>
                        <div class="forge-recipe-desc">${recipe.desc}</div>
                        <div class="forge-recipe-cost"></div>
                    </div>
                    <button class="glass-btn primary btn-small forge-craft-btn" data-id="${recipe.id}">⚒️ Schmieden</button>
                `;
                div.querySelector('.forge-craft-btn').addEventListener('click', () => this._craft(recipe.id));
                this._recipeButtons.set(recipe.id, div);
            }

            const cost = this.forgeManager.getRecipeCost(recipe);
            let costStr = [];
            if (cost.particles) costStr.push(`${formatNumber(cost.particles)} Partikel`);
            if (cost.relics) costStr.push(`${formatNumber(cost.relics)} Relikte`);
            if (cost.artifacts) costStr.push(`${formatNumber(cost.artifacts)} Artefakte`);
            div.querySelector('.forge-recipe-cost').textContent = `Kosten: ${costStr.join(' | ')}`;
            fragment.appendChild(div);
        }

        this.recipesContainer.replaceChildren(fragment);
    }

    _renderUpgrades() {
        const slots = ['weapon', 'armor', 'amulet', 'ring', 'ring2'];
        const equippedItems = slots.map(s => ({ slot: s, item: this.forgeManager.hero.equipment[s] })).filter(x => x.item);

        if (equippedItems.length === 0) {
            this.upgradesContainer.innerHTML = `
                <div class="forge-empty-state">
                    <span class="text-muted">Keine Ausrüstung angelegt.</span>
                    <span class="text-sm text-muted">Schmiede zuerst Gegenstände im Rezeptbereich.</span>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const data of equippedItems) {
            const { slot, item } = data;
            let div = this._upgradeButtons.get(slot);
            if (!div) {
                div = document.createElement('div');
                div.className = 'forge-upgrade-card glass-inner-panel';
                div.dataset.slot = slot;
                div.innerHTML = `
                    <div class="forge-upgrade-info">
                        <div class="forge-upgrade-name" style="color: ${item.getColor()};">${item.name} <span class="text-muted text-sm">(Lv. ${item.level})</span></div>
                        <div class="forge-upgrade-cost"></div>
                    </div>
                    <button class="glass-btn btn-small">⬆ Aufwerten</button>
                `;
                div.querySelector('.glass-btn').addEventListener('click', () => this._upgrade(slot));
                this._upgradeButtons.set(slot, div);
            }

            const cost = item.level * 10 * (item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 3 : item.rarity === 'rare' ? 2 : 1);
            const canAfford = this.resourceManager.memoryDust >= cost && item.level < 10;
            const costEl = div.querySelector('.forge-upgrade-cost');
            costEl.textContent = item.level < 10 ? `Kosten: <span class="text-dust">${formatNumber(cost)} Staub</span>` : 'Maximales Level erreicht';
            const btn = div.querySelector('.glass-btn');
            btn.disabled = !canAfford || item.level >= 10;
            fragment.appendChild(div);
        }
        this.upgradesContainer.replaceChildren(fragment);
    }

    _updateButtons() {
        const res = this.resourceManager.getResources();
        const recipes = this.forgeManager.getRecipes();

        for (const [id, div] of this._recipeButtons) {
            const recipe = recipes.find(r => r.id === id);
            if (!recipe) continue;
            const cost = this.forgeManager.getRecipeCost(recipe);
            const canAfford =
                (!cost.particles || res.particles >= cost.particles) &&
                (!cost.relics || res.relics >= cost.relics) &&
                (!cost.artifacts || res.artifacts >= cost.artifacts);
            const btn = div.querySelector('.forge-craft-btn');
            btn.disabled = !canAfford;
        }
    }

    _craft(recipeId) {
        const result = this.forgeManager.craft(recipeId);
        if (result.success) {
            this.resultContainer.innerHTML = `
                <div class="forge-result-success">
                    <span style="color: ${result.item.getColor()};">✦ ${result.message} ✦</span>
                    <span class="text-muted text-sm">(Wurde dem Inventar hinzugefügt)</span>
                </div>
            `;
            this.eventBus.publish(EVENTS.UI_ADD_LOG, {
                text: `  Schmiede: ${result.item.name} (${result.item.getRarityLabel()}) hergestellt!`,
                type: 'event'
            });
        } else {
            this.resultContainer.innerHTML = `<div class="forge-result-error">❌ ${result.message}</div>`;
        }
        this._scheduleRender();
    }

    _upgrade(slot) {
        const res = this.forgeManager.upgradeEquipped(slot);
        if (res.success) {
            this.resultContainer.innerHTML = `
                <div class="forge-result-success" style="border-color: var(--color-dust);">
                    <span class="text-dust">✦ ${res.message} ✦</span>
                </div>
            `;
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `✨ ${res.message}`, type: 'event' });
        } else {
            this.resultContainer.innerHTML = `<div class="forge-result-error">❌ ${res.message}</div>`;
        }
        this._scheduleRender();
    }

    destroy() {
        this._recipeButtons.clear();
        this._upgradeButtons.clear();
        super.destroy();
    }
}