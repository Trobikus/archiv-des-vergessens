// --- START OF FILE ui/challengeui.js ---

import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class ChallengeUI extends BaseModalUI {
  constructor(context) {
    super('challenges-overlay', 'challenges-close');
    this.eventBus = context.eventBus;
    this.challengeManager = context.challengeManager;
    this.hero = context.hero;

    this.container = document.getElementById('challenges-container');

    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
      if (this.isOpen) this.render();
    });
  }

  onOpen() {
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const challenges = this.challengeManager.getChallenges();

    if (challenges.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'challenges-empty-state';
      emptyMsg.textContent = 'Keine Anomalien verfügbar.';
      this.container.appendChild(emptyMsg);
      return;
    }

    challenges.forEach(challenge => {
      const isCompleted = this.challengeManager.completedChallenges.includes(challenge.id);
      const isActive = this.challengeManager.activeChallenge === challenge.id;
      const canStart = !isCompleted && !this.challengeManager.activeChallenge && this.hero.bossProgress === 0;

      const div = document.createElement('div');
      div.className = 'challenge-card glass-inner-panel';
      div.dataset.status = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
      div.style.borderLeft = `3px solid ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-danger)' : 'var(--color-text-muted)'}`;
      div.style.opacity = isCompleted || isActive ? '1' : '0.6';

      div.innerHTML = `
        <div class="challenge-info">
          <div class="challenge-name" style="color: ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-danger)' : 'var(--color-text-muted)'};">
            ${isCompleted ? '✅ ' : isActive ? '🔥 ' : '🔒 '} ${challenge.name}
          </div>
          <div class="challenge-desc">${challenge.desc}</div>
          <div class="challenge-reward">🎁 Belohnung: ${challenge.rewardDesc}</div>
        </div>
        <div class="challenge-action">
          ${isCompleted ? 
            `<span class="challenge-completed">✅ Gemeistert</span>` :
            isActive ? 
              `<button class="glass-btn btn-danger btn-small abort-btn">❌ Abbrechen</button>` :
              `<button class="glass-btn ${canStart ? 'primary' : ''} btn-small start-btn" ${!canStart ? 'disabled' : ''} data-id="${challenge.id}">⚔️ Starten</button>`
          }
          ${!isActive && !isCompleted && this.hero.bossProgress > 0 ? 
            `<div class="challenge-hint">(Nur direkt nach Prestige)</div>` : ''
          }
        </div>
      `;

      const abortBtn = div.querySelector('.abort-btn');
      if (abortBtn) {
        abortBtn.addEventListener('click', () => this.challengeManager.abortChallenge());
      }

      const startBtn = div.querySelector('.start-btn');
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          const res = this.challengeManager.startChallenge(challenge.id);
          if (!res.success) alert(res.message);
        });
      }

      fragment.appendChild(div);
    });
    
    this.container.appendChild(fragment);
  }
}