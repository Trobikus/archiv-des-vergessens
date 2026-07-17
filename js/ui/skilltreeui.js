// ============================================================
// FILE: js/ui/skilltreeui.js – Talentbaum
// ============================================================
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

        this._skillCards = new Map();
        this._renderScheduled = false;

        this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._scheduleRender());
    }

    _scheduleRender() {
        if (this._renderScheduled || !this.isOpen) return;
        this._renderScheduled = true;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            if (this.isOpen) this.render();
        });
    }

    onOpen() {
        this.render();
    }

    render() {
        this.pointsDisplay.textContent = this.hero.prestigePoints;
        const skills = this.skillTreeManager.getSkills();

        if (skills.length === 0) {
            this.container.innerHTML = `<div class="skilltree-empty-state"><span class="text-muted">Keine Talente verfügbar.</span></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const skill of skills) {
            let div = this._skillCards.get(skill.id);
            const isUnlocked = this.hero.unlockedSkills.includes(skill.id);
            const canUnlock = !isUnlocked && skill.req.every(r => this.hero.unlockedSkills.includes(r)) && this.hero.prestigePoints >= skill.cost;

            if (!div) {
                div = document.createElement('div');
                div.className = 'skilltree-card glass-inner-panel';
                div.innerHTML = `
                    <div class="skilltree-info">
                        <div class="skilltree-name"></div>
                        <div class="skilltree-desc"></div>
                        <div class="skilltree-reqs"></div>
                    </div>
                    <div class="skilltree-action"></div>
                `;
                this._skillCards.set(skill.id, div);
            }

            div.dataset.status = isUnlocked ? 'unlocked' : canUnlock ? 'available' : 'locked';
            div.style.borderLeft = `3px solid ${isUnlocked ? 'var(--color-success)' : canUnlock ? 'var(--color-gold)' : 'var(--color-text-muted)'}`;
            div.style.opacity = isUnlocked || canUnlock ? '1' : '0.5';

            const nameEl = div.querySelector('.skilltree-name');
            nameEl.textContent = (isUnlocked ? '✅ ' : '') + skill.name;
            nameEl.style.color = isUnlocked ? 'var(--color-success)' : canUnlock ? 'var(--color-gold)' : 'var(--color-text-muted)';

            div.querySelector('.skilltree-desc').textContent = skill.desc;
            div.querySelector('.skilltree-reqs').textContent = `Voraussetzungen: ${skill.req.length === 0 ? 'Keine' : skill.req.map(r => {
                const s = this.skillTreeManager.skills[r];
                return s ? s.name : r;
            }).join(', ')}`;

            const actionEl = div.querySelector('.skilltree-action');
            if (!isUnlocked) {
                const btn = document.createElement('button');
                btn.className = `glass-btn primary btn-small unlock-btn`;
                btn.disabled = !canUnlock;
                btn.textContent = `${skill.cost} PP`;
                btn.dataset.id = skill.id;
                btn.addEventListener('click', () => {
                    this.skillTreeManager.unlockSkill(skill.id);
                    this._scheduleRender();
                });
                actionEl.replaceChildren(btn);
            } else {
                actionEl.innerHTML = `<span class="skilltree-unlocked">✅ Aktiv</span>`;
            }

            fragment.appendChild(div);
        }

        this.container.replaceChildren(fragment);
    }

    destroy() {
        this._skillCards.clear();
        super.destroy();
    }
}