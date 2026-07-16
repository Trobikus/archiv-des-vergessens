// --- START OF FILE questui.js ---

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

    this.tabMainBtn = document.getElementById('quest-tab-main');
    this.tabDailyBtn = document.getElementById('quest-tab-daily');
    this.tabMainContent = document.getElementById('quest-content-main');
    this.tabDailyContent = document.getElementById('quest-content-daily');

    this.activeTab = 'main';

    if (this.btnEl) {
      this.btnEl.addEventListener('click', () => this.open());
    }

    if (this.tabMainBtn) this.tabMainBtn.addEventListener('click', () => this.switchTab('main'));
    if (this.tabDailyBtn) this.tabDailyBtn.addEventListener('click', () => this.switchTab('daily'));

    this.eventBus.subscribe(EVENTS.QUEST_COMPLETED, () => this.render());
    this.eventBus.subscribe(EVENTS.QUEST_UPDATED, () => this.render());
    this.eventBus.subscribe(EVENTS.UI_REFRESH_QUEST, () => this.render());
  }

  onOpen() {
    this.switchTab(this.activeTab);
    this.renderModal();
  }

  render() {
    this.renderTracker();
    if (this.isOpen) this.renderModal();
  }

  renderTracker() {
    if (!this.container) return;
    const q = this.questManager.getCurrentQuest();

    const gameContainer = document.getElementById('game-container');
    const isGameActive = gameContainer && gameContainer.classList.contains('active');

    if (!q || !isGameActive) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';

    if (this.questManager.isCurrentQuestComplete()) {
      this.textEl.textContent = 'Mission abgeschlossen! (Missionslog öffnen)';
      this.btnEl.classList.add('quest-ready');
      this.container.classList.add('quest-ready');
    } else {
      this.textEl.textContent = q.text;
      this.btnEl.classList.remove('quest-ready');
      this.container.classList.remove('quest-ready');
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    if (this.tabMainBtn) this.tabMainBtn.classList.toggle('active', tab === 'main');
    if (this.tabDailyBtn) this.tabDailyBtn.classList.toggle('active', tab === 'daily');
    if (this.tabMainContent) this.tabMainContent.style.display = tab === 'main' ? 'block' : 'none';
    if (this.tabDailyContent) this.tabDailyContent.style.display = tab === 'daily' ? 'block' : 'none';
  }

  renderModal() {
    if (this.tabMainContent) {
      this.tabMainContent.replaceChildren();
      const fragment = document.createDocumentFragment();
      const allQuests = this.questManager.mainQuests;
      const currentIndex = this.questManager.questIndex;
      const toShow = allQuests.slice(currentIndex, currentIndex + 10);

      if (toShow.length === 0) {
        this.tabMainContent.innerHTML = '<div class="text-disabled text-italic">Alle Hauptmissionen abgeschlossen!</div>';
      } else {
        toShow.forEach((q, i) => {
          const isCurrent = (i === 0);
          const isReady = isCurrent && this.questManager.isCurrentQuestComplete();

          let cardClass = 'quest-card flex-between';
          if (isReady) cardClass += ' ready';
          else if (!isCurrent) cardClass += ' locked';

          const titleColorClass = isReady ? 'text-gold' : (isCurrent ? 'text-highlight' : 'text-muted');

          const div = document.createElement('div');
          div.className = cardClass;

          let btnHtml = '';
          if (isReady) {
            btnHtml = `<button class="quest-btn btn-claim-quest">Abholen</button>`;
          } else if (isCurrent) {
            btnHtml = `<span class="text-success text-sm">Aktiv</span>`;
          } else {
            btnHtml = `<span class="text-disabled text-sm">Gesperrt</span>`;
          }

          div.innerHTML = `
            <div>
              <div class="text-bold quest-title ${titleColorClass}">${q.text}</div>
              <div class="text-muted text-sm">Belohnung: ${q.rewardText}</div>
            </div>
            <div>${btnHtml}</div>
          `;

          if (isReady) {
            div.querySelector('button').addEventListener('click', () => {
              this.questManager.claimReward();
              this.renderModal();
            });
          }
          fragment.appendChild(div);
        });
        this.tabMainContent.appendChild(fragment);
      }
    }

    if (this.tabDailyContent) {
      this.tabDailyContent.replaceChildren();
      const fragment = document.createDocumentFragment();
      const dailies = this.questManager.getDailyQuests();

      dailies.forEach(d => {
        let cardClass = 'quest-card flex-between';
        if (d.isClaimed) cardClass += ' claimed';
        else if (d.isComplete) cardClass += ' ready';

        const div = document.createElement('div');
        div.className = cardClass;

        let rightHtml = '';
        if (d.isClaimed) {
          rightHtml = `<span class="text-muted">✅ Erledigt</span>`;
        } else if (d.isComplete) {
          rightHtml = `<button class="quest-btn btn-claim-quest claim-daily-btn">Abholen</button>`;
        } else {
          rightHtml = `<span class="text-muted">${d.progress} / ${d.target}</span>`;
        }

        div.innerHTML = `
          <div>
            <div class="text-highlight text-bold">${d.text}</div>
            <div class="text-muted text-sm">Belohnung: ${d.rewardText}</div>
          </div>
          <div>${rightHtml}</div>
        `;

        if (d.isComplete && !d.isClaimed) {
          div.querySelector('.claim-daily-btn').addEventListener('click', () => {
            this.questManager.claimDailyReward(d.id);
            this.renderModal();
          });
        }
        fragment.appendChild(div);
      });
      this.tabDailyContent.appendChild(fragment);
    }
  }
}