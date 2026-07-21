/**
 * ============================================================
 * FILE: ui/preact/achievement/AchievementUI.js – Erfolge (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function AchievementUI({ stateManager, eventBus, services }) {
  const { achievementService } = services;
  const [isOpen, setIsOpen] = useState(false);

  const achievements = useStateSelector(stateManager, (state) => state.achievements.list);

  useEventBus(eventBus, 'ui:openAchievements', () => setIsOpen(true));
  useEventBus(eventBus, EVENTS.ACHIEVEMENT_UNLOCKED, () => {});
  useEventBus(eventBus, EVENTS.ACHIEVEMENT_CLAIMED, () => {});

  if (!isOpen) return null;

  const handleClaim = (id) => {
    achievementService.claimReward(id);
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="achievement-modal-title">🏆 Erfolge & Meilensteine</h2>
        <div class="achievement-modal-subtitle" style="text-align: center; color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem; font-style: italic;">Erreiche Ziele, um seltene Titel und Belohnungen freizuschalten.</div>

        <div class="modal-scroll-area" style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
          ${achievements.length === 0 ? html`
            <div class="achievement-empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--color-text-muted); font-style: italic; border: 1px dashed rgba(197,160,89,0.1); border-radius: 2px;">
              <span class="achievement-empty-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">📜</span>
              <div class="achievement-empty-text">Keine Erfolge verfügbar.</div>
              <div class="achievement-empty-hint" style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.3rem;">Mehr Erfolge werden mit dem Fortschritt freigeschaltet.</div>
            </div>
          ` : achievements.map(ach => {
            const progressPercent = Math.min(100, (ach.progress / ach.target) * 100);
            let statusClass = 'locked';
            let statusText = '🔒 Gesperrt';
            let actionHtml = html`<span class="achievement-status-text locked" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">🔒 Gesperrt</span>`;
            let titleColor = 'var(--color-text-muted)';

            if (ach.claimed) {
              statusClass = 'claimed';
              statusText = '✅ Abgeholt';
              titleColor = 'var(--color-success)';
              actionHtml = html`<span class="achievement-status-text claimed" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-success);">✅ Abgeholt</span>`;
            } else if (ach.achieved) {
              statusClass = 'achieved';
              statusText = '🎁 Bereit';
              titleColor = 'var(--color-gold)';
              actionHtml = html`<button class="glass-btn primary btn-small" onClick=${() => handleClaim(ach.id)} style="padding: 0.3rem 0.8rem; font-size: 0.75rem;">🎁 Abholen</button>`;
            } else {
              statusClass = 'locked';
              statusText = '🔒 Gesperrt';
              titleColor = 'var(--color-text-muted)';
              actionHtml = html`<span class="achievement-status-text locked" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">🔒 Gesperrt</span>`;
            }

            const rewards = [];
            if (ach.reward.particles) rewards.push(`${ach.reward.particles} Partikel`);
            if (ach.reward.relics) rewards.push(`${ach.reward.relics} Relikte`);
            if (ach.reward.artifacts) rewards.push(`${ach.reward.artifacts} Artefakte`);
            if (ach.reward.title) rewards.push(`📛 Titel: ${ach.reward.title}`);

            return html`
              <div class="achievement-card ${statusClass}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(197,160,89,0.06); border-left: 3px solid ${ach.claimed ? 'var(--color-success)' : ach.achieved ? 'var(--color-gold)' : 'var(--color-text-muted)'}; border-radius: 2px; transition: all 0.3s ease;">
                <div class="achievement-info" style="flex: 1; min-width: 0;">
                  <div class="achievement-title" style="font-family: var(--font-header); font-size: 1rem; color: ${titleColor}; transition: color 0.3s ease;">${ach.label}</div>
                  <div class="achievement-reward" style="color: var(--color-text-muted); font-size: 0.8rem;">🎁 Belohnung: <span class="text-gold">${rewards.join(' | ')}</span></div>
                  <div class="achievement-progress" style="margin-top: 0.4rem; max-width: 250px;">
                    <div class="progress-bar-container" style="height: 14px;">
                      <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${ach.claimed || ach.achieved ? 'var(--color-gold)' : 'var(--color-text-muted)'};"></div>
                      <div class="progress-text" style="font-size: 0.6rem;">${Math.round(progressPercent)}%</div>
                    </div>
                  </div>
                </div>
                <div class="achievement-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 80px; text-align: center;">
                  ${actionHtml}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}