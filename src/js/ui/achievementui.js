import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class AchievementUI extends BaseModalUI {
  constructor(context) {
    super('achievement-modal-overlay', 'achievement-close');
    this.eventBus = context.eventBus;
    this.achievementManager = context.achievementManager;

    this.listContainer = document.getElementById('achievement-list');
    this.openBtn = document.getElementById('open-achievements-btn');

    if (this.openBtn) this.openBtn.addEventListener('click', () => this.open());

    this.eventBus.subscribe(EVENTS.ACHIEVEMENT_UNLOCKED, () => { if (this.isOpen) this.render(); });
    this.eventBus.subscribe(EVENTS.ACHIEVEMENT_CLAIMED, () => { if (this.isOpen) this.render(); });
  }

  onOpen() {
    this.render();
  }

  triggerDopamineExplosion(x, y, rowElement) {
    rowElement.classList.add('flash-gold');
    setTimeout(() => rowElement.classList.remove('flash-gold'), 600);
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 300);

    if (window.spawnClickParticles) {
        window.spawnClickParticles(x, y);
        window.spawnClickParticles(x+10, y-10);
        window.spawnClickParticles(x-10, y+10);
    }
  }

  render() {
    if (!this.listContainer) return;
    const achievements = this.achievementManager.getAchievements();

    if (achievements.length === 0) {
      this.listContainer.textContent = 'Keine Erfolge verfügbar.';
      this.listContainer.style.color = '#5a5a6a';
      this.listContainer.style.fontStyle = 'italic';
      return;
    }

    this.listContainer.replaceChildren(); // Performance: Besser als innerHTML = ''
    const fragment = document.createDocumentFragment();

    achievements.forEach(ach => {
      const div = document.createElement('div');
      div.className = `ui-card achievement-card ${ach.claimed ? 'claimed' : ach.achieved ? 'achieved' : 'locked'}`;

      let rewardStr = [];
      if (ach.reward.particles) rewardStr.push(`${ach.reward.particles} Partikel`);
      if (ach.reward.relics) rewardStr.push(`${ach.reward.relics} Relikte`);
      if (ach.reward.artifacts) rewardStr.push(`${ach.reward.artifacts} Artefakte`);
      if (ach.reward.title) rewardStr.push(`Titel: ${ach.reward.title}`);

      const infoDiv = document.createElement('div');
      
      const titleEl = document.createElement('div');
      titleEl.className = 'ui-card-title ach-title';
      titleEl.textContent = ach.label;
      
      const descEl = document.createElement('div');
      descEl.className = 'ui-card-desc ach-desc';
      descEl.textContent = `Belohnung: ${rewardStr.join(' | ')}`;
      
      const metaEl = document.createElement('div');
      metaEl.className = 'ui-card-meta ach-meta';
      metaEl.textContent = `Fortschritt: ${ach.progress} / ${ach.target}`;

      infoDiv.append(titleEl, descEl, metaEl);

      const actionContainer = document.createElement('div');
      actionContainer.className = 'ach-action';

      if (ach.claimed) {
        actionContainer.innerHTML = `<span style="color:#8a7a5a;">✅ Abgeholt</span>`;
      } else if (ach.achieved) {
        const btn = document.createElement('button');
        btn.className = 'ui-btn ui-btn-gold';
        btn.textContent = 'Abholen';
        btn.addEventListener('click', (e) => {
          this.triggerDopamineExplosion(e.clientX, e.clientY, div);
          setTimeout(() => this.achievementManager.claimReward(ach.id), 300);
        });
        actionContainer.appendChild(btn);
      } else {
        actionContainer.innerHTML = `<span style="color:#5a5a6a;">🔒 Gesperrt</span>`;
      }

      div.append(infoDiv, actionContainer);
      fragment.appendChild(div);
    });

    this.listContainer.appendChild(fragment);
  }
}