// --- START OF FILE ui/skilltreeui.js ---

import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class SkillTreeUI extends BaseModalUI {
  constructor(context) {
    super('skilltree-overlay', 'skilltree-close');
    this.eventBus = context.eventBus;
    this.skillTreeManager = context.skillTreeManager;
    this.hero = context.hero;

    this.container = document.getElementById('skilltree-container');
    this.pointsDisplay = document.getElementById('skilltree-points');

    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
      if (this.isOpen) this.render();
    });
  }

  onOpen() {
    this.render();
  }

  render() {
    this.pointsDisplay.textContent = this.hero.prestigePoints;
    const skills = this.skillTreeManager.getSkills();

    // Container leeren, aber mit Fragment neu aufbauen für Konsistenz
    this.container.innerHTML = '';

    if (skills.length === 0) {
      this.container.innerHTML = `
        <div class="skilltree-empty-state">
          <span class="text-muted">Keine Talente verfügbar.</span>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    skills.forEach((skill) => {
      const isUnlocked = this.hero.unlockedSkills.includes(skill.id);
      const canUnlock = !isUnlocked && skill.req.every(r => this.hero.unlockedSkills.includes(r)) && this.hero.prestigePoints >= skill.cost;

      const div = document.createElement('div');
      div.className = 'skilltree-card glass-inner-panel';
      div.dataset.status = isUnlocked ? 'unlocked' : canUnlock ? 'available' : 'locked';
      div.style.borderLeft = `3px solid ${isUnlocked ? 'var(--color-success)' : canUnlock ? 'var(--color-gold)' : 'var(--color-text-muted)'}`;
      div.style.opacity = isUnlocked || canUnlock ? '1' : '0.5';

      div.innerHTML = `
        <div class="skilltree-info">
          <div class="skilltree-name" style="color: ${isUnlocked ? 'var(--color-success)' : canUnlock ? 'var(--color-gold)' : 'var(--color-text-muted)'};">
            ${isUnlocked ? '✅ ' : ''}${skill.name}
          </div>
          <div class="skilltree-desc">${skill.desc}</div>
          <div class="skilltree-reqs">Voraussetzungen: ${skill.req.length === 0 ? 'Keine' : skill.req.map(r => {
            const s = this.skillTreeManager.skills[r];
            return s ? s.name : r;
          }).join(', ')}</div>
        </div>
        <div class="skilltree-action">
          ${!isUnlocked ? 
            `<button class="glass-btn primary btn-small unlock-btn" ${!canUnlock ? 'disabled' : ''} data-id="${skill.id}">
              ${skill.cost} PP
            </button>` :
            `<span class="skilltree-unlocked">✅ Aktiv</span>`
          }
        </div>
      `;

      const btn = div.querySelector('.unlock-btn');
      if (btn) {
        btn.addEventListener('click', () => this.skillTreeManager.unlockSkill(skill.id));
      }

      fragment.appendChild(div);
    });

    this.container.appendChild(fragment);
  }
}