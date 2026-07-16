// --- START OF FILE ui/libraryui.js ---

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

    this.container.innerHTML = '';

    if (upgrades.length === 0) {
      this.container.innerHTML = `
        <div class="library-empty-state">
          <span class="text-muted">Keine Forschungen verfügbar.</span>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    upgrades.forEach((upg) => {
      const cost = this.libraryManager.getUpgradeCost(upg.id);
      let costStr = [];
      if (cost.particles) costStr.push(`${formatNumber(cost.particles)} Partikel`);
      if (cost.relics) costStr.push(`${formatNumber(cost.relics)} Relikte`);
      if (cost.artifacts) costStr.push(`${formatNumber(cost.artifacts)} Artefakte`);

      const canAfford = (!cost.particles || res.particles >= cost.particles) &&
                        (!cost.relics || res.relics >= cost.relics) &&
                        (!cost.artifacts || res.artifacts >= cost.artifacts);
      const isMaxed = upg.level >= upg.maxLevel;

      const div = document.createElement('div');
      div.className = 'library-card glass-inner-panel';
      div.style.borderLeft = `3px solid ${isMaxed ? 'var(--color-success)' : canAfford ? 'var(--color-dust)' : 'var(--color-text-muted)'}`;
      div.style.opacity = isMaxed ? '1' : canAfford ? '1' : '0.6';

      div.innerHTML = `
        <div class="library-info">
          <div class="library-name" style="color: ${isMaxed ? 'var(--color-success)' : 'var(--color-highlight)'};">
            ${upg.name} <span class="text-muted text-sm">(Stufe ${upg.level})</span>
          </div>
          <div class="library-desc">${upg.desc}</div>
          <div class="library-cost">
            ${isMaxed ? 
              `<span class="text-success">✦ Maximalstufe erreicht ✦</span>` :
              `Kosten: <span class="${canAfford ? 'text-dust' : 'text-danger'}">${costStr.join(' | ')}</span>`
            }
          </div>
        </div>
        <div class="library-action">
          ${!isMaxed ? 
            `<button class="glass-btn primary btn-small research-btn" ${!canAfford ? 'disabled' : ''} data-id="${upg.id}">📚 Forschen</button>` :
            `<span class="library-maxed">✦ Max</span>`
          }
        </div>
      `;

      const btn = div.querySelector('.research-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          this.libraryManager.buyUpgrade(upg.id);
          this.render();
        });
      }

      fragment.appendChild(div);
    });

    this.container.appendChild(fragment);
  }
}