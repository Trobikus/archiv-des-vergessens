// ============================================================
// FILE: js/ui/libraryui.js – Bibliothek
// ============================================================
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
        this._upgradeCards = new Map();
        this._renderScheduled = false;

        this.eventBus.subscribe(EVENTS.UI_OPEN_LIBRARY, () => this.open());
        this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => this._scheduleRender());
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
        this.render();
    }

    render() {
        const upgrades = this.libraryManager.getUpgrades();
        const res = this.resourceManager.getResources();

        if (upgrades.length === 0) {
            this.container.innerHTML = `<div class="library-empty-state"><span class="text-muted">Keine Forschungen verfügbar.</span></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const upg of upgrades) {
            let div = this._upgradeCards.get(upg.id);
            const cost = this.libraryManager.getUpgradeCost(upg.id);
            let costStr = [];
            if (cost.particles) costStr.push(`${formatNumber(cost.particles)} Partikel`);
            if (cost.relics) costStr.push(`${formatNumber(cost.relics)} Relikte`);
            if (cost.artifacts) costStr.push(`${formatNumber(cost.artifacts)} Artefakte`);

            const canAfford = (!cost.particles || res.particles >= cost.particles) &&
                              (!cost.relics || res.relics >= cost.relics) &&
                              (!cost.artifacts || res.artifacts >= cost.artifacts);
            const isMaxed = upg.level >= upg.maxLevel;

            if (!div) {
                div = document.createElement('div');
                div.className = 'library-card glass-inner-panel';
                div.innerHTML = `
                    <div class="library-info">
                        <div class="library-name"></div>
                        <div class="library-desc"></div>
                        <div class="library-cost"></div>
                    </div>
                    <div class="library-action"></div>
                `;
                this._upgradeCards.set(upg.id, div);
            }

            div.style.borderLeft = `3px solid ${isMaxed ? 'var(--color-success)' : canAfford ? 'var(--color-dust)' : 'var(--color-text-muted)'}`;
            div.style.opacity = isMaxed ? '1' : canAfford ? '1' : '0.6';

            const nameEl = div.querySelector('.library-name');
            nameEl.textContent = `${upg.name} (Stufe ${upg.level})`;
            nameEl.style.color = isMaxed ? 'var(--color-success)' : 'var(--color-highlight)';

            div.querySelector('.library-desc').textContent = upg.desc;

            const costEl = div.querySelector('.library-cost');
            if (isMaxed) {
                costEl.innerHTML = `<span class="text-success">✦ Maximalstufe erreicht ✦</span>`;
            } else {
                costEl.innerHTML = `Kosten: <span class="${canAfford ? 'text-dust' : 'text-danger'}">${costStr.join(' | ')}</span>`;
            }

            const actionEl = div.querySelector('.library-action');
            if (!isMaxed) {
                const btn = document.createElement('button');
                btn.className = `glass-btn primary btn-small research-btn`;
                btn.disabled = !canAfford;
                btn.textContent = '📚 Forschen';
                btn.dataset.id = upg.id;
                btn.addEventListener('click', () => {
                    this.libraryManager.buyUpgrade(upg.id);
                    this._scheduleRender();
                });
                actionEl.replaceChildren(btn);
            } else {
                actionEl.innerHTML = `<span class="library-maxed">✦ Max</span>`;
            }

            fragment.appendChild(div);
        }

        this.container.replaceChildren(fragment);
    }

    destroy() {
        this._upgradeCards.clear();
        super.destroy();
    }
}