// ============================================================
// FILE: js/ui/storyui.js – Story & Bosse
// ============================================================
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
        this._renderScheduled = false;

        this._boundPrev = () => this.changeChapter(-1);
        this._boundNext = () => this.changeChapter(1);
        this._boundFight = () => this._startFight();

        this.prevBtn.addEventListener('click', this._boundPrev);
        this.nextBtn.addEventListener('click', this._boundNext);
        this.fightBtn.addEventListener('click', this._boundFight);

        this.eventBus.subscribe(EVENTS.UI_OPEN_STORY, () => this.open());
        this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.STORY_UPDATED, () => this._scheduleRender());
        this.eventBus.subscribe(EVENTS.STORY_BATTLE_RESULT, (data) => this._onBattleResult(data));
        this.eventBus.subscribe(EVENTS.GAME_RENDER_TICK, () => this._updateFightButton());
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
        this.maxUnlockedChapter = this.hero.getChapter();
        this.currentViewChapter = this.maxUnlockedChapter;
        if (this.fightResult) this.fightResult.innerHTML = '';
        this.fightBtn.disabled = this.storyManager.battleInProgress;
        this.fightBtn.textContent = this.storyManager.battleInProgress ? '⚔️ Kampf läuft...' : '⚔️ Bosskampf starten';
        this.render();
    }

    onClose() {
        this.fightBtn.disabled = false;
        this.fightBtn.textContent = '⚔️ Bosskampf starten';
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
            this.fightBtn.disabled = true;
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
                } else {
                    this.fightBtn.disabled = true;
                    this.fightBtn.textContent = '⚔️ Kampf läuft...';
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
        this.bossList.innerHTML = '';
        if (chapterBosses.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-muted text-italic text-center';
            emptyDiv.style.padding = '1rem';
            emptyDiv.textContent = 'Keine Bosse in diesem Kapitel.';
            this.bossList.appendChild(emptyDiv);
            return;
        }

        const fragment = document.createDocumentFragment();
        const currentBoss = this.storyManager.getCurrentBoss();

        for (let index = 0; index < chapterBosses.length; index++) {
            const boss = chapterBosses[index];
            const isDefeated = this.hero.defeatedBosses.includes(boss.id);
            const isCurrent = currentBoss && currentBoss.id === boss.id;
            const isChapterBoss = index === chapterBosses.length - 1;

            const div = document.createElement('div');
            div.className = `story-boss-entry ${isDefeated ? 'defeated' : isCurrent ? 'current' : 'pending'}`;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'boss-name';
            nameSpan.innerHTML = `${index + 1}. ${boss.name} ${isChapterBoss ? '<span class="boss-crown">👑</span>' : ''}`;
            const statusSpan = document.createElement('span');
            statusSpan.className = 'boss-status';
            if (isDefeated) {
                statusSpan.textContent = '✅ Besiegt';
                statusSpan.classList.add('defeated');
            } else if (isCurrent) {
                statusSpan.textContent = '⚔️ Aktiv';
                statusSpan.classList.add('current');
            } else {
                statusSpan.textContent = '🔒 Ausstehend';
                statusSpan.classList.add('pending');
            }
            div.appendChild(nameSpan);
            div.appendChild(statusSpan);
            fragment.appendChild(div);
        }
        this.bossList.appendChild(fragment);
    }

    _updateFightButton() {
        if (!this.isOpen) return;
        if (this.storyManager.battleInProgress) {
            const timeLeft = Math.max(0, this.storyManager.battleTimer / 1000);
            if (timeLeft > 0) {
                this.fightBtn.textContent = `⚔️ Kampf läuft... (${timeLeft.toFixed(1)}s)`;
                this.fightBtn.disabled = true;
            } else {
                this.fightBtn.textContent = '⚔️ Berechne...';
                this.fightBtn.disabled = true;
            }
        } else {
            const currentBoss = this.storyManager.getCurrentBoss();
            if (currentBoss && this.currentViewChapter === this.maxUnlockedChapter) {
                this.fightBtn.disabled = false;
                this.fightBtn.textContent = '⚔️ Bosskampf starten';
            }
        }
    }

    _startFight() {
        if (this.fightResult) this.fightResult.innerHTML = '';
        this.storyManager.startBossFromHub();
        this.fightBtn.disabled = true;
        this.fightBtn.textContent = '⚔️ Kampf läuft...';
    }

    _onBattleResult(data) {
        if (!this.isOpen || !this.fightResult) return;
        if (data.victory) {
            this.fightResult.innerHTML = `<div class="result-box victory">🏆 SIEG! ${data.boss.name} besiegt!</div>`;
            document.body.classList.add('boss-defeat-flash');
            setTimeout(() => document.body.classList.remove('boss-defeat-flash'), 600);
        } else {
            this.fightResult.innerHTML = `<div class="result-box defeat">💀 NIEDERLAGE! Du warst zu schwach.</div>`;
        }
        setTimeout(() => {
            this.fightBtn.disabled = false;
            this.fightBtn.textContent = '⚔️ Bosskampf starten';
        }, 800);
        this._scheduleRender();
    }

    _getChapterName(chapter) {
        const names = {
            1: 'Die Erwachenden',
            2: 'Die Flüsternden',
            3: 'Die Schattenwächter',
            4: 'Die Vergessenen',
            5: 'Die Hüter des Archivs',
            6: 'Die Mneme-Wächter',
            7: 'Die Alten',
            8: 'Die Zeitlosen',
            9: 'Die Schöpfer',
            10: 'Das Ende aller Erinnerungen'
        };
        return names[chapter] || `Kapitel ${chapter}`;
    }

    destroy() {
        this.prevBtn.removeEventListener('click', this._boundPrev);
        this.nextBtn.removeEventListener('click', this._boundNext);
        this.fightBtn.removeEventListener('click', this._boundFight);
        super.destroy();
    }
}