/**
 * ============================================================
 * FILE: ui/preact/story/StoryUI.js – Story & Bosse (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function StoryUI({ stateManager, eventBus, services }) {
  const { storyService, heroService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [fightResult, setFightResult] = useState('');

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const storyState = useStateSelector(stateManager, (state) => state.story);
  const bosses = storyService.getBosses();

  useEventBus(eventBus, EVENTS.UI_OPEN_STORY, () => setIsOpen(true));
  useEventBus(eventBus, 'story:battleResult', (data) => {
    setFightResult(data.victory ? `🏆 SIEG! ${data.boss.name} besiegt!` : `💀 NIEDERLAGE! Du warst zu schwach.`);
    setTimeout(() => setFightResult(''), 3000);
  });

  if (!isOpen) return null;

  const maxUnlockedChapter = hero.prestige.bossProgress > 0 ? Math.floor(hero.prestige.bossProgress / 10) + 1 : 1;
  const chapterBosses = bosses.filter(b => b.chapter === currentChapter);
  const currentBoss = storyService.getCurrentBoss();
  const isChapterUnlocked = currentChapter <= maxUnlockedChapter;
  const isBossFightActive = storyState.battleInProgress;

  const handleFight = () => {
    if (isBossFightActive) return;
    storyService.startBossFight();
  };

  const changeChapter = (dir) => {
    const next = currentChapter + dir;
    if (next >= 1 && next <= 10) setCurrentChapter(next);
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 700px; max-width: 95vw; max-height: 90vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="story-modal-title">📖 Story &amp; Bosse</h2>

        <!-- Chapter-Navigation -->
        <div class="story-chapter-nav">
          <button class="glass-btn btn-small" onClick=${() => changeChapter(-1)} disabled=${currentChapter <= 1}>◄</button>
          <div class="chapter-title">Kapitel ${currentChapter}</div>
          <button class="glass-btn btn-small" onClick=${() => changeChapter(1)} disabled=${currentChapter >= 10}>►</button>
        </div>

        <!-- Boss-Liste -->
        <div class="story-boss-list" style="max-height: 200px; overflow-y: auto; padding-right: 0.3rem;">
          ${!isChapterUnlocked ? html`
            <div class="story-locked-overlay" style="display: flex;">
              <div class="lock-icon">🔒</div>
              <div class="lock-title">KAPITEL GESPERRT</div>
              <div class="lock-hint">Besiege die Bosse des vorherigen Kapitels.</div>
            </div>
          ` : chapterBosses.map((boss, idx) => {
            const isDefeated = hero.prestige.defeatedBosses.includes(boss.id);
            const isCurrent = currentBoss && currentBoss.id === boss.id;
            return html`
              <div class="story-boss-entry ${isDefeated ? 'defeated' : isCurrent ? 'current' : 'pending'}">
                <span class="boss-name">${idx + 1}. ${boss.name} ${idx === chapterBosses.length - 1 ? html`<span class="boss-crown">👑</span>` : ''}</span>
                <span class="boss-status ${isDefeated ? 'defeated' : isCurrent ? 'current' : 'pending'}">
                  ${isDefeated ? '✅ Besiegt' : isCurrent ? '⚔️ Aktiv' : '🔒 Ausstehend'}
                </span>
              </div>
            `;
          })}
        </div>

        <!-- Aktueller Boss -->
        ${isChapterUnlocked && currentBoss ? html`
          <div class="story-current-boss">
            <div class="boss-header">AKTUELLES ZIEL</div>
            <div class="boss-name-display">${currentBoss.name}</div>
            <div class="boss-stats-grid">
              <div class="boss-stat"><span class="stat-label">❤️ HP</span><span class="stat-value hp">${currentBoss.hp}</span></div>
              <div class="boss-stat"><span class="stat-label">⚔️ Angriff</span><span class="stat-value atk">${currentBoss.attack}</span></div>
              <div class="boss-stat"><span class="stat-label">🛡️ Verteidigung</span><span class="stat-value def">${currentBoss.defense}</span></div>
            </div>
            ${fightResult ? html`<div class="story-fight-result">${fightResult}</div>` : ''}
            <button class="glass-btn primary story-fight-btn" onClick=${handleFight} disabled=${isBossFightActive}>
              ${isBossFightActive ? '⚔️ Kampf läuft...' : '⚔️ Bosskampf starten'}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}