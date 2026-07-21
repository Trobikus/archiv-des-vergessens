import { h, html, useStateSelector, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { PACTS } from '../../../data/pacts.js';
import { ITEM_TEMPLATES } from '../../../data/items.js';

export function HubView({ stateManager, eventBus }) {
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const guildId = useStateSelector(stateManager, (state) => state.guild?.id);
  const bossProgress = hero?.prestige?.bossProgress || 0;
  const prestigeLevel = hero?.prestige?.level || 0;

  const [activeCategory, setActiveCategory] = useState('core');
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [wikiCategory, setWikiCategory] = useState('mechanics');
  const [wikiSearch, setWikiSearch] = useState('');
  const [selectedWikiItem, setSelectedWikiItem] = useState(null);

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
            <div class="hub-avatar" aria-hidden="true">
              <span class="avatar-icon">⚔️</span>
              <div class="avatar-ring-rotating"></div>
            </div>
            <div class="hub-player-info">
              <div id="hub-hero-name" class="hub-player-name">${hero?.name || 'Held'}</div>
              <div class="hub-player-stats">
                <span>Stufe <span id="hub-level">${hero?.level || 1}</span></span>
                <span class="hub-stat-divider" aria-hidden="true">·</span>
                <span>Prestige <span id="hub-prestige">${prestigeLevel}</span></span>
                ${guildId ? html`<span class="hub-stat-divider" aria-hidden="true">·</span><span id="hub-guild-badge" aria-hidden="true">🏛️</span>` : null}
              </div>
              <!-- Premium XP Progress Bar -->
              <div class="hub-xp-container" title="Erfahrungspunkte: ${hero?.experience || 0} / ${hero?.expToNext || 50} (${Math.min(100, Math.floor(((hero?.experience || 0) / (hero?.expToNext || 50)) * 100))}%)">
                <div class="hub-xp-bar-track">
                  <div class="hub-xp-bar-fill" style="width: ${Math.min(100, Math.floor(((hero?.experience || 0) / (hero?.expToNext || 50)) * 100))}%;"></div>
                </div>
                <div class="hub-xp-bar-label">${hero?.experience || 0} / ${hero?.expToNext || 50} XP</div>
              </div>
            </div>
            <div class="hub-player-level">
              <div class="hub-level-ring-container">
                <div class="hub-level-ring-aura"></div>
                <div class="hub-level-ring">
                  <span id="hub-level-number">${hero?.level || 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Tab-Navigation -->
      <nav class="hub-tab-bar" aria-label="Hub-Kategorien">
        <button class="hub-tab-btn ${activeCategory === 'core' ? 'active' : ''}" onClick=${() => handleTabClick('core')} type="button">
          <img src="icons/Kern (Core).png" class="tab-icon-img" aria-hidden="true" alt="Kern" />
          <span class="tab-label">Kern</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'progression' ? 'active' : ''}" onClick=${() => handleTabClick('progression')} type="button">
          <img src="icons/Fortschritt (Progression).png" class="tab-icon-img" aria-hidden="true" alt="Fortschritt" />
          <span class="tab-label">Fortschritt</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'crafting' ? 'active' : ''}" onClick=${() => handleTabClick('crafting')} type="button">
          <img src="icons/Handwerk (Crafting).png" class="tab-icon-img" aria-hidden="true" alt="Handwerk" />
          <span class="tab-label">Handwerk</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'collection' ? 'active' : ''}" onClick=${() => handleTabClick('collection')} type="button">
          <img src="icons/Sammlung (Collection).png" class="tab-icon-img" aria-hidden="true" alt="Sammlung" />
          <span class="tab-label">Sammlung</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'social' ? 'active' : ''}" onClick=${() => handleTabClick('social')} type="button">
          <img src="icons/Gemeinschaft (Social).png" class="tab-icon-img" aria-hidden="true" alt="Gemeinschaft" />
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
                <img src="icons/Archiv.png" class="hub-btn-img" aria-hidden="true" alt="Archiv" />
                <span class="cinzel text-lg">Archiv</span>
                <span class="label">Hauptspiel betreten</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-hero" onClick=${() => handleAction(EVENTS.UI_OPEN_HERO)} type="button">
                <img src="icons/Ausrüstung.png" class="hub-btn-img" aria-hidden="true" alt="Mein Held" />
                <span class="cinzel text-lg">Mein Held</span>
                <span class="label">Ausrüstung & Stats</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-story" onClick=${() => handleAction(EVENTS.UI_OPEN_STORY)} type="button">
                <img src="icons/Bossfight.png" class="hub-btn-img" aria-hidden="true" alt="Story & Bosse" />
                <span class="cinzel text-lg">Story & Bosse</span>
                <span class="label">Kapitel & Kämpfe</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${prestigeLevel > 0 ? html`
                <button class="hub-btn" id="hub-skills" onClick=${() => handleAction('ui:openSkillTree')} type="button">
                  <img src="icons/Talentbaum (Prestige)-Photoroom.png" class="hub-btn-img" aria-hidden="true" alt="Talentbaum" />
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
                <img src="icons/Ruhmeshalle (Rekorde).png" class="hub-btn-img" aria-hidden="true" alt="Ruhmeshalle" />
                <span class="cinzel text-lg">Ruhmeshalle</span>
                <span class="label">Persönliche Rekorde</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${bossProgress >= 3 ? html`
                <button class="hub-btn" id="hub-relic" onClick=${() => handleAction(EVENTS.UI_OPEN_RELICHUNT)} type="button">
                  <img src="icons/Relikt-Jagd (Relikte).png" class="hub-btn-img" aria-hidden="true" alt="Relikte" />
                  <span class="cinzel text-lg">Relikt-Jagd</span>
                  <span class="label">Relikte finden</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              ${prestigeLevel > 0 ? html`
                <button class="hub-btn hub-btn-danger span-2" id="hub-challenges" onClick=${() => handleAction('ui:openChallenges')} type="button">
                  <img src="icons/Anomalien (Challenges).png" class="hub-btn-img" aria-hidden="true" alt="Anomalien" />
                  <span class="cinzel text-lg text-danger">Anomalien</span>
                  <span class="label">Extreme Herausforderungen</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              <button class="hub-btn" id="hub-wiki" onClick=${() => { setIsWikiOpen(true); setSelectedWikiItem(null); }} type="button">
                <span class="icon" aria-hidden="true">📖</span>
                <span class="cinzel text-lg">Archiv-Kodex</span>
                <span class="label">Lexikon & Spiel-Wiki</span>
                <span class="hub-btn-glow"></span>
              </button>
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
                <span class="label">Tagebuch & Lore</span>
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
                <span class="label">Clan & Mitglieder</span>
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

      <!-- ARCHIV-KODEX WIKI MODAL OVERLAY -->
      ${isWikiOpen ? html`
        <div class="modal-overlay fade-in active" style="z-index: 15000; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
          <div class="glass-panel" style="max-width: 950px; width: 90%; height: 85vh; display: flex; flex-direction: column; padding: 1.5rem; border-color: var(--color-gold); background: rgba(10, 8, 5, 0.95); box-shadow: 0 0 40px rgba(212, 175, 55, 0.15); border-radius: 8px; position: relative;">
            
            <!-- Close Button -->
            <button class="glass-btn" style="position: absolute; top: 15px; right: 15px; border-radius: 50%; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-color: rgba(255,255,255,0.1); cursor: pointer;" onClick=${() => setIsWikiOpen(false)}>✕</button>

            <!-- Header -->
            <div style="text-align: center; margin-bottom: 1.2rem; border-bottom: 1px solid rgba(212, 175, 55, 0.15); padding-bottom: 0.8rem;">
              <h2 class="glow-text text-gold cinzel" style="font-size: 1.6rem; letter-spacing: 2px; margin: 0; text-transform: uppercase;">📖 ARCHIV-KODEX 📖</h2>
              <p style="color: #888; font-size: 0.78rem; margin: 3px 0 0 0; font-family: var(--font-header);">Das allsehende Lexikon über Spielmechaniken, Attribute und Gegenstände</p>
            </div>

            <!-- Main Layout (Sidebar + Content) -->
            <div style="display: flex; flex: 1; min-height: 0; gap: 1.5rem;">
              
              <!-- Sidebar -->
              <div style="width: 250px; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 1rem; gap: 0.8rem; overflow-y: auto;">
                
                <!-- Category Selector -->
                <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                  <button class="glass-btn ${wikiCategory === 'mechanics' ? 'primary' : ''}" style="text-align: left; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-family: var(--font-header);" onClick=${() => { setWikiCategory('mechanics'); setSelectedWikiItem(null); }}>
                    🌀 Spielmechaniken
                  </button>
                  <button class="glass-btn ${wikiCategory === 'stats' ? 'primary' : ''}" style="text-align: left; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-family: var(--font-header);" onClick=${() => { setWikiCategory('stats'); setSelectedWikiItem(null); }}>
                    ⚔️ Attribute & Stats
                  </button>
                  <button class="glass-btn ${wikiCategory === 'items' ? 'primary' : ''}" style="text-align: left; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-family: var(--font-header);" onClick=${() => { setWikiCategory('items'); setSelectedWikiItem(null); }}>
                    💎 Beutestücke & Loot
                  </button>
                </div>

                <div style="height: 1px; background: rgba(255,255,255,0.05); margin: 0.2rem 0;"></div>

                <!-- Sub-items List based on Category -->
                <div style="display: flex; flex-direction: column; gap: 0.3rem; flex: 1; overflow-y: auto;">
                  ${(() => {
                    const items = getWikiItems(wikiCategory, hero, bossProgress, prestigeLevel, guildId);
                    return items.map(item => html`
                      <button class="glass-btn" 
                              style="text-align: left; padding: 0.4rem 0.6rem; font-size: 0.72rem; border-color: ${selectedWikiItem?.id === item.id ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)'}; background: ${selectedWikiItem?.id === item.id ? 'rgba(212,175,55,0.05)' : 'transparent'};" 
                              onClick=${() => setSelectedWikiItem(item)}>
                        ${item.icon} ${item.name}
                      </button>
                    `);
                  })()}
                </div>
              </div>

              <!-- Content Panel -->
              <div style="flex: 1; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; justify-content: ${selectedWikiItem ? 'flex-start' : 'center'}; align-items: ${selectedWikiItem ? 'stretch' : 'center'};">
                ${selectedWikiItem ? html`
                  <!-- Detail View -->
                  <div class="fade-in">
                    <div style="display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.8rem; margin-bottom: 1rem;">
                      <span style="font-size: 2.2rem;">${selectedWikiItem.icon}</span>
                      <div>
                        <h3 class="text-gold cinzel" style="font-size: 1.3rem; margin: 0; font-weight: bold; letter-spacing: 1px;">${selectedWikiItem.name}</h3>
                        <span class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-gold); font-family: var(--font-header);">${selectedWikiItem.subtitle}</span>
                      </div>
                    </div>

                    <p style="font-size: 0.85rem; line-height: 1.5; color: #ccc; margin-bottom: 1.2rem; font-family: var(--font-header);">
                      ${selectedWikiItem.description}
                    </p>

                    ${selectedWikiItem.details && !selectedWikiItem.isLocked ? html`
                      <div class="glass-panel" style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 6px; border-color: rgba(255,255,255,0.05);">
                        <h4 class="text-gold cinzel" style="font-size: 0.85rem; margin-top: 0; margin-bottom: 0.6rem; text-transform: uppercase;">Details & Funktionsweise</h4>
                        <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.78rem; line-height: 1.6; color: #bbb;">
                          ${selectedWikiItem.details.map(detail => html`
                            <li style="margin-bottom: 0.3rem;">${detail}</li>
                          `)}
                        </ul>
                      </div>
                    ` : ''}

                    ${selectedWikiItem.pacts && !selectedWikiItem.isLocked ? html`
                      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; margin-top: 1rem;">
                        ${selectedWikiItem.pacts.map(pact => html`
                          <div class="glass-panel" style="padding: 0.8rem; background: rgba(0,0,0,0.4); border-color: rgba(212,175,55,0.1);">
                            <div class="text-gold text-bold" style="font-size: 0.8rem; font-family: var(--font-header);">${pact.name}</div>
                            <div style="font-size: 0.7rem; color: #2ecc71; margin-top: 4px;">Segen: ${pact.passiveText}</div>
                            <div style="font-size: 0.7rem; color: #e74c3c; margin-top: 2px;">Fluch: ${pact.curseText}</div>
                          </div>
                        `)}
                      </div>
                    ` : ''}

                    ${selectedWikiItem.itemsGrid && !selectedWikiItem.isLocked ? html`
                      <div style="font-size: 0.68rem; color: var(--color-gold); font-family: var(--font-header); font-style: italic; margin-bottom: 0.5rem; text-align: right; opacity: 0.8;">
                        Es werden nur entdeckte Qualitätsstufen angezeigt. Dringe tiefer in das Archiv vor, um mächtigere Artefakte freizuschalten!
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.6rem; margin-top: 0.5rem; max-height: 300px; overflow-y: auto; padding: 4px;">
                        ${selectedWikiItem.itemsGrid.map(item => {
                          const rarityColors = {
                            common: '#aaa',
                            uncommon: '#2ecc71',
                            rare: '#3498db',
                            epic: '#9b59b6',
                            legendary: '#f1c40f'
                          };
                          const rarityGerman = {
                            common: 'Gewöhnlich',
                            uncommon: 'Ungewöhnlich',
                            rare: 'Selten',
                            epic: 'Episch',
                            legendary: 'Legendär'
                          };
                          return html`
                            <div class="glass-panel text-center" style="padding: 0.5rem; border-color: ${rarityColors[item.rarity] || '#aaa'}; background: rgba(0,0,0,0.3);">
                              <div style="font-size: 0.75rem; font-weight: bold; color: ${rarityColors[item.rarity]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title=${item.name}>${item.name}</div>
                              <div style="font-size: 0.6rem; color: #888; text-transform: uppercase; margin-top: 2px;">${rarityGerman[item.rarity]}</div>
                              <div style="font-size: 0.65rem; color: #ccc; margin-top: 4px;">
                                ${Object.entries(item.stats || {}).map(([sKey, sVal]) => html`
                                  <div>${sKey === 'attack' ? '⚔️' : sKey === 'defense' ? '🛡️' : sKey === 'agility' ? '⚡' : '❤️'} +${sVal}</div>
                                `)}
                              </div>
                            </div>
                          `;
                        })}
                      </div>
                    ` : ''}
                  </div>
                ` : html`
                  <!-- Idle Screen -->
                  <div class="text-center" style="opacity: 0.45; max-width: 320px;">
                    <span style="font-size: 3.5rem; display: block; margin-bottom: 0.8rem;">📖</span>
                    <h3 class="cinzel text-gold" style="font-size: 1.1rem; margin-bottom: 0.4rem;">Wähle ein Thema</h3>
                    <p style="font-size: 0.75rem; line-height: 1.3;">Klicke links auf eine Kategorie und wähle einen Eintrag, um seine Geheimnisse und mathematischen Funktionsweisen zu enthüllen.</p>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

function getWikiItems(category, hero, bossProgress, prestigeLevel, guildId) {
  const heroLevel = hero?.level || 1;

  if (category === 'mechanics') {
    const isPactsUnlocked = prestigeLevel > 0 || bossProgress >= 20;
    const isRaidsUnlocked = guildId || bossProgress >= 3;
    const isSocketsUnlocked = bossProgress >= 1;

    return [
      {
        id: 'time_warp',
        icon: '🌀',
        name: 'Mneme-Zeitkrümmung',
        subtitle: 'Beschleunigung des Fluss der Zeit',
        description: 'Die Zeitkrümmung erlaubt es dem Chronisten, die Zeitlinien im Archiv zu biegen. Bei Aktivierung beschleunigt sich der globale Spiel-Takt um den Faktor 3x für exakt 30 Sekunden.',
        details: [
          'Aufladung: Lädt passiv mit +0.1% pro Sekunde auf.',
          'Aktives Sammeln: Jeder Klick auf "Mneme-Partikel extrahieren" lädt die Uhr um weitere +1.0% auf.',
          'Wirkung: Erhöht die Rate aller Berechnungen (Energie, Erfahrung, Expeditionen, Schmieden) um das Dreifache, ohne Timestamps zu desynchronisieren.',
          'Aktivierung: Der goldene Knopf oben rechts beginnt blau zu pulsieren, sobald er 100% erreicht.'
        ]
      },
      {
        id: 'dark_pacts',
        icon: isPactsUnlocked ? '🌀' : '🔒',
        name: isPactsUnlocked ? 'Finstre Prestige-Pakte' : '🔒 ???',
        subtitle: isPactsUnlocked ? 'Macht um jeden Preis' : 'Verborgener Kodex',
        description: isPactsUnlocked 
          ? 'Sobald du die Verewigung (Prestige) durchführst, zerreißt die Realität. Du musst einen aus drei angebotenen Finstren Pakten wählen. Diese Pakte gewähren verheerende Segen, fordern jedoch gleichermaßen drakonische Opfer.'
          : 'Ein geheimnisvoller, sündhafter Pakt, der erst sichtbar wird, sobald du deinen Helden zum allerersten Mal verewigst. Bestreite das Abenteuer weiter, um diesen mächtigen Bund zu offenbaren.',
        isLocked: !isPactsUnlocked,
        pacts: isPactsUnlocked ? Object.values(PACTS) : null
      },
      {
        id: 'clan_raids',
        icon: isRaidsUnlocked ? '👥' : '🔒',
        name: isRaidsUnlocked ? 'Heroische Clan-Raids' : '🔒 ???',
        subtitle: isRaidsUnlocked ? 'Gemeinsame Schlachten in den Katakomben' : 'Verborgene Expedition',
        description: isRaidsUnlocked
          ? 'Im Clan-Menü kannst du deine Gefolgschaft nicht nur auf simple Erkundungen schicken, sondern sie in heroische Expeditionen (Clan-Raids) tief in die finsteren Katakomben entsenden.'
          : 'Trommele eine schlagkräftige Gefolgschaft zusammen! Diese Mechanik wird freigeschaltet, sobald du einer Gilde beitrittst oder im Abenteuer tiefer vordringst (besiegt den 3. Boss).',
        isLocked: !isRaidsUnlocked,
        details: isRaidsUnlocked ? [
          'Teilnehmer: Du kannst zwischen 1 und 5 idle Clan-Mitglieder für den Raid auswählen.',
          'Dauer: Ein Raid dauert standardmäßig 5 Minuten (300 Sekunden).',
          'Erfolgschance: Skaliert mit der zusammengerechneten Stufe und Zähigkeit aller Raubritter.',
          'Belohnungen: Gewährt hohe EP für alle Beteiligten, 1-3 seltene Schmiede-Katalysatoren sowie legendäre Beutetruhen (30% Chance auf High-Tier Epics/Legendaries).'
        ] : null
      },
      {
        id: 'sockets',
        icon: isSocketsUnlocked ? '💎' : '🔒',
        name: isSocketsUnlocked ? 'Ausrüstungs-Sockelsystem' : '🔒 ???',
        subtitle: isSocketsUnlocked ? 'Macht-Veredelung durch Katalysatoren' : 'Uralte Alchemie',
        description: isSocketsUnlocked
          ? 'Gegenstände der Qualitätsstufen "Selten", "Episch" und "Legendär" können leere Sockel für Katalysatoren aufweisen. In der Artefakt-Schmiede können diese belegt werden.'
          : 'Schalte die Artefakt-Schmiede frei (besiege dazu den ersten Boss des Archivs), um zu erfahren, wie man mächtige Edelstein-Katalysatoren in Rüstungen einsetzt.',
        isLocked: !isSocketsUnlocked,
        details: isSocketsUnlocked ? [
          'Sockelanzahl: Seltene Gegenstände haben bis zu 1 Sockel, Epische bis zu 2, Legendäre bis zu 3 Sockel.',
          'Rubin der Glut: Verleiht dauerhaft +5 Angriffskraft pro Sockel.',
          'Saphir des Schutzes: Verleiht dauerhaft +5 Zähigkeit/Verteidigung pro Sockel.',
          'Smaragd der Schnelligkeit: Verleiht dauerhaft +5 Geschicklichkeit pro Sockel.',
          'Bernstein des Lebens: Verleiht dauerhaft +5 Vitalität/Max HP pro Sockel.',
          'Katalysator-Kosten: Jedes Einsetzen verbraucht 1 seltenen Katalysator, der primär über Clan-Raids errungen wird.'
        ] : null
      }
    ];
  }

  if (category === 'stats') {
    const showAdvancedFormulas = heroLevel >= 5 || prestigeLevel > 0;

    return [
      {
        id: 'stat_attack',
        icon: '⚔️',
        name: 'Angriffskraft',
        subtitle: 'Zerstörungskraft im Kampf',
        description: 'Das wichtigste Attribut für jeden Krieger. Bestimmt, wie hart deine Attacken Bosse und Monster im Archiv treffen.',
        details: [
          'Erhöhung: Steigt durch Stat-Punkte-Investition, Schmieden neuer Waffen und das Sockeln von Glutrubinen.',
          'Skalierung: Jeder Punkt in Angriff erhöht deinen Basisschaden im Kampf um 1.5.'
        ]
      },
      {
        id: 'stat_defense',
        icon: '🛡️',
        name: 'Zähigkeit & Verteidigung',
        subtitle: 'Schutz vor feindlichen Angriffen',
        description: 'Verringert den Schaden, den dein Held bei Treffern von Anomalien oder Bossen erleidet.',
        details: showAdvancedFormulas ? [
          'Schadensreduktion: Verteidigung wird direkt in die Schadensreduktion (DR) umgerechnet.',
          'Formel: DR (%) = (Verteidigung / (Verteidigung + 100)) * 100.',
          'Cap: Maximal 85% Schadensreduktion durch Rüstungsteile erreichbar.'
        ] : [
          'Schadensreduktion: Verringert eingehenden Schaden.',
          '💡 Fortgeschrittener Tipp: Erreiche Heldenstufe 5, um die exakte mathematische Schadensberechnung dieses Attributs im Kodex zu entschlüsseln!'
        ]
      },
      {
        id: 'stat_agility',
        icon: '⚡',
        name: 'Geschicklichkeit',
        subtitle: 'Schnelligkeit und Präzision',
        description: 'Einfluss auf die taktische Agilität im Kampfsystem des Archivs.',
        details: [
          'Ausweichen: Erhöht deine Chance, feindlichen Angriffen komplett schadenfrei zu entgehen.',
          'Kritische Treffer: Steigert die Wahrscheinlichkeit, verheerende kritische Treffer mit doppelten Schadenswirkungen zu erzielen.'
        ]
      },
      {
        id: 'stat_stamina',
        icon: '❤️',
        name: 'Vitalität & Ausdauer',
        subtitle: 'Deine Lebenskraft',
        description: 'Bestimmt die Menge an Erschütterungen und Angriffen, die dein Held ertragen kann, bevor er stirbt.',
        details: [
          'Lebenspunkte (HP): Jeder Punkt in Vitalität erhöht deine maximalen Lebenspunkte dauerhaft um 12 HP.'
        ]
      }
    ];
  }

  if (category === 'items') {
    // Progressive Raritäten-Freischaltung für das Item-Wiki
    const isUncommonUnlocked = bossProgress >= 1 || heroLevel >= 5 || prestigeLevel > 0;
    const isRareUnlocked = bossProgress >= 3 || heroLevel >= 10 || prestigeLevel > 0;
    const isEpicUnlocked = bossProgress >= 10 || heroLevel >= 20 || prestigeLevel > 0;
    const isLegendaryUnlocked = prestigeLevel > 0 || bossProgress >= 18;

    const filteredItems = Object.entries(ITEM_TEMPLATES).map(([name, data]) => ({ name, ...data })).filter(item => {
      if (item.rarity === 'common') return true;
      if (item.rarity === 'uncommon') return isUncommonUnlocked;
      if (item.rarity === 'rare') return isRareUnlocked;
      if (item.rarity === 'epic') return isEpicUnlocked;
      if (item.rarity === 'legendary') return isLegendaryUnlocked;
      return false;
    });

    return [
      {
        id: 'slot_weapon',
        icon: '🗡️',
        name: 'Waffen',
        subtitle: 'Zweihänder, Stäbe & Dolche',
        description: 'Waffen besetzen den aktiven Hand-Slot des Helden und konzentrieren sich exklusiv auf die Skalierung der Angriffskraft und Geschicklichkeit.',
        itemsGrid: filteredItems.filter(i => i.slot === 'weapon')
      },
      {
        id: 'slot_shield',
        icon: '🛡️',
        name: 'Schilde',
        subtitle: 'Bollwerke und Rundschilde',
        description: 'Schilde werden in der Nebenhand getragen. Sie maximieren deine Zähigkeit und verleihen hohe Rüstungswerte.',
        itemsGrid: filteredItems.filter(i => i.slot === 'shield')
      },
      {
        id: 'slot_armor',
        icon: '👕',
        name: 'Rüstungen & Gewänder',
        subtitle: 'Brustplatten und Magierroben',
        description: 'Körperbekleidungen bieten das stärkste Fundament für physische Verteidigung und Vitalitäts-Multiplikatoren.',
        itemsGrid: filteredItems.filter(i => i.slot === 'armor')
      },
      {
        id: 'slot_helmet',
        icon: '🪖',
        name: 'Helme & Diademe',
        subtitle: 'Kopfbedeckungen der Macht',
        description: 'Kopfschützer, die oft zusätzliche Vitalität, Geschicklichkeit oder Intelligenz-Attributboni besitzen.',
        itemsGrid: filteredItems.filter(i => i.slot === 'helmet')
      },
      {
        id: 'slot_shoulders',
        icon: '🛡️',
        name: 'Schulterstücke',
        subtitle: 'Platten und Schulterschützer',
        description: 'Schulterpanzer für Zähigkeit, Vitalität und Tragekomfort.',
        itemsGrid: filteredItems.filter(i => i.slot === 'shoulders')
      },
      {
        id: 'slot_gloves',
        icon: '🧤',
        name: 'Handschuhe',
        subtitle: 'Präzisions-Griffe',
        description: 'Handschuhe, die deinen Griff an der Waffe festigen und Geschicklichkeit oder Angriffs-Boni verleihen.',
        itemsGrid: filteredItems.filter(i => i.slot === 'gloves')
      },
      {
        id: 'slot_belt',
        icon: '🎗️',
        name: 'Gürtel',
        subtitle: 'Schnallen & Schärpen',
        description: 'Gürtel bieten kleine Attribute auf Zähigkeit und Ausdauer.',
        itemsGrid: filteredItems.filter(i => i.slot === 'belt')
      },
      {
        id: 'slot_boots',
        icon: '🥾',
        name: 'Stiefel',
        subtitle: 'Schritte der Ewigkeit',
        description: 'Stiefel beschleunigen deine Reise und steigern in hohem Maße deine Geschicklichkeit und dein Ausweichen.',
        itemsGrid: filteredItems.filter(i => i.slot === 'boots')
      },
      {
        id: 'slot_jewelry',
        icon: '💍',
        name: 'Schmuckstücke',
        subtitle: 'Amulette & Siegelringe',
        description: 'Besonders kostbare Schmuckstücke (Ringe, Amulette), die unübertroffene hybride Attributkombinationen aufweisen.',
        itemsGrid: filteredItems.filter(i => i.slot === 'ring' || i.slot === 'amulet')
      }
    ];
  }

  return [];
}

export default HubView;
