/**
 * ============================================================
 * FILE: ui/preact/leaderboard/LeaderboardUI.js – Bestenliste
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function LeaderboardUI({ stateManager, eventBus, services }) {
  const { leaderboardService } = services;
  const [isOpen, setIsOpen] = useState(false);

  const stats = useStateSelector(stateManager, () => leaderboardService.getFormattedStats());
  const records = useStateSelector(stateManager, () => leaderboardService.getRecords());

  useEventBus(eventBus, EVENTS.UI_OPEN_LEADERBOARD, () => setIsOpen(true));
  useEventBus(eventBus, 'leaderboard:updated', () => {});

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm('Möchtest du deine persönlichen Rekorde zurücksetzen?')) {
      leaderboardService.reset();
      eventBus.publish('ui:showToast', {
        message: '📊 Bestenliste zurückgesetzt.',
        type: 'info',
        duration: 2000
      });
    }
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 600px; max-width: 95vw;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text cinzel text-center">🏆 Persönliche Bestenliste</h2>
        <p class="hub-subtitle text-center mb-1" style="text-align: center; color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Deine Rekorde – gespeichert in deinem Browser</p>

        <div class="modal-scroll-area" style="max-height: 50vh; overflow-y: auto; padding-right: 0.5rem;">
          <div class="leaderboard-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;">
            ${Object.entries(stats).map(([label, value]) => html`
              <div class="leaderboard-stat" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.9rem; border-left: 2px solid var(--color-gold); background: rgba(0,0,0,0.2);">
                <span class="text-muted" style="font-size: 0.8rem;">${label}</span>
                <span class="text-gold text-bold" style="font-size: 1rem;">${value}</span>
              </div>
            `)}
          </div>

          <div class="leaderboard-footer" style="text-align: center; padding: 0.8rem 0; border-top: 1px solid rgba(197,160,89,0.1);">
            <span class="text-muted text-sm">📊 Persönliche Rekorde – gespeichert in deinem Browser</span>
          </div>

          <div class="leaderboard-meta" style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem; border-top: 1px solid rgba(197,160,89,0.05);">
            <span class="text-muted text-sm" style="font-size: 0.75rem;">Sitzungen: <span class="text-highlight" style="font-weight: bold;">${records.sessionCount}</span></span>
            <span class="text-muted text-sm" style="font-size: 0.75rem;">Zuletzt gespielt: <span class="text-highlight" style="font-weight: bold;">${new Date(records.lastPlayed).toLocaleDateString()}</span></span>
            <span class="text-muted text-sm" style="font-size: 0.75rem;">Gesamtspielzeit: <span class="text-highlight" style="font-weight: bold;">${Math.floor(records.totalPlayTime / 60)} Minuten</span></span>
          </div>

          <button class="glass-btn btn-danger btn-small" style="display: block; margin: 0.5rem auto 0; padding: 0.3rem 1rem; font-size: 0.75rem;" onClick=${handleReset}>
            🗑️ Rekorde zurücksetzen
          </button>
        </div>
      </div>
    </div>
  `;
}