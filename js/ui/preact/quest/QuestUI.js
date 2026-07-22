/**
 * ============================================================
 * FILE: ui/preact/quest/QuestUI.js – Missionslogbuch (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useCallback } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function QuestUI({ stateManager, eventBus, services }) {
  const { questService, i18nService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [, setTick] = useState(0);

  const [lang, setLang] = useState(i18nService.getLanguage());
  useEventBus(eventBus, 'i18n:languageChanged', (newLang) => {
    setLang(newLang);
  });

  const getLocText = (obj, prop = 'text') => {
    if (!obj) return '';
    if (lang === 'en' && obj[prop + '_en']) {
      return obj[prop + '_en'];
    }
    return obj[prop] || '';
  };

  const currentView = useStateSelector(stateManager, (state) => state.system?.currentView || 'menu');
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const quests = useStateSelector(stateManager, (state) => state.quests);
  const mainQuests = questService._mainQuests;
  const currentIndex = quests.mainIndex;
  const dailyQuests = questService.getDailyQuests();

  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEventBus(eventBus, EVENTS.UI_REFRESH_QUEST, forceUpdate);
  useEventBus(eventBus, EVENTS.QUEST_UPDATED, forceUpdate);
  useEventBus(eventBus, EVENTS.QUEST_COMPLETED, forceUpdate);

  // Quest-Tracker-Button (FAB)
  const handleTrackerClick = () => setIsOpen(true);

  // Hüllen-UIs (Missions FAB / Logbuch) nur im Hub oder Spiel anzeigen
  const isViewActive = currentView === 'game' || currentView === 'hub';
  if (!isViewActive) return null;

  // Modal-Inhalt
  if (!isOpen) {
    // Nur den Tracker-Button rendern
    const currentQuest = questService.getCurrentQuest();
    const isComplete = currentQuest ? questService.isCurrentQuestComplete() : false;
    const hasQuest = !!currentQuest;

    return html`
      <div class="quest-tracker-container">
        <button class="quest-tracker-btn glass-btn" onClick=${handleTrackerClick}>
          ${hasQuest ? html`<span class="quest-badge ${isComplete ? 'ready' : ''}">${isComplete ? '✓' : '!'}</span>` : ''}
          <span class="quest-tooltip">
            ${hasQuest ? (isComplete ? (lang === 'de' ? '✅ Mission bereit – Klicken zum Abholen' : '✅ Quest ready – Click to claim') : `📋 ${getLocText(currentQuest, 'text')}`) : (lang === 'de' ? '📋 Keine aktive Mission' : '📋 No active quest')}
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
        <h2 class="quest-modal-title">${lang === 'de' ? 'Missionslogbuch' : 'Quest Log'}</h2>

        <div class="quest-tab-container" style="display: flex; gap: 6px; justify-content: center; margin: 0.5rem 0 1rem 0;">
          <button class="quest-tab-btn ${activeTab === 'main' ? 'active' : ''}" onClick=${() => setActiveTab('main')}>${lang === 'de' ? 'Hauptmissionen' : 'Main Quests'}</button>
          <button class="quest-tab-btn ${activeTab === 'daily' ? 'active' : ''}" onClick=${() => setActiveTab('daily')}>${lang === 'de' ? 'Tägliche Missionen' : 'Daily Quests'}</button>
        </div>

        <div class="modal-scroll-area" style="max-height: 50vh; overflow-y: auto; padding-right: 0.5rem;">
          ${activeTab === 'main' ? html`
            ${currentIndex >= mainQuests.length ? html`
              <div class="quest-empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--color-text-muted); font-style: italic; border: 1px dashed rgba(197,160,89,0.1);">
                <span class="quest-empty-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🏆</span>
                <div class="quest-empty-text">${lang === 'de' ? 'Alle Hauptmissionen abgeschlossen!' : 'All Main Quests completed!'}</div>
                <div class="quest-empty-hint" style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.3rem;">${lang === 'de' ? 'Du hast alle Herausforderungen gemeistert.' : 'You have mastered all challenges.'}</div>
              </div>
            ` : mainQuests.slice(currentIndex, currentIndex + 3).map((q, idx) => {
              const isCurrent = idx === 0;
              const isReady = isCurrent && isComplete;
              return html`
                <div class="quest-card ${isReady ? 'ready' : isCurrent ? 'active' : 'locked'}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(197,160,89,0.06); border-left: 3px solid ${isReady ? 'var(--color-gold)' : isCurrent ? 'var(--color-blue)' : 'var(--color-text-muted)'}; border-radius: 2px; transition: all 0.3s ease;">
                  <div class="quest-info">
                    <div class="quest-title" style="font-family: var(--font-header); font-size: 1rem; color: ${isReady ? 'var(--color-gold)' : isCurrent ? 'var(--color-blue)' : 'var(--color-text-muted)'};">${getLocText(q, 'text')}</div>
                    <div class="quest-reward" style="color: var(--color-text-muted); font-size: 0.8rem;">🎁 ${lang === 'de' ? 'Belohnung' : 'Reward'}: <span class="text-gold">${getLocText(q, 'rewardText')}</span></div>
                  </div>
                  <div class="quest-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 80px; text-align: center;">
                    ${isReady ? html`<button class="glass-btn primary btn-small" onClick=${() => { questService.claimReward(); }}>✅ ${lang === 'de' ? 'Abholen' : 'Claim'}</button>` :
                      isCurrent ? html`<span class="quest-status-text active" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-blue);">⏳ ${lang === 'de' ? 'Aktiv' : 'Active'}</span>` :
                      html`<span class="quest-status-text locked" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">🔒 ${lang === 'de' ? 'Gesperrt' : 'Locked'}</span>`}
                  </div>
                </div>
              `;
            })}
          ` : html`
            ${dailyQuests.length === 0 ? html`
              <div class="quest-empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--color-text-muted); font-style: italic; border: 1px dashed rgba(197,160,89,0.1);">
                <span class="quest-empty-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">📅</span>
                <div class="quest-empty-text">${lang === 'de' ? 'Keine täglichen Missionen verfügbar.' : 'No daily quests available.'}</div>
                <div class="quest-empty-hint" style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.3rem;">${lang === 'de' ? 'Komm morgen wieder vorbei.' : 'Come back tomorrow.'}</div>
              </div>
            ` : dailyQuests.map(d => {
              const progressPercent = Math.min(100, (d.progress / d.target) * 100);
              return html`
                <div class="quest-card ${d.isClaimed ? 'claimed' : d.isComplete ? 'ready' : 'active'}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(197,160,89,0.06); border-left: 3px solid ${d.isClaimed ? 'var(--color-success)' : d.isComplete ? 'var(--color-gold)' : 'var(--color-blue)'}; border-radius: 2px; transition: all 0.3s ease;">
                  <div class="quest-info">
                    <div class="quest-title" style="font-family: var(--font-header); font-size: 1rem; color: ${d.isClaimed ? 'var(--color-success)' : d.isComplete ? 'var(--color-gold)' : 'var(--color-blue)'};">${getLocText(d, 'text')}</div>
                    <div class="quest-reward" style="color: var(--color-text-muted); font-size: 0.8rem;">🎁 ${lang === 'de' ? 'Belohnung' : 'Reward'}: <span class="text-gold">${getLocText(d, 'rewardText')}</span></div>
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
                    ${d.isClaimed ? html`<span class="quest-status-text claimed" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-success);">✅ ${lang === 'de' ? 'Erledigt' : 'Done'}</span>` :
                      d.isComplete ? html`<button class="glass-btn primary btn-small" onClick=${() => { questService.claimDailyReward(d.id); }}>✅ ${lang === 'de' ? 'Abholen' : 'Claim'}</button>` :
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