// ============================================================
// FILE: js/ui/CodexUI.js – Codex
// ============================================================
import BaseModalUI from './basemodal.js';
import { EVENTS } from '../core/events.js';

export default class CodexUI extends BaseModalUI {
    constructor(context) {
        super('codex-overlay', 'codex-close');

        this.eventBus = context.eventBus;
        this.codexManager = context.codexManager;

        this.container = document.getElementById('codex-container');
        this.categoryContainer = document.getElementById('codex-categories');
        this.entryDetailContainer = document.getElementById('codex-entry-detail');
        this.searchInput = document.getElementById('codex-search');
        this.progressEl = document.getElementById('codex-progress');

        this.currentCategory = 'all';
        this.currentEntryId = null;

        this.eventBus.subscribe('ui:openCodex', () => this.open());
        this.eventBus.subscribe('codex:entryUnlocked', () => {
            if (this.isOpen) this.render();
        });

        const categories = ['all', 'bosses', 'locations', 'items', 'lore', 'endings'];
        if (this.categoryContainer) {
            this.categoryContainer.innerHTML = '';
            for (const cat of categories) {
                const btn = document.createElement('button');
                btn.className = 'glass-btn btn-small';
                btn.dataset.category = cat;
                btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                btn.addEventListener('click', () => {
                    this.currentCategory = cat;
                    this.renderCategories();
                    this.renderEntries();
                });
                this.categoryContainer.appendChild(btn);
            }
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.renderEntries();
            });
        }
    }

    onOpen() {
        this.currentCategory = 'all';
        this.currentEntryId = null;
        this.render();
    }

    render() {
        this.renderCategories();
        this.renderEntries();
        this.renderDetail();
        this.renderProgress();
    }

    renderCategories() {
        const buttons = this.categoryContainer.querySelectorAll('button');
        for (const btn of buttons) {
            btn.classList.toggle('primary', btn.dataset.category === this.currentCategory);
        }
    }

    renderEntries() {
        if (!this.container) return;

        let entries = this.codexManager.getAllEntries();
        const search = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';

        if (this.currentCategory !== 'all') {
            entries = entries.filter(e => e.category === this.currentCategory);
        }

        if (search) {
            entries = entries.filter(e =>
                e.title.toLowerCase().includes(search) ||
                e.description.toLowerCase().includes(search) ||
                (e.lore && e.lore.toLowerCase().includes(search))
            );
        }

        entries.sort((a, b) => {
            if (a.unlocked && !b.unlocked) return -1;
            if (!a.unlocked && b.unlocked) return 1;
            return a.title.localeCompare(b.title);
        });

        this.container.innerHTML = '';

        if (entries.length === 0) {
            this.container.innerHTML = `
                <div class="text-muted text-center text-italic" style="padding: 2rem;">
                    Keine Einträge gefunden.
                </div>
            `;
            return;
        }

        for (const entry of entries) {
            const div = document.createElement('div');
            div.className = `glass-inner-panel codex-entry ${entry.unlocked ? 'unlocked' : 'locked'}`;
            div.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.8rem 1.2rem;
                margin-bottom: 0.4rem;
                cursor: ${entry.unlocked ? 'pointer' : 'default'};
                opacity: ${entry.unlocked ? '1' : '0.5'};
                border-left: 3px solid ${entry.unlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'};
                transition: all 0.2s ease;
            `;

            div.innerHTML = `
                <div>
                    <div class="ui-card-title" style="font-family: var(--font-header); font-size: 1rem; color: ${entry.unlocked ? 'var(--color-gold)' : 'var(--color-text-muted)'};">
                        ${entry.unlocked ? entry.icon || '📄' : '🔒'} ${entry.title}
                    </div>
                    <div class="ui-card-desc text-sm text-muted">
                        ${entry.unlocked ? entry.description : '??? – Noch nicht freigeschaltet'}
                    </div>
                </div>
                <div>
                    ${entry.unlocked ? `<span class="text-success text-sm">✅</span>` : `<span class="text-muted text-sm">🔒</span>`}
                </div>
            `;

            if (entry.unlocked) {
                div.addEventListener('click', () => {
                    this.currentEntryId = entry.id;
                    this.renderDetail();
                });
                div.addEventListener('mouseenter', () => {
                    div.style.borderColor = 'var(--color-gold-hover)';
                    div.style.background = 'rgba(197,160,89,0.03)';
                });
                div.addEventListener('mouseleave', () => {
                    div.style.borderColor = 'var(--color-gold)';
                    div.style.background = '';
                });
            }

            this.container.appendChild(div);
        }
    }

    renderDetail() {
        if (!this.entryDetailContainer) return;

        if (!this.currentEntryId) {
            this.entryDetailContainer.innerHTML = `
                <div class="text-muted text-center text-italic" style="padding: 2rem;">
                    Wähle einen Eintrag aus, um mehr zu erfahren.
                </div>
            `;
            return;
        }

        const entry = this.codexManager.getEntry(this.currentEntryId);
        if (!entry || !entry.unlocked) {
            this.entryDetailContainer.innerHTML = `
                <div class="text-muted text-center text-italic" style="padding: 2rem;">
                    Dieser Eintrag ist noch nicht freigeschaltet.
                </div>
            `;
            return;
        }

        let html = `
            <div class="glass-inner-panel" style="padding: 1.2rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 2rem;">${entry.icon || '📄'}</span>
                    <div>
                        <div class="text-gold text-bold text-lg cinzel" style="font-size: 1.2rem;">${entry.title}</div>
                        <div class="text-muted text-sm">${entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}</div>
                    </div>
                </div>
                <div class="text-muted mb-1">${entry.description}</div>
                ${entry.lore ? `<div class="text-sm mt-1" style="border-top: 1px solid rgba(197,160,89,0.1); padding-top: 0.5rem;">${entry.lore}</div>` : ''}
                ${entry.stats ? `
                    <div class="mt-1 text-sm" style="border-top: 1px solid rgba(197,160,89,0.1); padding-top: 0.5rem;">
                        <span class="text-muted">Stats:</span>
                        <span class="text-highlight">HP: ${entry.stats.hp || '?'}</span>
                        <span class="text-danger">⚔️ ${entry.stats.attack || '?'}</span>
                        <span class="text-blue">🛡️ ${entry.stats.defense || '?'}</span>
                    </div>
                ` : ''}
                <div class="text-muted text-sm mt-1" style="border-top: 1px solid rgba(197,160,89,0.1); padding-top: 0.5rem;">
                    Freigeschaltet: ${entry.unlockedAt ? new Date(entry.unlockedAt).toLocaleDateString() : 'Unbekannt'}
                </div>
            </div>
        `;

        this.entryDetailContainer.innerHTML = html;
    }

    renderProgress() {
        if (this.progressEl) {
            this.progressEl.textContent = this.codexManager.getProgress();
        }
    }

    showEntry(entryId) {
        this.currentEntryId = entryId;
        this.open();
        this.renderDetail();
    }
}