import { h, html, useStateSelector } from '../setup.js';
import { ClanUI } from '../clan/ClanUI.js';
import { CONFIG } from '../../../data/config.js';

export function GameView({ stateManager, eventBus, services }) {
  const resources = useStateSelector(stateManager, (state) => state.resources);
  const hero = useStateSelector(stateManager, (state) => state.hero);
  
  const clickPowerLevel = hero?.clickPowerLevel || 0;
  const cost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, clickPowerLevel));
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

  return html`
    <section id="game-container" class="fade-in active" style="display: flex;" role="main" aria-label="Archiv des Vergessens – Spiel">
      <!-- Game-Header -->
      <header id="game-header">
        <div class="header-left">
          <button id="back-to-hub-btn" class="glass-btn primary" onClick=${handleBackToHub} type="button" title="Zurück zur Übersicht">« Zurück zum Hub</button>
        </div>
        <div class="header-center">
          <h1 class="glow-text text-center">ARCHIV DES VERGESSENS</h1>
          <p class="subtitle text-center">Der Mneme-Bund</p>
        </div>
        <div class="header-right" aria-hidden="true"></div>
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
