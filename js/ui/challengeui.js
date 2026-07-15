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
    this.container.replaceChildren(); // DOM Optimierung
    const fragment = document.createDocumentFragment();
    const challenges = this.challengeManager.getChallenges();

    challenges.forEach(challenge => {
      const isCompleted = this.challengeManager.completedChallenges.includes(challenge.id);
      const isActive = this.challengeManager.activeChallenge === challenge.id;
      const canStart = !isCompleted && !this.challengeManager.activeChallenge && this.hero.bossProgress === 0;

      const div = document.createElement('div');
      div.className = `ui-card challenge-card ${isCompleted ? 'completed' : isActive ? 'active' : ''}`;

      div.innerHTML = `
        <div>
          <div class="ui-card-title">${challenge.name}</div>
          <div class="ui-card-desc">${challenge.desc}</div>
          <div class="ui-card-meta" style="color: #9acd9a;">🎁 Belohnung: ${challenge.rewardDesc}</div>
        </div>
      `;

      const btnContainer = document.createElement('div');

      if (isCompleted) {
        btnContainer.innerHTML = `<span style="color:#d4af37;">✅ Gemeistert</span>`;
      } else if (isActive) {
        const abortBtn = document.createElement('button');
        abortBtn.textContent = 'Abbrechen';
        abortBtn.className = 'ui-btn ui-btn-red';
        abortBtn.addEventListener('click', () => this.challengeManager.abortChallenge());
        btnContainer.appendChild(abortBtn);
      } else {
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Starten';
        startBtn.disabled = !canStart;
        startBtn.className = 'ui-btn ui-btn-gold';
        startBtn.addEventListener('click', () => {
          const res = this.challengeManager.startChallenge(challenge.id);
          if (!res.success) alert(res.message);
        });
        btnContainer.appendChild(startBtn);

        if (this.hero.bossProgress > 0 && !this.challengeManager.activeChallenge) {
          const hint = document.createElement('div');
          hint.textContent = '(Nur direkt nach Prestige möglich)';
          hint.style.cssText = 'color: #e0a080; font-size: 0.7rem; margin-top: 0.3rem; text-align: center;';
          btnContainer.appendChild(hint);
        }
      }

      div.appendChild(btnContainer);
      fragment.appendChild(div);
    });
    
    this.container.appendChild(fragment);
  }
}