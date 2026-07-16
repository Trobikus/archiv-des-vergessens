// --- START OF FILE ui/LeaderboardUI.js ---

import BaseModalUI from './basemodal.js';
import { formatNumber } from '../utils/format.js';

export default class LeaderboardUI extends BaseModalUI {
    constructor(context) {
        // Wir verwenden ein eigenes Modal oder erweitern das Achievement-Modal?
        // Für Einfachheit: eigenes Modal
        super('leaderboard-overlay', 'leaderboard-close');

        this.eventBus = context.eventBus;
        this.leaderboard = context.leaderboardManager; // LocalLeaderboard
        this.hero = context.hero;
        this.resourceManager = context.resourceManager;

        this.container = document.getElementById('leaderboard-container');
        this.statsContainer = document.getElementById('leaderboard-stats');

        // Event: UI öffnen (über Hub-Button)
        this.eventBus.subscribe('ui:openLeaderboard', () => this.open());

        // Automatisch aktualisieren, wenn sich der Held ändert
        this.eventBus.subscribe('hero:updated', () => {
            if (this.isOpen) this.render();
        });
        this.eventBus.subscribe('resources:updated', () => {
            if (this.isOpen) this.render();
        });
    }

    onOpen() {
        this.render();
    }

    render() {
        if (!this.leaderboard) return;

        const stats = this.leaderboard.getFormattedStats();
        const records = this.leaderboard.getRecords();

        // Bestenliste als Tabelle
        let html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; text-align: left;">
    `;

        for (const [label, value] of Object.entries(stats)) {
            html += `
        <div class="glass-inner-panel" style="padding: 0.5rem 0.8rem; display: flex; justify-content: space-between; align-items: center;">
          <span class="text-muted text-sm">${label}</span>
          <span class="text-gold text-bold">${value}</span>
        </div>
      `;
        }

        html += `
      </div>
      <div class="text-center text-muted text-sm mt-2" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
        📊 Persönliche Rekorde – gespeichert in deinem Browser
      </div>
    `;

        // Zusätzliche Statistiken
        html += `
      <div class="flex-between mt-1" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.8rem;">
        <span class="text-muted text-sm">Sitzungen</span>
        <span class="text-highlight">${records.sessionCount}</span>
        <span class="text-muted text-sm">Zuletzt gespielt</span>
        <span class="text-highlight">${new Date(records.lastPlayed).toLocaleDateString()}</span>
      </div>
      <div class="text-center text-muted text-sm mt-1">
        Gesamtspielzeit: ${Math.floor(records.totalPlayTime / 60)} Minuten
      </div>
    `;

        this.container.innerHTML = html;

        // Reset-Button (optional, nur für Debug)
        const resetBtn = document.getElementById('leaderboard-reset-btn');
        if (resetBtn) {
            resetBtn.style.display = 'block';
            resetBtn.addEventListener('click', () => {
                if (confirm('Möchtest du deine persönlichen Rekorde zurücksetzen?')) {
                    this.leaderboard.reset();
                    this.render();
                    this.eventBus.publish('ui:addLog', { text: '📊 Bestenliste zurückgesetzt.', type: 'system' });
                }
            });
        }
    }
}