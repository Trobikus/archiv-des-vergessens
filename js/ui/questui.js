// ============================================================
// FILE: js/ui/questui.js – Missionslogbuch
// ============================================================
import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class QuestUI extends BaseModalUI {
    constructor(context) {
        super('quest-modal-overlay', 'quest-modal-close');
        this.eventBus = context.eventBus;
        this.questManager = context.questManager;

        this.container = document.getElementById('quest-tracker-container');
        this.btnEl = document.getElementById('quest-tracker-btn');
        this.textEl = document.getElementById('quest-text');
        this.slideOutEl = document.getElementById('quest-slide-out');

        this.tabMainBtn = document.getElementById('quest-tab-main');
        this.tabDailyBtn = document.getElementById('quest-tab-daily');
        this.tabMainContent = document.getElementById('quest-content-main');
        this.tabDailyContent = document.getElementById('quest-content-daily');

        this.activeTab = 'main';
        this._renderScheduled = false;

        if (this.container) this.container.style.display = 'flex';
        if (this.btnEl) this.btnEl.addEventListener('click', () => this.open());

        this.tabMainBtn.addEventListener('click', () => this.switchTab('main'));
        this.tabDailyBtn.addEventListener('click', () => this.switchTab('daily'));

        this.eventBus.subscribe(EVENTS.QUEST_COMPLETED, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.QUEST_UPDATED, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.UI_REFRESH_QUEST, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.UI_ENTER_GAME, () => this._scheduleRender());
    }

    _scheduleRender() {
        if (this._renderScheduled) return;
        this._renderScheduled = true;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            this.render();
            if (this.isOpen) this.renderModal();
        });
    }

    onOpen() {
        this.switchTab(this.activeTab);
        this.renderModal();
    }

    render() {
        if (this.container) this.container.style.display = 'flex';
        this.renderBadge();
        if (this.isOpen) this.renderModal();
    }

    renderBadge() {
        if (!this.btnEl) return;
        const oldBadge = this.btnEl.querySelector('.quest-badge');
        if (oldBadge) oldBadge.remove();
        const oldTooltip = this.btnEl.querySelector('.quest-tooltip');
        if (oldTooltip) oldTooltip.remove();

        const q = this.questManager.getCurrentQuest();
        const isComplete = q ? this.questManager.isCurrentQuestComplete() : false;
        const hasQuest = !!q;

        if (hasQuest) {
            const badge = document.createElement('span');
            badge.className = `quest-badge ${isComplete ? 'ready' : ''}`;
            badge.textContent = isComplete ? '✓' : '!';
            this.btnEl.appendChild(badge);
        }

        const tooltip = document.createElement('span');
        tooltip.className = 'quest-tooltip';
        if (hasQuest && isComplete) {
            tooltip.textContent = '✅ Mission bereit – Klicken zum Abholen';
        } else if (hasQuest) {
            tooltip.textContent = `📋 ${q.text}`;
        } else {
            tooltip.textContent = '📋 Keine aktive Mission – starte ein neues Spiel';
        }
        this.btnEl.appendChild(tooltip);
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.tabMainBtn.classList.toggle('active', tab === 'main');
        this.tabDailyBtn.classList.toggle('active', tab === 'daily');
        this.tabMainContent.style.display = tab === 'main' ? 'block' : 'none';
        this.tabDailyContent.style.display = tab === 'daily' ? 'block' : 'none';
        if (this.isOpen) this.renderModal();
    }

    renderModal() {
        // Hauptmissionen
        this.tabMainContent.replaceChildren();
        const fragmentMain = document.createDocumentFragment();
        const allQuests = this.questManager.mainQuests;
        const currentIndex = this.questManager.questIndex;
        const toShow = allQuests.slice(currentIndex, currentIndex + 10);

        if (toShow.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'quest-empty-state';
            emptyDiv.innerHTML = `
                <span class="quest-empty-icon">🏆</span>
                <div class="quest-empty-text">Alle Hauptmissionen abgeschlossen!</div>
                <div class="quest-empty-hint">Du hast alle Herausforderungen gemeistert.</div>
            `;
            this.tabMainContent.appendChild(emptyDiv);
        } else {
            toShow.forEach((q, i) => {
                const isCurrent = (i === 0);
                const isReady = isCurrent && this.questManager.isCurrentQuestComplete();

                const div = document.createElement('div');
                div.className = `quest-card ${isReady ? 'ready' : isCurrent ? 'active' : 'locked'}`;

                let actionHtml = '';
                if (isReady) {
                    actionHtml = `<button class="glass-btn primary btn-small btn-claim-quest">✅ Abholen</button>`;
                } else if (isCurrent) {
                    actionHtml = `<span class="quest-status-text active">⏳ Aktiv</span>`;
                } else {
                    actionHtml = `<span class="quest-status-text locked">🔒 Gesperrt</span>`;
                }

                div.innerHTML = `
                    <div class="quest-info">
                        <div class="quest-title">${q.text}</div>
                        <div class="quest-reward">🎁 Belohnung: <span class="text-gold">${q.rewardText}</span></div>
                    </div>
                    <div class="quest-action">${actionHtml}</div>
                `;

                if (isReady) {
                    div.querySelector('.btn-claim-quest').addEventListener('click', () => {
                        this.questManager.claimReward();
                        this._scheduleRender();
                    });
                }

                fragmentMain.appendChild(div);
            });
            this.tabMainContent.appendChild(fragmentMain);
        }

        // Tägliche Missionen
        this.tabDailyContent.replaceChildren();
        const fragmentDaily = document.createDocumentFragment();
        const dailies = this.questManager.getDailyQuests();

        if (dailies.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'quest-empty-state';
            emptyDiv.innerHTML = `
                <span class="quest-empty-icon">📅</span>
                <div class="quest-empty-text">Keine täglichen Missionen verfügbar.</div>
                <div class="quest-empty-hint">Komm morgen wieder vorbei.</div>
            `;
            this.tabDailyContent.appendChild(emptyDiv);
        } else {
            dailies.forEach(d => {
                const isClaimed = d.isClaimed;
                const isComplete = d.isComplete;
                const progressPercent = Math.min(100, (d.progress / d.target) * 100);

                const div = document.createElement('div');
                div.className = `quest-card ${isClaimed ? 'claimed' : isComplete ? 'ready' : 'active'}`;

                let actionHtml = '';
                if (isClaimed) {
                    actionHtml = `<span class="quest-status-text claimed">✅ Erledigt</span>`;
                } else if (isComplete) {
                    actionHtml = `<button class="glass-btn primary btn-small claim-daily-btn">✅ Abholen</button>`;
                } else {
                    actionHtml = `<span class="quest-status-text active">⏳ ${d.progress} / ${d.target}</span>`;
                }

                const progressBarHtml = !isClaimed ? `
                    <div class="quest-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${isComplete ? 'var(--color-gold)' : 'var(--color-text-muted)'};"></div>
                            <div class="progress-text">${Math.round(progressPercent)}%</div>
                        </div>
                    </div>
                ` : '';

                div.innerHTML = `
                    <div class="quest-info">
                        <div class="quest-title">${d.text}</div>
                        <div class="quest-reward">🎁 Belohnung: <span class="text-gold">${d.rewardText}</span></div>
                        ${progressBarHtml}
                    </div>
                    <div class="quest-action">${actionHtml}</div>
                `;

                if (isComplete && !isClaimed) {
                    div.querySelector('.claim-daily-btn').addEventListener('click', () => {
                        this.questManager.claimDailyReward(d.id);
                        this._scheduleRender();
                    });
                }

                fragmentDaily.appendChild(div);
            });
            this.tabDailyContent.appendChild(fragmentDaily);
        }
    }

    destroy() {
        this.btnEl.removeEventListener('click', this.open);
        this.tabMainBtn.removeEventListener('click', this.switchTab);
        this.tabDailyBtn.removeEventListener('click', this.switchTab);
        super.destroy();
    }
}