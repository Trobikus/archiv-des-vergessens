// ============================================================
// FILE: js/ui/challengeui.js – Anomalien
// ============================================================
import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class ChallengeUI extends BaseModalUI {
    constructor(context) {
        super('challenges-overlay', 'challenges-close');
        this.eventBus = context.eventBus;
        this.challengeManager = context.challengeManager;
        this.hero = context.hero;

        this.container = document.getElementById('challenges-container');
        this._challengeCards = new Map();
        this._renderScheduled = false;

        this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => this._scheduleRender());
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
        const challenges = this.challengeManager.getChallenges();

        if (challenges.length === 0) {
            this.container.innerHTML = `<div class="challenges-empty-state">Keine Anomalien verfügbar.</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const challenge of challenges) {
            let div = this._challengeCards.get(challenge.id);
            const isCompleted = this.challengeManager.completedChallenges.includes(challenge.id);
            const isActive = this.challengeManager.activeChallenge === challenge.id;
            const canStart = !isCompleted && !this.challengeManager.activeChallenge && this.hero.bossProgress === 0;

            if (!div) {
                div = document.createElement('div');
                div.className = 'challenge-card glass-inner-panel';
                div.innerHTML = `
                    <div class="challenge-info">
                        <div class="challenge-name"></div>
                        <div class="challenge-desc"></div>
                        <div class="challenge-reward"></div>
                    </div>
                    <div class="challenge-action"></div>
                `;
                this._challengeCards.set(challenge.id, div);
            }

            div.dataset.status = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
            div.style.borderLeft = `3px solid ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-danger)' : 'var(--color-text-muted)'}`;
            div.style.opacity = isCompleted || isActive ? '1' : '0.6';

            const nameEl = div.querySelector('.challenge-name');
            nameEl.textContent = (isCompleted ? '✅ ' : isActive ? '🔥 ' : '🔒 ') + challenge.name;
            nameEl.style.color = isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-danger)' : 'var(--color-text-muted)';

            div.querySelector('.challenge-desc').textContent = challenge.desc;
            div.querySelector('.challenge-reward').textContent = `🎁 Belohnung: ${challenge.rewardDesc}`;

            const actionEl = div.querySelector('.challenge-action');
            if (isCompleted) {
                actionEl.innerHTML = `<span class="challenge-completed">✅ Gemeistert</span>`;
            } else if (isActive) {
                const abortBtn = document.createElement('button');
                abortBtn.className = 'glass-btn btn-danger btn-small abort-btn';
                abortBtn.textContent = '❌ Abbrechen';
                abortBtn.addEventListener('click', () => {
                    this.challengeManager.abortChallenge();
                    this._scheduleRender();
                });
                actionEl.replaceChildren(abortBtn);
            } else {
                const startBtn = document.createElement('button');
                startBtn.className = `glass-btn ${canStart ? 'primary' : ''} btn-small start-btn`;
                startBtn.disabled = !canStart;
                startBtn.textContent = '⚔️ Starten';
                startBtn.dataset.id = challenge.id;
                startBtn.addEventListener('click', () => {
                    const res = this.challengeManager.startChallenge(challenge.id);
                    if (!res.success) alert(res.message);
                    this._scheduleRender();
                });
                actionEl.replaceChildren(startBtn);
                if (!canStart && this.hero.bossProgress > 0) {
                    const hint = document.createElement('div');
                    hint.className = 'challenge-hint';
                    hint.textContent = '(Nur direkt nach Prestige)';
                    actionEl.appendChild(hint);
                }
            }

            fragment.appendChild(div);
        }

        this.container.replaceChildren(fragment);
    }

    destroy() {
        this._challengeCards.clear();
        super.destroy();
    }
}