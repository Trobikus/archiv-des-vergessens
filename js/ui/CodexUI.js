// --- START OF FILE ui/CodexUI.js ---

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

        // Events abonnieren
        this.eventBus.subscribe('ui:openCodex', () => this.open());
        this.eventBus.subscribe('codex:entryUnlocked', () => {
            if (this.isOpen) this.render();
        });

        // Kategorie-Buttons
        const categories = ['all', 'bosses', 'locations', 'items', 'lore', 'endings'];
        if (this.categoryContainer) {
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

        // Suche
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

        // Nach Kategorie filtern
        if (this.currentCategory !== 'all') {
            entries = entries.filter(e => e.category === this.currentCategory);
        }

        // Nach Suche filtern
        if (search) {
            entries = entries.filter(e =>
                e.title.toLowerCase().includes(search) ||
                e.description.toLowerCase().includes(search) ||
                (e.lore && e.lore.toLowerCase().includes(search))
            );
        }

        // Sortieren: Freigeschaltete zuerst
        entries.sort((a, b) => {
            if (a.unlocked && !b.unlocked) return -1;
            if (!a.unlocked && b.unlocked) return 1;
            return a.title.localeCompare(b.title);
        });

        this.container.innerHTML = '';

        if (entries.length === 0) {
            this.container.innerHTML = `
        <div class="text-muted text-center text-italic">
          Keine Einträge gefunden.
        </div>
      `;
            return;
        }

        for (const entry of entries) {
            const div = document.createElement('div');
            div.className = `ui-card codex-entry ${entry.unlocked ? 'unlocked' : 'locked'}`;
            div.style.cursor = entry.unlocked ? 'pointer' : 'default';
            div.style.opacity = entry.unlocked ? '1' : '0.5';

            div.innerHTML = `
        <div>
          <div class="ui-card-title" style="font-size: 1rem;">
            ${entry.unlocked ? entry.icon || '📄' : '🔒'} ${entry.title}
          </div>
          <div class="ui-card-desc text-sm">
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
            }

            this.container.appendChild(div);
        }
    }

    renderDetail() {
        if (!this.entryDetailContainer) return;

        if (!this.currentEntryId) {
            this.entryDetailContainer.innerHTML = `
        <div class="text-muted text-center text-italic">
          Wähle einen Eintrag aus, um mehr zu erfahren.
        </div>
      `;
            return;
        }

        const entry = this.codexManager.getEntry(this.currentEntryId);
        if (!entry || !entry.unlocked) {
            this.entryDetailContainer.innerHTML = `
        <div class="text-muted text-center text-italic">
          Dieser Eintrag ist noch nicht freigeschaltet.
        </div>
      `;
            return;
        }

        let html = `
      <div class="glass-inner-panel">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
          <span style="font-size: 2rem;">${entry.icon || '📄'}</span>
          <div>
            <div class="text-gold text-bold text-lg cinzel">${entry.title}</div>
            <div class="text-muted text-sm">${entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}</div>
          </div>
        </div>
        <div class="text-muted mb-1">${entry.description}</div>
        ${entry.lore ? `<div class="text-sm mt-1" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">${entry.lore}</div>` : ''}
        ${entry.stats ? `
          <div class="mt-1 text-sm" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
            <span class="text-muted">Stats:</span>
            <span class="text-highlight">HP: ${entry.stats.hp || '?'}</span>
            <span class="text-danger">⚔️ ${entry.stats.attack || '?'}</span>
            <span class="text-blue">🛡️ ${entry.stats.defense || '?'}</span>
          </div>
        ` : ''}
        <div class="text-muted text-sm mt-1" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
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

    // Externe Methode: Bestimmten Eintrag anzeigen
    showEntry(entryId) {
        this.currentEntryId = entryId;
        this.open();
        this.renderDetail();
    }
}