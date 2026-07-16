// ============================================================
// FILE: ui/questui.js (AAA-Design - Missionslogbuch)
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

    // ---------- Button IMMER sichtbar ----------
    if (this.container) {
      this.container.style.display = 'flex';
    }

    // ---------- Button öffnet Modal ----------
    if (this.btnEl) {
      this.btnEl.addEventListener('click', () => this.open());
    }

    // ---------- Tabs ----------
    if (this.tabMainBtn) {
      this.tabMainBtn.addEventListener('click', () => this.switchTab('main'));
    }
    if (this.tabDailyBtn) {
      this.tabDailyBtn.addEventListener('click', () => this.switchTab('daily'));
    }

    // ---------- Events ----------
    this.eventBus.subscribe(EVENTS.QUEST_COMPLETED, () => this.render());
    this.eventBus.subscribe(EVENTS.QUEST_UPDATED, () => this.render());
    this.eventBus.subscribe(EVENTS.UI_REFRESH_QUEST, () => this.render());
    this.eventBus.subscribe(EVENTS.UI_ENTER_GAME, () => this.render());
  }

  onOpen() {
    this.switchTab(this.activeTab);
    this.renderModal();
  }

  render() {
    // Container IMMER sichtbar
    if (this.container) {
      this.container.style.display = 'flex';
    }
    this.renderBadge();
    if (this.isOpen) this.renderModal();
  }

  // ---------- Badge + Tooltip ----------
  renderBadge() {
    if (!this.btnEl) return;
    
    // Alte Elemente entfernen
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

  // ---------- Tabs umschalten ----------
  switchTab(tab) {
    this.activeTab = tab;
    if (this.tabMainBtn) {
      this.tabMainBtn.classList.toggle('active', tab === 'main');
    }
    if (this.tabDailyBtn) {
      this.tabDailyBtn.classList.toggle('active', tab === 'daily');
    }
    if (this.tabMainContent) {
      this.tabMainContent.style.display = tab === 'main' ? 'block' : 'none';
    }
    if (this.tabDailyContent) {
      this.tabDailyContent.style.display = tab === 'daily' ? 'block' : 'none';
    }
  }

  // ---------- Modal-Inhalt rendern ----------
  renderModal() {
    // ---- Hauptmissionen ----
    if (this.tabMainContent) {
      this.tabMainContent.replaceChildren();
      const fragment = document.createDocumentFragment();
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

          let statusClass = 'locked';
          let statusText = 'Gesperrt';
          let statusColor = 'locked';
          let actionHtml = '';

          if (isReady) {
            statusClass = 'ready';
            statusText = 'Bereit';
            statusColor = 'ready';
            actionHtml = `<button class="glass-btn primary btn-small btn-claim-quest">✅ Abholen</button>`;
          } else if (isCurrent) {
            statusClass = 'active';
            statusText = 'Aktiv';
            statusColor = 'active';
            actionHtml = `<span class="quest-status-text active">⏳ Aktiv</span>`;
          } else {
            statusClass = 'locked';
            statusText = 'Gesperrt';
            statusColor = 'locked';
            actionHtml = `<span class="quest-status-text locked">🔒 Gesperrt</span>`;
          }

          const div = document.createElement('div');
          div.className = `quest-card ${statusClass}`;

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
              this.renderModal();
              this.renderBadge();
            });
          }

          fragment.appendChild(div);
        });
        this.tabMainContent.appendChild(fragment);
      }
    }

    // ---- Tägliche Missionen ----
    if (this.tabDailyContent) {
      this.tabDailyContent.replaceChildren();
      const fragment = document.createDocumentFragment();
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

          let statusClass = 'locked';
          let actionHtml = '';

          if (isClaimed) {
            statusClass = 'claimed';
            actionHtml = `<span class="quest-status-text claimed">✅ Erledigt</span>`;
          } else if (isComplete) {
            statusClass = 'ready';
            actionHtml = `<button class="glass-btn primary btn-small claim-daily-btn">✅ Abholen</button>`;
          } else {
            statusClass = 'active';
            actionHtml = `<span class="quest-status-text active">⏳ ${d.progress} / ${d.target}</span>`;
          }

          const div = document.createElement('div');
          div.className = `quest-card ${statusClass}`;

          // Fortschrittsbalken nur anzeigen, wenn nicht abgeholt
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
              this.renderModal();
              this.renderBadge();
            });
          }

          fragment.appendChild(div);
        });
        this.tabDailyContent.appendChild(fragment);
      }
    }
  }
}