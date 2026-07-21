/**
 * ============================================================
 * FILE: ui/preact/challenges/ChallengeUI.js – Anomalien
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function ChallengeUI({ stateManager, eventBus, services }) {
  const { challengeService, heroService } = services;
  const [isOpen, setIsOpen] = useState(false);

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const challenges = useStateSelector(stateManager, () => challengeService.getChallenges());
  const activeChallenge = useStateSelector(stateManager, (state) => state.challenges.active);
  const completed = useStateSelector(stateManager, (state) => state.challenges.completed);

  useEventBus(eventBus, 'ui:openChallenges', () => setIsOpen(true));
  useEventBus(eventBus, 'challenge:started', () => {});
  useEventBus(eventBus, 'challenge:completed', () => {});

  if (!isOpen) return null;

  const handleStart = (id) => {
    const result = challengeService.startChallenge(id);
    if (result.success) {
      eventBus.publish('ui:showToast', {
        message: `🔥 ${result.message}`,
        type: 'success',
        duration: 3000
      });
    } else {
      eventBus.publish('ui:showToast', {
        message: `❌ ${result.message}`,
        type: 'warning',
        duration: 3000
      });
    }
  };

  const handleAbort = () => {
    const result = challengeService.abortChallenge();
    if (result.success) {
      eventBus.publish('ui:showToast', {
        message: `❌ Anomalie abgebrochen.`,
        type: 'warning',
        duration: 2000
      });
    }
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 700px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text text-danger cinzel text-center">Erinnerungs-Anomalien</h2>
        <div class="text-muted text-sm mb-1 glass-inner-panel text-center" style="padding: 0.8rem; margin-bottom: 1rem;">
          Meistere extreme Herausforderungen für permanente Belohnungen.<br />
          <span class="text-danger">Anomalien können nur direkt nach einem Prestige gestartet werden.</span>
        </div>

        <div class="modal-scroll-area" style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
          ${challenges.map(challenge => {
            const isCompleted = completed.includes(challenge.id);
            const isActive = activeChallenge === challenge.id;
            const canStart = !isCompleted && !activeChallenge && hero.prestige.bossProgress === 0;

            return html`
              <div class="challenge-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; border-left: 3px solid ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-danger)' : 'var(--color-text-muted)'}; opacity: ${isCompleted || isActive ? 1 : 0.6}; transition: all 0.3s ease;">
                <div class="challenge-info" style="flex: 1; min-width: 0;">
                  <div class="challenge-name" style="font-family: var(--font-header); font-size: 1.05rem; color: ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-danger)' : 'var(--color-text-muted)'};">${isCompleted ? '✅ ' : isActive ? '🔥 ' : '🔒 '} ${challenge.name}</div>
                  <div class="challenge-desc" style="color: var(--color-text-muted); font-size: 0.85rem;">${challenge.desc}</div>
                  <div class="challenge-reward" style="color: #9acd9a; font-size: 0.8rem; margin-top: 0.1rem;">🎁 ${challenge.rewardDesc}</div>
                </div>
                <div class="challenge-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 100px; text-align: center;">
                  ${isCompleted ? html`<span class="challenge-completed" style="color: var(--color-success); font-weight: bold;">✅ Gemeistert</span>` :
                    isActive ? html`
                      <button class="glass-btn btn-danger btn-small abort-btn" onClick=${handleAbort}>❌ Abbrechen</button>
                    ` : html`
                      <button class="glass-btn ${canStart ? 'primary' : ''} btn-small start-btn" onClick=${() => handleStart(challenge.id)} disabled=${!canStart}>
                        ⚔️ Starten
                      </button>
                      ${!canStart && hero.prestige.bossProgress > 0 ? html`<div class="challenge-hint" style="color: var(--color-text-muted); font-size: 0.65rem; margin-top: 0.2rem;">(Nur direkt nach Prestige)</div>` : ''}
                    `}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}