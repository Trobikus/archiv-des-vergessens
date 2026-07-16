// --- START OF FILE storyui.js ---

import { generateStoryBosses } from '../data/bosses.js';
import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js';
import BaseModalUI from './basemodal.js';

export default class StoryUI extends BaseModalUI {
  constructor(context) {
    super('story-overlay', 'story-close');
    this.eventBus = context.eventBus;
    this.storyManager = context.storyManager;
    this.hero = context.hero;

    this.currentViewChapter = 1;
    this.maxUnlockedChapter = 1;

    this.bossList = document.getElementById('story-boss-list');
    this.chapterInfo = document.getElementById('story-chapter-info');
    this.currentBossName = document.getElementById('story-current-boss-name');
    this.currentBossHp = document.getElementById('story-boss-hp');
    this.currentBossAtk = document.getElementById('story-boss-atk');
    this.currentBossDef = document.getElementById('story-boss-def');
    this.fightResult = document.getElementById('story-fight-result');
    this.fightBtn = document.getElementById('story-fight-btn');
    this.prevBtn = document.getElementById('story-prev-chapter');
    this.nextBtn = document.getElementById('story-next-chapter');
    this.lockedOverlay = document.getElementById('story-locked-overlay');

    this._bossHash = '';

    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.changeChapter(-1));
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.changeChapter(1));

    this.fightBtn.addEventListener('click', () => {
      if (this.fightResult) this.fightResult.innerHTML = '';
      this.storyManager.startBossFromHub();
      this.fightBtn.disabled = true;
      this.fightBtn.textContent = '⚔️ Kampf läuft...';
    });

    this.eventBus.subscribe(EVENTS.UI_OPEN_STORY, () => this.open());
    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
      if (this.isOpen) this.render();
    });
    this.eventBus.subscribe(EVENTS.STORY_UPDATED, () => {
      if (this.isOpen) this.render();
    });

    // Präziser Timer direkt aus der Spiel-Logik
    this.eventBus.subscribe(EVENTS.GAME_RENDER_TICK, () => {
      if (this.isOpen && this.storyManager.battleInProgress) {
        const timeLeft = Math.max(0, this.storyManager.battleTimer / 1000);
        if (timeLeft > 0) {
          this.fightBtn.textContent = `⚔️ Kampf läuft... (${timeLeft.toFixed(1)}s)`;
          this.fightBtn.disabled = true;
        } else {
          this.fightBtn.textContent = '⚔️ Berechne...';
        }
      }
    });

    this.eventBus.subscribe(EVENTS.STORY_BATTLE_RESULT, (data) => {
      if (this.isOpen && this.fightResult) {
        if (data.victory) {
          this.fightResult.innerHTML = `<div class="boss-result-box boss-result-victory">🏆 SIEG! ${data.boss.name} besiegt!</div>`;
          document.body.classList.add('boss-defeat-flash');
          setTimeout(() => document.body.classList.remove('boss-defeat-flash'), 600);
        } else {
          this.fightResult.innerHTML = `<div class="boss-result-box boss-result-defeat">💀 NIEDERLAGE! Du warst zu schwach.</div>`;
        }

        // Kampf-Button zurücksetzen, aber erst nach kurzer Verzögerung
        setTimeout(() => {
          this.fightBtn.disabled = false;
          this.fightBtn.textContent = '⚔️ Bosskampf starten';
          this.fightBtn.classList.remove('disabled');
        }, 800);
      }
    });
  }

  onOpen() {
    this.maxUnlockedChapter = this.hero.getChapter();
    this.currentViewChapter = this.maxUnlockedChapter;
    if (this.fightResult) this.fightResult.innerHTML = '';

    // Kampf-Button zurücksetzen, falls kein Kampf läuft
    if (!this.storyManager.battleInProgress) {
      this.fightBtn.disabled = false;
      this.fightBtn.textContent = '⚔️ Bosskampf starten';
    }

    requestAnimationFrame(() => this.render());
  }

  onClose() {
    if (!this.storyManager.battleInProgress) {
      this.fightBtn.disabled = false;
      this.fightBtn.textContent = '⚔️ Bosskampf starten';
    }
  }

  changeChapter(dir) {
    const nextChap = this.currentViewChapter + dir;
    if (nextChap >= 1 && nextChap <= 10) {
      this.currentViewChapter = nextChap;
      this.render();
    }
  }

  render() {
    if (!this.hero || !this.isOpen) return;
    const allBosses = generateStoryBosses();
    const currentBoss = this.storyManager.getCurrentBoss();
    this.maxUnlockedChapter = this.hero.getChapter();

    this.chapterInfo.textContent = `Kapitel ${this.currentViewChapter} - ${this._getChapterName(this.currentViewChapter)}`;
    this.prevBtn.disabled = this.currentViewChapter <= 1;
    this.nextBtn.disabled = this.currentViewChapter >= 10;

    const chapterBosses = allBosses.filter(b => b.chapter === this.currentViewChapter);

    if (this.currentViewChapter > this.maxUnlockedChapter) {
      this.lockedOverlay.style.display = 'flex';
      this.bossList.style.opacity = '0.05';
      this.bossList.style.pointerEvents = 'none';
      this.currentBossName.textContent = '???';
      this.currentBossName.style.color = 'var(--color-text-muted)';
      if (this.currentBossHp) this.currentBossHp.textContent = '???';
      if (this.currentBossAtk) this.currentBossAtk.textContent = '???';
      if (this.currentBossDef) this.currentBossDef.textContent = '???';
      this.fightBtn.style.display = 'none';
    } else {
      this.lockedOverlay.style.display = 'none';
      this.bossList.style.opacity = '1';
      this.bossList.style.pointerEvents = 'auto';
      this.fightBtn.style.display = 'block';

      if (this.currentViewChapter === this.maxUnlockedChapter && currentBoss) {
        this.currentBossName.textContent = currentBoss.name;
        this.currentBossName.style.color = 'var(--color-danger)';
        if (this.currentBossHp) this.currentBossHp.textContent = formatNumber(currentBoss.hp);
        if (this.currentBossAtk) this.currentBossAtk.textContent = formatNumber(currentBoss.attack);
        if (this.currentBossDef) this.currentBossDef.textContent = formatNumber(currentBoss.defense);

        if (!this.storyManager.battleInProgress) {
          this.fightBtn.disabled = false;
          this.fightBtn.textContent = '⚔️ Bosskampf starten';
        }
      } else if (this.currentViewChapter < this.maxUnlockedChapter) {
        this.currentBossName.textContent = '✅ Kapitel abgeschlossen';
        this.currentBossName.style.color = 'var(--color-success)';
        if (this.currentBossHp) this.currentBossHp.textContent = '-';
        if (this.currentBossAtk) this.currentBossAtk.textContent = '-';
        if (this.currentBossDef) this.currentBossDef.textContent = '-';
        this.fightBtn.disabled = true;
        this.fightBtn.textContent = '✅ Abgeschlossen';
      }
    }

    const bossHash = this.hero.defeatedBosses.join('|') + '|' + (currentBoss ? currentBoss.id : 'none') + '|' + this.currentViewChapter;
    if (this._bossHash !== bossHash) {
      this._bossHash = bossHash;
      this._renderBossList(chapterBosses);
    }
  }

  _renderBossList(chapterBosses) {
    // Entferne überschüssige Einträge
    while (this.bossList.children.length > chapterBosses.length) {
      this.bossList.removeChild(this.bossList.lastChild);
    }

    chapterBosses.forEach((boss, index) => {
      let div = this.bossList.children[index];
      if (!div) {
        div = document.createElement('div');
        div.className = 'story-boss-entry ui-card';
        div.innerHTML = `
          <span class="boss-name" style="font-family: var(--font-header); font-size: 0.95rem;"></span>
          <span class="boss-status"></span>
        `;
        this.bossList.appendChild(div);
      }

      const nameSpan = div.querySelector('.boss-name');
      const statusSpan = div.querySelector('.boss-status');
      const isChapterBoss = index === chapterBosses.length - 1;

      nameSpan.textContent = `${index + 1}. ${boss.name} ${isChapterBoss ? '👑' : ''}`;
      statusSpan.className = 'boss-status';

      if (this.hero.defeatedBosses.includes(boss.id)) {
        statusSpan.textContent = '✅ Besiegt';
        statusSpan.classList.add('defeated');
        div.style.borderLeft = '3px solid var(--color-success)';
      } else if (this.storyManager.getCurrentBoss() && this.storyManager.getCurrentBoss().id === boss.id) {
        statusSpan.textContent = '⚔️ Aktiv';
        statusSpan.classList.add('current');
        div.style.borderLeft = '3px solid var(--color-danger)';
        div.style.background = 'rgba(248, 113, 113, 0.04)';
      } else {
        statusSpan.textContent = '🔒 Ausstehend';
        statusSpan.classList.add('pending');
        div.style.borderLeft = '3px solid rgba(255,255,255,0.05)';
        div.style.background = 'transparent';
      }
    });
  }

  _getChapterName(chapter) {
    const names = {
      1: 'Die Erwachenden', 2: 'Die Flüsternden', 3: 'Die Schattenwächter',
      4: 'Die Vergessenen', 5: 'Die Hüter des Archivs', 6: 'Die Mneme-Wächter',
      7: 'Die Alten', 8: 'Die Zeitlosen', 9: 'Die Schöpfer', 10: 'Das Ende aller Erinnerungen'
    };
    return names[chapter] || `Kapitel ${chapter}`;
  }
}