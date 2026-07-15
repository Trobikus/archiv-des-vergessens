import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js';
import BaseModalUI from './basemodal.js';

export default class LibraryUI extends BaseModalUI {
  constructor(context) {
    super('library-overlay', 'library-close');
    this.eventBus = context.eventBus;
    this.libraryManager = context.libraryManager;
    this.resourceManager = context.resourceManager;

    this.container = document.getElementById('library-container');

    this.eventBus.subscribe(EVENTS.UI_OPEN_LIBRARY, () => this.open());
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => {
      if (this.isOpen) this.render();
    });
  }

  onOpen() {
    this.render();
  }

  render() {
    const upgrades = this.libraryManager.getUpgrades();
    const res = this.resourceManager.getResources();

    while (this.container.children.length > upgrades.length) {
      this.container.removeChild(this.container.lastChild);
    }

    upgrades.forEach((upg, index) => {
      let div = this.container.children[index];
      if (!div) {
        div = document.createElement('div');
        div.className = 'ui-card flex-between';
        div.innerHTML = `
          <div>
            <div class="text-highlight text-bold upg-title"></div>
            <div class="text-muted text-sm upg-desc"></div>
            <div class="text-sm mt-1 upg-cost"></div>
          </div>
          <div><button class="btn-claim-quest upg-btn">Forschen</button></div>
        `;
        
        div.querySelector('.upg-btn').addEventListener('click', () => {
          this.libraryManager.buyUpgrade(upg.id);
          this.render();
        });
        
        this.container.appendChild(div);
      }

      const cost = this.libraryManager.getUpgradeCost(upg.id);
      let costStr = [];
      if (cost.particles) costStr.push(`${formatNumber(cost.particles)} Partikel`);
      if (cost.relics) costStr.push(`${formatNumber(cost.relics)} Relikte`);
      if (cost.artifacts) costStr.push(`${formatNumber(cost.artifacts)} Artefakte`);

      const canAfford = (!cost.particles || res.particles >= cost.particles) &&
                        (!cost.relics || res.relics >= cost.relics) &&
                        (!cost.artifacts || res.artifacts >= cost.artifacts);

      div.querySelector('.upg-title').textContent = `${upg.name} (Stufe ${upg.level})`;
      div.querySelector('.upg-desc').textContent = upg.desc;
      
      const costDiv = div.querySelector('.upg-cost');
      if (upg.level < upg.maxLevel) {
          costDiv.innerHTML = `Kosten: <span class="${canAfford ? 'text-dust' : 'text-danger'}">${costStr.join(' | ')}</span>`;
          div.querySelector('.upg-btn').style.display = 'block';
          div.querySelector('.upg-btn').disabled = !canAfford;
      } else {
          costDiv.innerHTML = `<span class="text-success">Maximalstufe erreicht</span>`;
          div.querySelector('.upg-btn').style.display = 'none';
      }
    });
  }
}