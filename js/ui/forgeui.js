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

    this.eventBus.subscribe(EVENTS.UI_OPEN_FORGE, () => this.open());
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => {
      if (this.isOpen) {
        this._renderResources();
        this._updateRecipeButtons();
        this._renderUpgrades();
      }
    });
  }

  onOpen() {
    this.resultContainer.textContent = '';
    this._renderResources();
    this._renderRecipes();
    this._renderUpgrades();
  }

  _renderResources() {
    const res = this.resourceManager.getResources();
    this.resourcesContainer.innerHTML = `
      <div><span class="text-muted">Partikel:</span> <span class="text-gold">${formatNumber(res.particles)}</span></div>
      <div><span class="text-muted">Relikte:</span> <span class="text-gold">${formatNumber(res.relics)}</span></div>
      <div><span class="text-muted">Artefakte:</span> <span class="text-gold">${formatNumber(res.artifacts)}</span></div>
      <div><span class="text-muted">Staub:</span> <span class="text-dust">${formatNumber(res.memoryDust)}</span></div>
    `;
  }

  _renderRecipes() {
    const recipes = this.forgeManager.getRecipes();

    if (this.recipesContainer.children.length === 0) {
      const fragment = document.createDocumentFragment();
      
      recipes.forEach(recipe => {
        const div = document.createElement('div');
        div.className = 'ui-card forge-recipe-card';

        const cost = this.forgeManager.getRecipeCost(recipe);
        let costStr = [];
        if (cost.particles) costStr.push(`${formatNumber(cost.particles)} Partikel`);
        if (cost.relics) costStr.push(`${formatNumber(cost.relics)} Relikte`);
        if (cost.artifacts) costStr.push(`${formatNumber(cost.artifacts)} Artefakte`);

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
          <div class="ui-card-title">${recipe.name}</div>
          <div class="ui-card-desc">${recipe.desc}</div>
          <div class="ui-card-meta text-muted">Kosten: ${costStr.join(' | ')}</div>
        `;

        const craftBtn = document.createElement('button');
        craftBtn.textContent = 'Schmieden';
        craftBtn.className = 'ui-btn ui-btn-gold forge-craft-btn';
        craftBtn.dataset.id = recipe.id;

        craftBtn.addEventListener('click', () => {
          const result = this.forgeManager.craft(recipe.id);
          if (result.success) {
            this.resultContainer.innerHTML = `<span style="color: ${result.item.getColor()}; text-shadow: 0 0 10px ${result.item.getColor()}80;">${result.message}</span><br><span class="text-muted text-sm">(Wurde dem Inventar hinzugefügt)</span>`;
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `  Schmiede: ${result.item.name} (${result.item.getRarityLabel()}) hergestellt!`, type: 'event' });
          } else {
            this.resultContainer.innerHTML = `<span class="text-danger">${result.message}</span>`;
          }
        });

        div.appendChild(infoDiv);
        div.appendChild(craftBtn);
        fragment.appendChild(div);
      });
      this.recipesContainer.appendChild(fragment);
    }
    this._updateRecipeButtons();
  }

  _renderUpgrades() {
    const slots = ['weapon', 'armor', 'amulet', 'ring', 'ring2'];
    const equippedItems = slots.map(s => ({ slot: s, item: this.forgeManager.hero.equipment[s] })).filter(x => x.item);

    if (equippedItems.length === 0) {
      this.upgradesContainer.innerHTML = '<div class="text-disabled text-italic">Keine Ausrüstung angelegt.</div>';
      return;
    }

    this.upgradesContainer.replaceChildren();
    const fragment = document.createDocumentFragment();

    equippedItems.forEach((data) => {
      const { slot, item } = data;
      const div = document.createElement('div');
      div.className = 'ui-card forge-upgrade-card';
      div.dataset.slot = slot;
      
      const cost = item.level * 10 * (item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 3 : item.rarity === 'rare' ? 2 : 1);
      const canAfford = this.resourceManager.memoryDust >= cost && item.level < 10;

      div.innerHTML = `
        <div>
          <div class="ui-card-title item-title" style="color: ${item.getColor()}">${item.name} (Lv. ${item.level})</div>
          <div class="ui-card-desc item-desc">${item.level < 10 ? `Kosten: ${formatNumber(cost)} Staub` : 'Maximales Level'}</div>
        </div>
        <button class="ui-btn ui-btn-blue upgrade-btn" ${!canAfford ? 'disabled' : ''}>Aufwerten</button>
      `;

      div.querySelector('.upgrade-btn').addEventListener('click', () => {
        const currentSlot = div.dataset.slot;
        const res = this.forgeManager.upgradeEquipped(currentSlot);
        if (res.success) {
          this.resultContainer.innerHTML = `<span class="text-dust">${res.message}</span>`;
          this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `✨ ${res.message}`, type: 'event' });
        }
      });
      
      fragment.appendChild(div);
    });
    
    this.upgradesContainer.appendChild(fragment);
  }

  _updateRecipeButtons() {
    const res = this.resourceManager.getResources();
    const recipes = this.forgeManager.getRecipes();
    const buttons = this.recipesContainer.querySelectorAll('.forge-craft-btn');
    buttons.forEach(btn => {
      const recipe = recipes.find(r => r.id === btn.dataset.id);
      if (recipe) {
        const cost = this.forgeManager.getRecipeCost(recipe);
        const canAfford =
          (!cost.particles || res.particles >= cost.particles) &&
          (!cost.relics || res.relics >= cost.relics) &&
          (!cost.artifacts || res.artifacts >= cost.artifacts);
        btn.disabled = !canAfford;
      }
    });
  }
}