/**
 * ============================================================
 * FILE: ui/preact/story/StoryUI.js – Story & Bosse (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect, useRef } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function StoryUI({ stateManager, eventBus, services }) {
  const { storyService, heroService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [fightResult, setFightResult] = useState('');

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const storyState = useStateSelector(stateManager, (state) => state.story);
  const bosses = storyService.getBosses();

  const logRef = useRef(null);

  useEventBus(eventBus, EVENTS.UI_OPEN_STORY, () => setIsOpen(true));
  useEventBus(eventBus, 'story:battleResult', (data) => {
    setFightResult(data.victory ? `🏆 SIEG! ${data.boss.name} besiegt!` : `💀 NIEDERLAGE! Du warst zu schwach.`);
    setTimeout(() => setFightResult(''), 3000);
  });

  // Auto-Scroll für das Kampfprotokoll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [storyState.battleState ? storyState.battleState.combatLog.length : 0]);

  if (!isOpen) return null;

  const maxUnlockedChapter = hero.prestige.bossProgress > 0 ? Math.floor(hero.prestige.bossProgress / 10) + 1 : 1;
  const chapterBosses = bosses.filter(b => b.chapter === currentChapter);
  const currentBoss = storyService.getCurrentBoss();
  const isChapterUnlocked = currentChapter <= maxUnlockedChapter;
  const isBossFightActive = storyState.battleInProgress;
  const battleState = storyState.battleState;

  const handleFight = () => {
    if (isBossFightActive) return;
    storyService.startBossFight();
  };

  const changeChapter = (dir) => {
    const next = currentChapter + dir;
    if (next >= 1 && next <= 10) setCurrentChapter(next);
  };

  const getLogColorClass = (type) => {
    switch (type) {
      case 'spell-spear': return '#ff9999';
      case 'spell-shield': return '#99bbff';
      case 'spell-heal': return '#99ff99';
      case 'crit': return '#ffcc00';
      case 'dodge': return '#33ff99';
      case 'damage-deal': return '#ffffff';
      case 'damage-taken': return '#ff4d4d';
      case 'enrage': return '#ff6600';
      case 'shield-absorb': return '#4d79ff';
      default: return '#aaaaaa';
    }
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 700px; max-width: 95vw; max-height: 90vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" id="story-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="story-modal-title">📖 Story & Bosse</h2>

        <!-- Kapitel-Navigation (ausblenden während eines aktiven Kampfes für besseren Fokus) -->
        ${!isBossFightActive ? html`
          <div class="story-chapter-nav">
            <button class="glass-btn btn-small" onClick=${() => changeChapter(-1)} disabled=${currentChapter <= 1}>◄</button>
            <div class="chapter-title">Kapitel ${currentChapter}</div>
            <button class="glass-btn btn-small" onClick=${() => changeChapter(1)} disabled=${currentChapter >= 10}>►</button>
          </div>
        ` : ''}

        <!-- Boss-Liste (ausblenden während eines aktiven Kampfes) -->
        ${!isBossFightActive ? html`
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
        ` : ''}

        <!-- KAMPFSYSTEM V3.0 (REALTIME-BATTLE & DOCKED DIALOGUES) -->
        ${isBossFightActive && battleState ? html`
          <div class="story-battle-active glass-inner-panel" style="position: relative; margin-top: 1rem; padding: 1.2rem; border-top: 1px solid rgba(255,255,255,0.1); overflow: hidden; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between;">
            
            <!-- STORY CUTSCENE OVERLAY (DOCK DIALOGUES v3.0) -->
            ${battleState.activeDialogue ? html`
              <div class="dialogue-cutscene-overlay" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 100; padding: 1.5rem; backdrop-filter: blur(5px); animation: fadeIn 0.35s ease-out;">
                <div class="dialogue-cutscene-box glass-panel" style="width: 100%; max-width: 520px; padding: 1.6rem; border: 1.5px solid var(--color-gold); background: rgba(14, 10, 7, 0.98); box-shadow: 0 0 35px rgba(197, 160, 89, 0.35); border-radius: 8px;">
                  <div style="display: flex; gap: 1.2rem; align-items: flex-start; margin-bottom: 1.2rem;">
                    <span style="font-size: 3.8rem; filter: drop-shadow(0 0 12px var(--color-gold-glow)); line-height: 1;">${battleState.activeDialogue.portrait}</span>
                    <div style="flex: 1;">
                      <div class="cinzel" style="color: var(--color-gold); font-size: 1.2rem; font-weight: bold; margin-bottom: 0.4rem; letter-spacing: 0.6px; text-shadow: 0 0 8px rgba(197,160,89,0.2);">${battleState.activeDialogue.speaker}</div>
                      <div style="color: #ede2cf; font-size: 0.95rem; line-height: 1.55; font-style: italic; font-family: 'Outfit', sans-serif;">
                        "${battleState.activeDialogue.text}"
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: flex-end;">
                    <button class="glass-btn primary cinzel" onClick=${() => storyService.advanceDialogue()} style="padding: 0.45rem 1.4rem; font-size: 0.9rem; border-color: var(--color-gold); cursor: pointer; letter-spacing: 0.5px;">
                      Weiter ➔
                    </button>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Kampfverlauf-Content -->
            <div>
              <!-- BOSS-BEREICH -->
              <div class="boss-status-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span class="boss-name-label cinzel" style="font-size: 1.2rem; color: var(--color-danger); font-weight: bold; text-shadow: 0 0 8px rgba(255,0,0,0.2);">
                  👹 ${battleState.boss.name} ${battleState.activeEffects.isEnraged ? html`<span style="color: #ff6600; font-weight: bold; animation: pulse 1s infinite;">🔥 WÜTEND!</span>` : ''}
                </span>
                <span style="font-size: 0.85rem; color: var(--color-text-muted);">Kapitel ${battleState.boss.chapter} Boss</span>
              </div>
              
              <!-- Boss Lebensbalken -->
              <div class="boss-hp-container" style="background: rgba(255, 0, 0, 0.15); border: 1px solid rgba(255, 0, 0, 0.3); height: 20px; border-radius: 4px; overflow: hidden; position: relative; box-shadow: 0 0 10px rgba(255,0,0,0.1); margin-bottom: 1.2rem;">
                <div class="boss-hp-bar" style="background: linear-gradient(90deg, #ff3333, #ff6666); width: ${(battleState.bossHp / battleState.bossMaxHp) * 100}%; height: 100%; transition: width 0.2s ease-out; position: absolute; left: 0; top: 0;"></div>
                <div class="boss-hp-text" style="position: absolute; width: 100%; text-align: center; font-size: 0.85rem; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); line-height: 18px; z-index: 2;">
                  ${battleState.bossHp} / ${battleState.bossMaxHp} HP
                </div>
              </div>

              <!-- COMBAT LOG (ECHTZEIT-PROTOKOLL) -->
              <div class="combat-log-title cinzel" style="font-size: 0.9rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">Kampfprotokoll</div>
              <div class="combat-log-box" ref=${logRef} style="height: 180px; overflow-y: auto; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 0.8rem; margin-bottom: 1.2rem; font-family: monospace; font-size: 0.82rem; line-height: 1.5; box-shadow: inset 0 0 15px rgba(0,0,0,0.5);">
                ${battleState.combatLog.map((log, idx) => html`
                  <div key=${idx} style="color: ${getLogColorClass(log.type)}; margin-bottom: 0.3rem; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 0.15rem;">
                    ${log.text}
                  </div>
                `)}
              </div>
            </div>

            <div>
              <!-- HELDEN-BEREICH -->
              <div class="hero-status-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span class="hero-name-label cinzel" style="font-size: 1.1rem; color: var(--color-success); font-weight: bold; text-shadow: 0 0 8px rgba(0,255,0,0.1);">
                  🛡️ Deine Vitalität
                </span>
              </div>

              <!-- Helden Lebensbalken mit Schild-Overlay -->
              <div class="hero-hp-container" style="background: rgba(0, 255, 0, 0.1); border: 1px solid rgba(0, 255, 0, 0.3); height: 20px; border-radius: 4px; overflow: hidden; position: relative; box-shadow: 0 0 10px rgba(0,255,0,0.1); margin-bottom: 1.2rem;">
                <div class="hero-hp-bar" style="background: linear-gradient(90deg, #2eb82e, #47d147); width: ${(battleState.heroHp / battleState.heroMaxHp) * 100}%; height: 100%; transition: width 0.2s ease-out; position: absolute; left: 0; top: 0;"></div>
                
                <!-- Dynamisches Schild-Overlay -->
                ${battleState.activeEffects.shieldAmount > 0 ? html`
                  <div class="hero-shield-bar" style="background: rgba(77, 121, 255, 0.7); width: ${Math.min(100, (battleState.activeEffects.shieldAmount / battleState.heroMaxHp) * 100)}%; height: 100%; position: absolute; left: 0; top: 0; border-right: 3px solid #ffffff; box-shadow: 0 0 10px #4d79ff; transition: width 0.2s ease-out; mix-blend-mode: screen; z-index: 1;"></div>
                ` : ''}

                <div class="hero-hp-text" style="position: absolute; width: 100%; text-align: center; font-size: 0.85rem; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); line-height: 18px; z-index: 2;">
                  ${battleState.heroHp} / ${battleState.heroMaxHp} HP ${battleState.activeEffects.shieldAmount > 0 ? html`<span style="color: #99ccff;"> (+${battleState.activeEffects.shieldAmount} Schild)</span>` : ''}
                </div>
              </div>

              <!-- SPELL BAR (AKTIVE FÄHIGKEITEN) -->
              <div class="spell-bar-title cinzel" style="font-size: 0.9rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; text-align: center;">Ausgerüstete Mneme-Zauber</div>
              <div class="story-spells-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem;">
                ${battleState.spells.map(spell => {
                  const hasCooldown = spell.cooldown > 0;
                  const cdSeconds = hasCooldown ? (spell.cooldown / 1000).toFixed(1) : 0;

                  return html`
                    <button class="spell-btn glass-btn" style="position: relative; display: flex; flex-direction: column; align-items: center; padding: 0.6rem; border-color: ${spell.color}; overflow: hidden; background: rgba(0,0,0,0.3); border-radius: 6px; transition: all 0.2s ease-in-out;" onClick=${() => storyService.castSpell(spell.id)} disabled=${hasCooldown || !!battleState.activeDialogue}>
                      <!-- Cooldown-Anzeige Overlay -->
                      ${hasCooldown ? html`
                        <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #ff4d4d; font-size: 1.1rem; z-index: 3; font-family: monospace;">
                          ${cdSeconds}s
                        </div>
                      ` : ''}
                      <span class="spell-icon" style="font-size: 1.5rem; margin-bottom: 0.2rem;">${spell.icon}</span>
                      <span class="spell-name" style="font-size: 0.85rem; font-weight: bold; color: var(--color-text);">${spell.name}</span>
                      <span class="spell-desc" style="font-size: 0.65rem; color: var(--color-text-muted); text-align: center; margin-top: 0.2rem; display: block; line-height: 1.25;">${spell.desc}</span>
                    </button>
                  `;
                })}
              </div>
            </div>

          </div>
        ` : ''}

        <!-- AKTELLER BOSS (Normal-Anzeige außerhalb des Kampfes) -->
        ${isChapterUnlocked && currentBoss && !isBossFightActive ? html`
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