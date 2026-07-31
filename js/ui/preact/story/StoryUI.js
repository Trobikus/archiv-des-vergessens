/**
 * ============================================================
 * FILE: ui/preact/story/StoryUI.js – Story & Bosse (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect, useRef } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import Actions from '../../../core/state/actions.js';
import { FloatingDamageOverlay } from '../combat/FloatingDamageOverlay.js';
import { CombatAnalyticsModal } from '../combat/CombatAnalyticsModal.js';
import { StoryFightsIntroSequence } from './StoryFightsIntroSequence.js';

export function StoryUI({ stateManager, eventBus, services }) {
  const { storyService, heroService, combatAnalyticsService, i18nService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [fightResult, setFightResult] = useState('');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [chapterBanner, setChapterBanner] = useState('');
  
  const [isGravityShift, setIsGravityShift] = useState(false);
  const [isVictoryBurst, setIsVictoryBurst] = useState(false);

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const storyState = useStateSelector(stateManager, (state) => state.story);
  const bosses = storyService.getBosses();
  const lang = i18nService?.getLanguage?.() || 'de';

  const logRef = useRef(null);

  const maxUnlockedChapter = hero.prestige.bossProgress > 0 ? Math.floor(hero.prestige.bossProgress / 10) + 1 : 1;
  const prevUnlockedRef = useRef(maxUnlockedChapter);

  // Automatischer Kapitelwechsel bei Freischaltung & Banner-Anzeige
  useEffect(() => {
    if (maxUnlockedChapter > prevUnlockedRef.current) {
      setCurrentChapter(maxUnlockedChapter);
      setChapterBanner(`✨ KAPITEL ${maxUnlockedChapter} FREIGESCHALTET! ✨`);
      const timer = setTimeout(() => setChapterBanner(''), 4500);
      prevUnlockedRef.current = maxUnlockedChapter;
      return () => clearTimeout(timer);
    } else if (currentChapter < maxUnlockedChapter && prevUnlockedRef.current < maxUnlockedChapter) {
      setCurrentChapter(maxUnlockedChapter);
      prevUnlockedRef.current = maxUnlockedChapter;
    }
  }, [maxUnlockedChapter, currentChapter]);

  const openStoryModal = () => {
    setShowIntro(false);
    setIsOpen(true);
  };

  const completeIntro = () => {
    stateManager.dispatch(Actions.markStoryFightsIntroSeen(), 'story/introSeen');
    openStoryModal();
  };

  useEventBus(eventBus, EVENTS.UI_OPEN_STORY, () => {
    if (showIntro) return;
    const system = stateManager.getState()?.system || {};
    const introSeen = system.storyFightsIntroSeen === true;
    // Während des Tutorials kein Cinematic – #story-close muss erreichbar bleiben
    const tutorialActive = system.tutorialFinished !== true;
    if (!introSeen && !tutorialActive) {
      setIsOpen(false);
      setShowIntro(true);
      return;
    }
    openStoryModal();
  });
  useEventBus(eventBus, 'ui:closeAllModals', () => {
    setIsOpen(false);
    setShowIntro(false);
  });
  useEventBus(eventBus, 'story:battleResult', (data) => {
    if (data.victory) {
      setIsVictoryBurst(true);
      setTimeout(() => setIsVictoryBurst(false), 1500);
    }
    setFightResult(data.victory ? `🏆 SIEG! ${data.boss.name} besiegt!` : `💀 NIEDERLAGE! Du warst zu schwach.`);
    setTimeout(() => setFightResult(''), 3000);
  });

  useEventBus(eventBus, 'combat:tick', (data) => {
    if (data.isCrit) {
      setIsGravityShift(true);
      setTimeout(() => setIsGravityShift(false), 500);
    }
  });

  // Auto-Scroll für das Kampfprotokoll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [storyState.battleState ? storyState.battleState.combatLog.length : 0]);

  // Escape-Taste zum Schließen des Modals / Dialogs (Intro hat eigene Tastatur-Logik)
  useEffect(() => {
    if (showIntro) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (storyState.battleState && storyState.battleState.activeDialogue) {
          storyService.advanceDialogue();
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showIntro, storyState.battleState]);

  const battleState = storyState.battleState;
  const hasActiveDialogue = battleState && battleState.activeDialogue;

  if (!isOpen && !hasActiveDialogue && !showIntro) return null;

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

  const openChronicle = () => {
    setIsOpen(false);
    eventBus.publish(EVENTS.UI_OPEN_STORY_BRANCH);
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
    <div class="story-ui-root">
      ${showIntro ? html`
        <${StoryFightsIntroSequence}
          lang=${lang}
          onComplete=${completeIntro}
        />
      ` : ''}

      <!-- EIGENSTÄNDIGES BILDSCHIRMFÜLLENDES DIALOG-UI (ENTKOPPELT VOM BOSS-FENSTER) -->
      ${hasActiveDialogue ? html`
        <div class="cinematic-overlay cinematic-bars cinematic-active" style="position: fixed; inset: 0; width: 100vw; height: 100vh; background: rgba(5, 5, 8, 0.95); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 20000; padding: 2rem; backdrop-filter: blur(12px);" onClick=${(e) => { if (e.target === e.currentTarget) storyService.advanceDialogue(); }}>
          <button class="modal-close" style="position: fixed; top: 1.5rem; right: 2rem; z-index: 20005; font-size: 2.5rem; cursor: pointer; color: var(--color-primary); background: none; border: none; text-shadow: 0 0 10px var(--color-primary-glow);" title="Dialog überspringen" onClick=${() => storyService.advanceDialogue()}>×</button>
          
          <div class="cinematic-content" style="width: 100%; max-width: 850px; text-align: center; position: relative; z-index: 20002; display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: clamp(4rem, 10vh, 6rem); margin-bottom: 1rem; filter: drop-shadow(0 0 25px var(--color-primary-glow));">
              ${battleState.activeDialogue.portrait}
            </div>
            <h2 class="cinzel" style="color: var(--color-primary); font-size: clamp(1.6rem, 4.5vh, 2.4rem); font-weight: bold; margin-bottom: 1.2rem; letter-spacing: 3px; text-shadow: 0 0 20px var(--color-primary-glow); text-transform: uppercase;">
              ${battleState.activeDialogue.speaker}
            </h2>
            <div style="color: #fff; font-size: clamp(1.1rem, 2.8vh, 1.4rem); line-height: 1.8; font-style: italic; font-family: 'Outfit', sans-serif; margin-bottom: 2.5rem; text-shadow: 0 2px 8px rgba(0,0,0,0.9); background: rgba(0,0,0,0.5); padding: 1.5rem 2rem; border-radius: 8px; border-left: 3px solid var(--color-primary); border-right: 3px solid var(--color-primary); width: 100%;">
              "${battleState.activeDialogue.text}"
            </div>
            <div style="display: flex; justify-content: center;">
              <button class="glass-btn primary cinzel" onClick=${() => storyService.advanceDialogue()} style="padding: 0.9rem 4rem; font-size: 1.2rem; border-color: var(--color-primary); cursor: pointer; letter-spacing: 2px; transition: all 0.3s ease;"
                      onMouseOver=${(e) => { e.currentTarget.style.boxShadow = '0 0 15px var(--color-primary-glow)'; }}
                      onMouseOut=${(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
                Weiter ➔
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- HAUPT-MODAL (STORY & BOSSE) -->
      ${isOpen ? html`
        <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
          <div class="modal-content glass-panel" style="width: 720px; max-width: 95vw; max-height: 88vh; overflow-y: auto;" onClick=${(e) => e.stopPropagation()}>
            <button class="modal-close" id="story-close" style="z-index: 10005;" onClick=${() => setIsOpen(false)}>×</button>
            <h2 class="story-modal-title glow-text text-gold cinzel text-center">📖 STORY & BOSSE 📖</h2>

            ${!isBossFightActive ? html`
              <div style="display: flex; justify-content: center; margin-bottom: 0.8rem;">
                <button class="glass-btn primary cinzel" style="padding: 0.7rem 1.8rem; font-size: 0.95rem; letter-spacing: 1px;" onClick=${openChronicle}>
                  🕯️ Chronik öffnen
                </button>
              </div>
            ` : ''}

            <!-- Kapitel-Navigation (ausblenden während eines aktiven Kampfes für besseren Fokus) -->
            ${!isBossFightActive ? html`
              <div class="story-chapter-nav">
                <button class="glass-btn btn-small" onClick=${() => changeChapter(-1)} disabled=${currentChapter <= 1}>◄</button>
                <div class="chapter-title">Kapitel ${currentChapter}</div>
                <button class="glass-btn btn-small" onClick=${() => changeChapter(1)} disabled=${currentChapter >= 10}>►</button>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- HAUPT-MODAL (STORY & BOSSE) -->
      ${isOpen ? html`
        <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
          <div class="modal-content glass-panel" style="width: 720px; max-width: 95vw; max-height: 88vh; overflow-y: auto;" onClick=${(e) => e.stopPropagation()}>
            <button class="modal-close" id="story-close" style="z-index: 10005;" onClick=${() => setIsOpen(false)}>×</button>
            <h2 class="story-modal-title glow-text text-gold cinzel text-center">📖 STORY & BOSSE 📖</h2>

            <!-- FREIGESCHALTETER KAPITEL-BANNER -->
            ${chapterBanner ? html`
              <div class="chapter-unlock-banner epic-pulse glow-text">
                ${chapterBanner}
              </div>
            ` : ''}

            <!-- Kapitel-Navigation -->
            ${!isBossFightActive ? html`
              <div class="story-chapter-nav">
                <button class="glass-btn btn-small" onClick=${() => changeChapter(-1)} disabled=${currentChapter <= 1}>◄</button>
                <div class="chapter-title">Kapitel ${currentChapter}</div>
                <button class="glass-btn btn-small" onClick=${() => changeChapter(1)} disabled=${currentChapter >= 10}>►</button>
              </div>
            ` : ''}

            <!-- Boss-Liste -->
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

            <!-- KAMPFSYSTEM V3.0 (REALTIME-BATTLE) -->
            ${isBossFightActive && battleState ? html`
              <div class="story-battle-active glass-inner-panel ${isGravityShift ? 'boss-gravity-shift' : ''} ${isVictoryBurst ? 'boss-victory-burst' : ''}" style="position: relative; margin-top: 0.5rem; padding: 1.2rem; border-top: 1px solid rgba(255,255,255,0.1); overflow: hidden; min-height: 420px; display: flex; flex-direction: column; justify-content: space-between;">
                <div class="boss-arena-overlay"></div>

                <!-- KOMPAKTER STORY-KONTEXT-HEADER WÄHREND DES KAMPFES -->
                <div class="story-battle-context-bar" style="position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.8rem; background: rgba(0,0,0,0.35); border-radius: 4px; margin-bottom: 0.8rem; border-left: 3px solid var(--color-gold);">
                  <span class="cinzel" style="font-size: 0.85rem; color: var(--color-gold); font-weight: bold;">
                    📖 Kapitel ${currentChapter} — Boss ${((hero.prestige.bossProgress % 10) + 1)}/10
                  </span>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted);">
                    ${battleState.boss.name}
                  </span>
                </div>

                <!-- Kampfverlauf-Content -->
                <div style="position: relative; z-index: 2;">
                  <!-- BOSS-BEREICH -->
                  <div class="boss-status-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                    <span class="boss-name-label cinzel" style="font-size: 1.2rem; color: var(--color-danger); font-weight: bold; text-shadow: 0 0 8px rgba(255,0,0,0.2);">
                      👹 ${battleState.boss.name} ${battleState.activeEffects.isEnraged ? html`<span style="color: #ff6600; font-weight: bold; animation: pulse 1s infinite;">🔥 WÜTEND!</span>` : ''}
                    </span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 0.85rem; color: var(--color-text-muted);">Kapitel ${battleState.boss.chapter} Boss</span>
                      <button class="glass-btn btn-danger btn-small" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onClick=${() => storyService.fleeBattle()}>
                        🏃 Fliehen
                      </button>
                    </div>
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
                  <div class="combat-log-box" ref=${logRef} style="height: 160px; overflow-y: auto; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 0.8rem; margin-bottom: 1.2rem; font-family: monospace; font-size: 0.82rem; line-height: 1.5; box-shadow: inset 0 0 15px rgba(0,0,0,0.5);">
                    ${battleState.combatLog.map((log, idx) => html`
                      <div key=${idx} style="color: ${getLogColorClass(log.type)}; margin-bottom: 0.3rem; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 0.15rem;">
                        ${log.text}
                      </div>
                    `)}
                  </div>
                </div>

                <div style="position: relative; z-index: 2;">
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
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <button class="glass-btn primary story-fight-btn" style="flex: 1;" onClick=${handleFight} disabled=${isBossFightActive}>
                    ${isBossFightActive ? '⚔️ Kampf läuft...' : '⚔️ Bosskampf starten'}
                  </button>
                  <button class="glass-btn secondary" onClick=${() => setIsAnalyticsOpen(true)}>
                    📊 DPS-Meter
                  </button>
                </div>
              </div>
            ` : ''}

            <${FloatingDamageOverlay} eventBus=${eventBus} />

            ${isAnalyticsOpen && html`
              <${CombatAnalyticsModal}
                analyticsService=${combatAnalyticsService}
                onClose=${() => setIsAnalyticsOpen(false)}
              />
            `}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
