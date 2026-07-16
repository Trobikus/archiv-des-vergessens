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

    while (this.container.children.length > skills.length) {
      this.container.removeChild(this.container.lastChild);
    }

    skills.forEach((skill, index) => {
      const isUnlocked = this.hero.unlockedSkills.includes(skill.id);
      const canUnlock = !isUnlocked && skill.req.every(r => this.hero.unlockedSkills.includes(r)) && this.hero.prestigePoints >= skill.cost;

      let div = this.container.children[index];
      if (!div) {
        div = document.createElement('div');
        div.innerHTML = `
          <div>
            <div class="ui-card-title skill-title"></div>
            <div class="ui-card-desc skill-desc"></div>
          </div>
          <div class="skill-action"></div>
        `;
        this.container.appendChild(div);
      }

      div.className = `ui-card skill-card ${isUnlocked ? 'achieved' : canUnlock ? 'can-unlock' : 'locked'}`;
      div.querySelector('.skill-title').textContent = skill.name;
      div.querySelector('.skill-desc').textContent = skill.desc;

      const actionContainer = div.querySelector('.skill-action');

      if (!isUnlocked) {
        if (!actionContainer.querySelector('button')) {
          actionContainer.innerHTML = `<button class="ui-btn ui-btn-gold"></button>`;
          actionContainer.querySelector('button').addEventListener('click', () => this.skillTreeManager.unlockSkill(skill.id));
        }
        const btn = actionContainer.querySelector('button');
        btn.textContent = `${skill.cost} PP`;
        btn.disabled = !canUnlock;
      } else {
        actionContainer.innerHTML = `<span style="color:#9acd9a;">✅ Aktiv</span>`;
      }
    });
  }
}