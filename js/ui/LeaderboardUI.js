// ============================================================
// FILE: js/ui/LeaderboardUI.js – Bestenliste
// ============================================================
import BaseModalUI from './basemodal.js';
import { formatNumber } from '../utils/format.js';

export default class LeaderboardUI extends BaseModalUI {
    constructor(context) {
        super('leaderboard-overlay', 'leaderboard-close');

        this.eventBus = context.eventBus;
        this.leaderboard = context.leaderboardManager;
        this.hero = context.hero;
        this.resourceManager = context.resourceManager;

        this.container = document.getElementById('leaderboard-container');

        this.eventBus.subscribe('ui:openLeaderboard', () => this.open());
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

        let html = `
            <div class="leaderboard-stats-grid">
        `;

        for (const [label, value] of Object.entries(stats)) {
            html += `
                <div class="leaderboard-stat glass-inner-panel">
                    <span class="text-muted text-sm">${label}</span>
                    <span class="text-gold text-bold">${value}</span>
                </div>
            `;
        }

        html += `
            </div>
            <div class="leaderboard-footer">
                <span class="text-muted text-sm">📊 Persönliche Rekorde – gespeichert in deinem Browser</span>
            </div>
            <div class="leaderboard-meta">
                <span class="text-muted text-sm">Sitzungen: <span class="text-highlight">${records.sessionCount}</span></span>
                <span class="text-muted text-sm">Zuletzt gespielt: <span class="text-highlight">${new Date(records.lastPlayed).toLocaleDateString()}</span></span>
                <span class="text-muted text-sm">Gesamtspielzeit: <span class="text-highlight">${Math.floor(records.totalPlayTime / 60)} Minuten</span></span>
            </div>
        `;

        this.container.innerHTML = html;

        const resetBtn = document.getElementById('leaderboard-reset-btn');
        if (resetBtn) {
            resetBtn.style.display = 'block';
            resetBtn.className = 'glass-btn btn-danger btn-small';
            resetBtn.style.margin = '0.5rem auto 0';
            resetBtn.textContent = '🗑️ Rekorde zurücksetzen';
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