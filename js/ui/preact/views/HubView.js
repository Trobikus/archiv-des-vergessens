import { h, html, useStateSelector, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function HubView({ stateManager, eventBus }) {
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const guildId = useStateSelector(stateManager, (state) => state.guild?.id);
  const bossProgress = hero?.prestige?.bossProgress || 0;
  const prestigeLevel = hero?.prestige?.level || 0;

  const [activeCategory, setActiveCategory] = useState('core');

  const handleTabClick = (category) => {
    setActiveCategory(category);
  };

  const handleAction = (eventName, data = {}) => {
    eventBus.publish(eventName, data);
  };

  const handleBackToMenu = () => {
    eventBus.publish('hub:backToMenu');
  };

  const handleEnterGame = () => {
    eventBus.publish('hub:enterGame');
  };

  return html`
    <section id="hub-container" class="fade-in" style="display: flex;" role="main" aria-label="Archiv-Hub">
      <!-- Header -->
      <header id="hub-header" class="glass-panel">
        <div class="hub-header-left">
          <div class="hub-title-group">
            <span class="hub-icon" aria-hidden="true">🏛️</span>
            <div>
              <h2 class="hub-title glow-text">Archiv des Vergessens</h2>
              <p class="hub-subtitle">Der Mneme-Bund</p>
            </div>
          </div>
        </div>
        <div class="hub-header-right">
          <div class="hub-player-card">
            <div class="hub-avatar" aria-hidden="true">⚔️</div>
            <div class="hub-player-info">
              <div id="hub-hero-name" class="hub-player-name">${hero?.name || 'Held'}</div>
              <div class="hub-player-stats">
                <span>Stufe <span id="hub-level">${hero?.level || 1}</span></span>
                <span class="hub-stat-divider" aria-hidden="true">·</span>
                <span>Prestige <span id="hub-prestige">${prestigeLevel}</span></span>
                ${guildId ? html`<span class="hub-stat-divider" aria-hidden="true">·</span><span id="hub-guild-badge" aria-hidden="true">🏛️</span>` : null}
              </div>
            </div>
            <div class="hub-player-level">
              <div class="hub-level-ring">
                <span id="hub-level-number">${hero?.level || 1}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Tab-Navigation -->
      <nav class="hub-tab-bar" aria-label="Hub-Kategorien">
        <button class="hub-tab-btn ${activeCategory === 'core' ? 'active' : ''}" onClick=${() => handleTabClick('core')} type="button">
          <span class="tab-icon" aria-hidden="true">⚔️</span>
          <span class="tab-label">Kern</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'progression' ? 'active' : ''}" onClick=${() => handleTabClick('progression')} type="button">
          <span class="tab-icon" aria-hidden="true">📈</span>
          <span class="tab-label">Fortschritt</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'crafting' ? 'active' : ''}" onClick=${() => handleTabClick('crafting')} type="button">
          <span class="tab-icon" aria-hidden="true">⚒️</span>
          <span class="tab-label">Handwerk</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'collection' ? 'active' : ''}" onClick=${() => handleTabClick('collection')} type="button">
          <span class="tab-icon" aria-hidden="true">📚</span>
          <span class="tab-label">Sammlung</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'social' ? 'active' : ''}" onClick=${() => handleTabClick('social')} type="button">
          <span class="tab-icon" aria-hidden="true">👥</span>
          <span class="tab-label">Gemeinschaft</span>
        </button>
      </nav>

      <!-- Hub-Inhalt -->
      <section id="hub-content">
        <!-- KERN -->
        ${activeCategory === 'core' ? html`
          <div id="hub-category-core" class="hub-category">
            <div class="hub-grid">
              <button class="hub-btn primary" id="hub-archive" onClick=${handleEnterGame} type="button">
                <span class="icon" aria-hidden="true">📜</span>
                <span class="cinzel text-lg">Archiv</span>
                <span class="label">Hauptspiel betreten</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-hero" onClick=${() => handleAction(EVENTS.UI_OPEN_HERO)} type="button">
                <span class="icon" aria-hidden="true">👤</span>
                <span class="cinzel text-lg">Mein Held</span>
                <span class="label">Ausrüstung &amp; Stats</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-story" onClick=${() => handleAction(EVENTS.UI_OPEN_STORY)} type="button">
                <span class="icon" aria-hidden="true">📖</span>
                <span class="cinzel text-lg">Story &amp; Bosse</span>
                <span class="label">Kapitel &amp; Kämpfe</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${prestigeLevel > 0 ? html`
                <button class="hub-btn" id="hub-skills" onClick=${() => handleAction('ui:openSkillTree')} type="button">
                  <span class="icon" aria-hidden="true">🌳</span>
                  <span class="cinzel text-lg">Talentbaum</span>
                  <span class="label">Prestige-Punkte nutzen</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
            </div>
          </div>
        ` : null}

        <!-- FORTSCHRITT -->
        ${activeCategory === 'progression' ? html`
          <div id="hub-category-progression" class="hub-category">
            <div class="hub-grid">
              <button class="hub-btn" id="hub-leaderboard" onClick=${() => handleAction(EVENTS.UI_OPEN_LEADERBOARD, { tab: 'personal' })} type="button">
                <span class="icon" aria-hidden="true">🏆</span>
                <span class="cinzel text-lg">Ruhmeshalle</span>
                <span class="label">Persönliche Rekorde</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${bossProgress >= 3 ? html`
                <button class="hub-btn" id="hub-relic" onClick=${() => handleAction(EVENTS.UI_OPEN_RELICHUNT)} type="button">
                  <span class="icon" aria-hidden="true">💎</span>
                  <span class="cinzel text-lg">Relikt-Jagd</span>
                  <span class="label">Relikte finden</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              ${prestigeLevel > 0 ? html`
                <button class="hub-btn hub-btn-danger span-2" id="hub-challenges" onClick=${() => handleAction('ui:openChallenges')} type="button">
                  <span class="icon" aria-hidden="true">🔥</span>
                  <span class="cinzel text-lg text-danger">Anomalien</span>
                  <span class="label">Extreme Herausforderungen</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
            </div>
          </div>
        ` : null}

        <!-- HANDWERK -->
        ${activeCategory === 'crafting' ? html`
          <div id="hub-category-crafting" class="hub-category">
            <div class="hub-grid">
              ${bossProgress >= 1 ? html`
                <button class="hub-btn" id="hub-artifact" onClick=${() => handleAction(EVENTS.UI_OPEN_FORGE)} type="button">
                  <span class="icon" aria-hidden="true">⚒️</span>
                  <span class="cinzel text-lg">Artefakt-Schmiede</span>
                  <span class="label">Ausrüstung herstellen</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              <button class="hub-btn" id="hub-crafting" onClick=${() => handleAction(EVENTS.UI_OPEN_CRAFTING)} type="button">
                <span class="icon" aria-hidden="true">🏭</span>
                <span class="cinzel text-lg">Meisterwerkstatt</span>
                <span class="label">Komplexes Crafting</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${bossProgress >= 1 ? html`
                <button class="hub-btn" id="hub-library" onClick=${() => handleAction(EVENTS.UI_OPEN_LIBRARY)} type="button">
                  <span class="icon" aria-hidden="true">📚</span>
                  <span class="cinzel text-lg">Bibliothek</span>
                  <span class="label">Forschungen</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
            </div>
          </div>
        ` : null}

        <!-- SAMMLUNG -->
        ${activeCategory === 'collection' ? html`
          <div id="hub-category-collection" class="hub-category">
            <div class="hub-grid">
              <button class="hub-btn" id="hub-codex" onClick=${() => handleAction(EVENTS.UI_OPEN_CODEX)} type="button">
                <span class="icon" aria-hidden="true">📚</span>
                <span class="cinzel text-lg">Codex</span>
                <span class="label">Tagebuch &amp; Lore</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-story-branch" onClick=${() => handleAction(EVENTS.UI_OPEN_DIALOG, { npcId: 'archivist' })} type="button">
                <span class="icon" aria-hidden="true">📖</span>
                <span class="cinzel text-lg">Story</span>
                <span class="label">Entscheidungen treffen</span>
                <span class="hub-btn-glow"></span>
              </button>
            </div>
          </div>
        ` : null}

        <!-- GEMEINSCHAFT -->
        ${activeCategory === 'social' ? html`
          <div id="hub-category-social" class="hub-category">
            <div class="hub-grid">
              <button class="hub-btn" id="hub-global-ranking" onClick=${() => handleAction(EVENTS.UI_OPEN_LEADERBOARD, { tab: 'global' })} type="button">
                <span class="icon" aria-hidden="true">🌍</span>
                <span class="cinzel text-lg">Weltrangliste</span>
                <span class="label">Globale Bestenliste</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-guild" onClick=${() => handleAction(EVENTS.UI_OPEN_GUILD)} type="button">
                <span class="icon" aria-hidden="true">🏛️</span>
                <span class="cinzel text-lg">Gilde</span>
                <span class="label">Clan &amp; Mitglieder</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-friends" onClick=${() => handleAction(EVENTS.UI_OPEN_FRIENDS)} type="button">
                <span class="icon" aria-hidden="true">👥</span>
                <span class="cinzel text-lg">Freunde</span>
                <span class="label">Freundesliste</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-chat" onClick=${() => handleAction(EVENTS.UI_OPEN_CHAT)} type="button">
                <span class="icon" aria-hidden="true">💬</span>
                <span class="cinzel text-lg">Chat</span>
                <span class="label">Globaler Chat</span>
                <span class="hub-btn-glow"></span>
              </button>
            </div>
          </div>
        ` : null}
      </section>

      <!-- Hub-Footer -->
      <footer id="hub-footer">
        <button class="hub-back-btn glass-btn" id="hub-back-to-menu" onClick=${handleBackToMenu} type="button">« Zurück</button>
        <div id="hub-notifications">
          <span id="hub-quest-indicator" style="display: none;">📋 Mission aktiv</span>
        </div>
        <span class="hub-version">v1.6</span>
      </footer>
    </section>
  `;
}

export default HubView;
