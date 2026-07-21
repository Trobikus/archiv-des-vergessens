import { h, html, useStateSelector } from '../setup.js';
import { ClanUI } from '../clan/ClanUI.js';
import { CONFIG } from '../../../data/config.js';

export function GameView({ stateManager, eventBus, services }) {
  const resources = useStateSelector(stateManager, (state) => state.resources);
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const systemState = useStateSelector(stateManager, (state) => state.system || {});

  const timeWarpActive = systemState.timeWarpActive || false;
  const timeWarpCharge = systemState.timeWarpCharge || 0;
  const timeWarpRemaining = systemState.timeWarpRemaining || 0;
  
  const clickPowerLevel = hero?.clickPowerLevel || 0;
  let cost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, clickPowerLevel));
  if (hero?.prestige?.activePact === 'ancient_folios') {
    cost = Math.floor(cost * 1.5);
  }
  const currentParticles = BigInt(resources?.particles || '0');
  const canUpgrade = currentParticles >= BigInt(cost);

  const handleManualGather = (e) => {
    eventBus.publish('game:manualGather', {
      clientX: e.clientX,
      clientY: e.clientY
    });
  };

  const handleUpgradeClick = () => {
    eventBus.publish('game:upgradeClickPower');
  };

  const handleOpenAchievements = () => {
    eventBus.publish('game:openAchievements');
  };

  const handleBackToHub = () => {
    eventBus.publish('game:backToHub');
  };

  const handleActivateTimeWarp = () => {
    if (timeWarpActive || timeWarpCharge < 100) return;
    
    stateManager.dispatch((state) => ({
      ...state,
      system: {
        ...state.system,
        timeWarpActive: true,
        timeWarpRemaining: 30,
        timeWarpCharge: 100
      }
    }), 'system/activateTimeWarp');
    
    eventBus.publish('timeWarp:started', {});
    eventBus.publish('ui:showToast', {
      message: '🌀 Mneme-Zeitkrümmung entfesselt! 3-fache Spielgeschwindigkeit für 30 Sekunden!',
      type: 'success',
      duration: 4000
    });
  };

  return html`
    <section id="game-container" class="fade-in active ${timeWarpActive ? 'time-warp-blur-filter' : ''}" style="display: flex;" role="main" aria-label="Archiv des Vergessens – Spiel">
      ${timeWarpActive ? html`<div class="time-warp-fullscreen-overlay"></div>` : ''}
      <!-- Game-Header -->
      <header id="game-header">
        <div class="header-left">
          <button id="back-to-hub-btn" class="glass-btn primary" onClick=${handleBackToHub} type="button" title="Zurück zur Übersicht">« Zurück zum Hub</button>
        </div>
        <div class="header-center">
          <h1 class="glow-text text-center">ARCHIV DES VERGESSENS</h1>
          <p class="subtitle text-center">Der Mneme-Bund</p>
        </div>
        <div class="header-right">
          <!-- Floating Time Warp Clock Button -->
          <button 
            class="time-warp-float-btn ${timeWarpActive ? 'active-warp' : timeWarpCharge >= 100 ? 'charged' : ''}" 
            style="display: flex;"
            disabled=${!timeWarpActive && timeWarpCharge < 100}
            onClick=${handleActivateTimeWarp}
            type="button"
            title=${timeWarpActive ? `Zeitkrümmung aktiv: noch ${Math.ceil(timeWarpRemaining)}s` : timeWarpCharge >= 100 ? 'Klicke, um 3x Zeitkrümmung zu aktivieren!' : `Fokus aufladen: ${Math.floor(timeWarpCharge)}%`}
          >
            <span style="font-size: 1.5rem; line-height: 1;">${timeWarpActive ? '⏳' : '🌀'}</span>
            <span style="font-size: 0.6rem; font-weight: bold; margin-top: 2px; font-family: var(--font-header);">
              ${timeWarpActive ? `${Math.ceil(timeWarpRemaining)}s` : `${Math.floor(timeWarpCharge)}%`}
            </span>
          </button>
        </div>
      </header>

      <!-- Ressourcen-Leiste -->
      <div id="resource-bar" class="resource-bar-flex glass-panel" role="status" aria-label="Ressourcen">
        <div class="resource-group">
          <div class="resource-item" id="res-particle">
            <span class="resource-label">Partikel:</span>
            <span class="resource-value text-gold glow-text" id="particle-display">${resources?.particles || '0'}</span>
          </div>
          <div class="resource-item" id="res-relic">
            <span class="resource-label">Relikte:</span>
            <span class="resource-value text-gold glow-text" id="relic-display">${resources?.relics || '0'}</span>
          </div>
          <div class="resource-item" id="res-artifact">
            <span class="resource-label">Artefakte:</span>
            <span class="resource-value text-gold glow-text" id="node-artifact-display">${resources?.artifacts || '0'}</span>
          </div>
        </div>
        <button id="open-achievements-btn" class="glass-btn primary" onClick=${handleOpenAchievements} type="button">🏆 Erfolge ansehen</button>
      </div>

      <!-- Sammel-Bereich -->
      <div class="gather-section">
        <button id="manual-gather-btn" class="primary epic-pulse text-gold cinzel" onClick=${handleManualGather} type="button">✨ Mneme-Partikel extrahieren ✨</button>
        <button id="upgrade-click-btn" class="glass-btn ${canUpgrade ? 'text-highlight' : 'text-muted'}" disabled=${!canUpgrade} onClick=${handleUpgradeClick} type="button">
          Klick-Stärke verbessern (Kosten: ${cost} Partikel)
        </button>
      </div>

      <!-- Panels: Clan & Rekrutierung (Direkt eingebunden) -->
      <${ClanUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
    </section>
  `;
}

export default GameView;
