/**
 * ============================================================
 * FILE: ui/preact/quest/QuestUI.js – Missionslogbuch (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function QuestUI({ stateManager, eventBus, services }) {
  const { questService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const quests = useStateSelector(stateManager, (state) => state.quests);
  const mainQuests = questService._mainQuests;
  const currentIndex = quests.mainIndex;
  const dailyQuests = questService.getDailyQuests();

  useEventBus(eventBus, EVENTS.UI_REFRESH_QUEST, () => {});
  useEventBus(eventBus, 'quest:updated', () => {});
  useEventBus(eventBus, 'quest:completed', () => {});

  // Quest-Tracker-Button (FAB)
  const handleTrackerClick = () => setIsOpen(true);

  // Modal-Inhalt
  if (!isOpen) {
    // Nur den Tracker-Button rendern
    const currentQuest = questService.getCurrentQuest();
    const isComplete = currentQuest ? questService.isCurrentQuestComplete() : false;
    const hasQuest = !!currentQuest;

    return html`
      <div class="quest-tracker-container" style="position: fixed; bottom: 30px; right: 30px; z-index: 999; display: flex; flex-direction: column; align-items: flex-end; pointer-events: none;">
        <button class="quest-tracker-btn glass-btn" onClick=${handleTrackerClick} style="pointer-events: auto; width: 64px; height: 64px; border-radius: 50%; padding: 0; font-size: 0; background: radial-gradient(circle at 40% 35%, #1e1e2a, #0a0a0c); border: 2px solid var(--color-gold); box-shadow: 0 10px 35px rgba(0,0,0,0.9), 0 0 25px var(--color-gold-glow); position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 1.8rem; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));">📋</span>
          ${hasQuest ? html`<span class="quest-badge ${isComplete ? 'ready' : ''}" style="position: absolute; top: -4px; right: -4px; background: ${isComplete ? 'var(--color-success)' : 'var(--color-danger)'}; color: #fff; border-radius: 50%; min-width: 24px; height: 24px; font-size: 0.65rem; display: flex; align-items: center; justify-content: center; font-family: var(--font-header); font-weight: 700; border: 2px solid #000; box-shadow: 0 0 15px ${isComplete ? 'rgba(58,122,69,0.6)' : 'var(--color-danger-glow)'}; padding: 0 4px;">${isComplete ? '✓' : '!'}</span>` : ''}
          <span class="quest-tooltip" style="position: absolute; bottom: 74px; right: 0; background: rgba(5,5,7,0.95); backdrop-filter: blur(8px); border: 1px solid rgba(197,160,89,0.2); border-radius: 4px; padding: 0.6rem 1.2rem; font-family: var(--font-header); font-size: 0.8rem; color: var(--color-text-main); white-space: nowrap; opacity: 0; transform: translateY(10px); pointer-events: none; transition: all 0.3s cubic-bezier(0.25,0.8,0.25,1); box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            ${hasQuest ? (isComplete ? '✅ Mission bereit – Klicken zum Abholen' : `📋 ${currentQuest.text}`) : '📋 Keine aktive Mission'}
          </span>
        </button>
      </div>
    `;
  }

  // Modal rendern
  const currentQuest = questService.getCurrentQuest();
  const isComplete = currentQuest ? questService.isCurrentQuestComplete() : false;

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="quest-modal-title">Missionslogbuch</h2>

        <div class="quest-tab-container" style="display: flex; gap: 6px; justify-content: center; margin: 0.5rem 0 1rem 0;">
          <button class="quest-tab-btn ${activeTab === 'main' ? 'active' : ''}" onClick=${() => setActiveTab('main')}>Hauptmissionen</button>
          <button class="quest-tab-btn ${activeTab === 'daily' ? 'active' : ''}" onClick=${() => setActiveTab('daily')}>Tägliche Missionen</button>
        </div>

        <div class="modal-scroll-area" style="max-height: 50vh; overflow-y: auto; padding-right: 0.5rem;">
          ${activeTab === 'main' ? html`
            ${currentIndex >= mainQuests.length ? html`
              <div class="quest-empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--color-text-muted); font-style: italic; border: 1px dashed rgba(197,160,89,0.1);">
                <span class="quest-empty-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🏆</span>
                <div class="quest-empty-text">Alle Hauptmissionen abgeschlossen!</div>
                <div class="quest-empty-hint" style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.3rem;">Du hast alle Herausforderungen gemeistert.</div>
              </div>
            ` : mainQuests.slice(currentIndex, currentIndex + 10).map((q, idx) => {
              const isCurrent = idx === 0;
              const isReady = isCurrent && isComplete;
              return html`
                <div class="quest-card ${isReady ? 'ready' : isCurrent ? 'active' : 'locked'}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(197,160,89,0.06); border-left: 3px solid ${isReady ? 'var(--color-gold)' : isCurrent ? 'var(--color-blue)' : 'var(--color-text-muted)'}; border-radius: 2px; transition: all 0.3s ease;">
                  <div class="quest-info">
                    <div class="quest-title" style="font-family: var(--font-header); font-size: 1rem; color: ${isReady ? 'var(--color-gold)' : isCurrent ? 'var(--color-blue)' : 'var(--color-text-muted)'};">${q.text}</div>
                    <div class="quest-reward" style="color: var(--color-text-muted); font-size: 0.8rem;">🎁 Belohnung: <span class="text-gold">${q.rewardText}</span></div>
                  </div>
                  <div class="quest-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 80px; text-align: center;">
                    ${isReady ? html`<button class="glass-btn primary btn-small" onClick=${() => { questService.claimReward(); }}>✅ Abholen</button>` :
                      isCurrent ? html`<span class="quest-status-text active" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-blue);">⏳ Aktiv</span>` :
                      html`<span class="quest-status-text locked" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">🔒 Gesperrt</span>`}
                  </div>
                </div>
              `;
            })}
          ` : html`
            ${dailyQuests.length === 0 ? html`
              <div class="quest-empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--color-text-muted); font-style: italic; border: 1px dashed rgba(197,160,89,0.1);">
                <span class="quest-empty-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">📅</span>
                <div class="quest-empty-text">Keine täglichen Missionen verfügbar.</div>
                <div class="quest-empty-hint" style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.3rem;">Komm morgen wieder vorbei.</div>
              </div>
            ` : dailyQuests.map(d => {
              const progressPercent = Math.min(100, (d.progress / d.target) * 100);
              return html`
                <div class="quest-card ${d.isClaimed ? 'claimed' : d.isComplete ? 'ready' : 'active'}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(197,160,89,0.06); border-left: 3px solid ${d.isClaimed ? 'var(--color-success)' : d.isComplete ? 'var(--color-gold)' : 'var(--color-blue)'}; border-radius: 2px; transition: all 0.3s ease;">
                  <div class="quest-info">
                    <div class="quest-title" style="font-family: var(--font-header); font-size: 1rem; color: ${d.isClaimed ? 'var(--color-success)' : d.isComplete ? 'var(--color-gold)' : 'var(--color-blue)'};">${d.text}</div>
                    <div class="quest-reward" style="color: var(--color-text-muted); font-size: 0.8rem;">🎁 Belohnung: <span class="text-gold">${d.rewardText}</span></div>
                    ${!d.isClaimed ? html`
                      <div class="quest-progress" style="margin-top: 0.4rem; max-width: 250px;">
                        <div class="progress-bar-container" style="height: 14px;">
                          <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${d.isComplete ? 'var(--color-gold)' : 'var(--color-text-muted)'};"></div>
                          <div class="progress-text" style="font-size: 0.6rem;">${Math.round(progressPercent)}%</div>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                  <div class="quest-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 80px; text-align: center;">
                    ${d.isClaimed ? html`<span class="quest-status-text claimed" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-success);">✅ Erledigt</span>` :
                      d.isComplete ? html`<button class="glass-btn primary btn-small" onClick=${() => { questService.claimDailyReward(d.id); }}>✅ Abholen</button>` :
                      html`<span class="quest-status-text active" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-blue);">⏳ ${d.progress} / ${d.target}</span>`}
                  </div>
                </div>
              `;
            })}
          `}
        </div>
      </div>
    </div>
  `;
}