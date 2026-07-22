import { h, html, useStateSelector, useState, useMemo, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { PACTS } from '../../../data/pacts.js';
import { ITEM_TEMPLATES } from '../../../data/items.js';

export function HubView({ stateManager, eventBus, services }) {
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const guildId = useStateSelector(stateManager, (state) => state.guild?.id);
  const bossProgress = hero?.prestige?.bossProgress || 0;
  const prestigeLevel = hero?.prestige?.level || 0;

  const [activeCategory, setActiveCategory] = useState('core');
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [wikiCategory, setWikiCategory] = useState('mechanics');
  const [wikiSearch, setWikiSearch] = useState('');
  const [selectedWikiItem, setSelectedWikiItem] = useState(null);
  const [lang, setLang] = useState(services?.i18nService ? services.i18nService.getLanguage() : 'de');

  useEffect(() => {
    if (eventBus) {
      const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
        setLang(data.language);
      });
      return unsub;
    }
  }, [eventBus]);

  const t = (key, fallback = key) => {
    if (services && services.i18nService) {
      return services.i18nService.t(key, fallback);
    }
    return fallback;
  };

  const wikiItems = useMemo(() => {
    if (!isWikiOpen) return [];
    return getWikiItems(wikiCategory, hero, bossProgress, prestigeLevel, guildId, lang);
  }, [isWikiOpen, wikiCategory, hero, bossProgress, prestigeLevel, guildId, lang]);

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
              <h2 class="hub-title glow-text">${t('menu.title')}</h2>
              <p class="hub-subtitle">${t('menu.subtitle')}</p>
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
              <div id="hub-hero-name" class="hub-player-name">${hero?.name || t('hub.hero')}</div>
              <div class="hub-player-stats">
                <span>${t('hero.level')} <span id="hub-level">${hero?.level || 1}</span></span>
                <span class="hub-stat-divider" aria-hidden="true">·</span>
                <span>${t('hero.prestige', 'Prestige')} <span id="hub-prestige">${prestigeLevel}</span></span>
                ${guildId ? html`<span class="hub-stat-divider" aria-hidden="true">·</span><span id="hub-guild-badge" aria-hidden="true">🏛️</span>` : null}
              </div>
              <!-- Premium XP Progress Bar -->
              <div class="hub-xp-container" title="${lang === 'de' ? 'Erfahrungspunkte' : 'Experience'}: ${hero?.experience || 0} / ${hero?.expToNext || 50} (${Math.min(100, Math.floor(((hero?.experience || 0) / (hero?.expToNext || 50)) * 100))}%)">
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
          <span class="tab-label">${lang === 'de' ? 'Kern' : 'Core'}</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'progression' ? 'active' : ''}" onClick=${() => handleTabClick('progression')} type="button">
          <img src="icons/Fortschritt (Progression).png" class="tab-icon-img" aria-hidden="true" alt="Fortschritt" />
          <span class="tab-label">${lang === 'de' ? 'Fortschritt' : 'Progression'}</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'crafting' ? 'active' : ''}" onClick=${() => handleTabClick('crafting')} type="button">
          <img src="icons/Handwerk (Crafting).png" class="tab-icon-img" aria-hidden="true" alt="Handwerk" />
          <span class="tab-label">${t('hub.crafting')}</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'collection' ? 'active' : ''}" onClick=${() => handleTabClick('collection')} type="button">
          <img src="icons/Sammlung (Collection).png" class="tab-icon-img" aria-hidden="true" alt="Sammlung" />
          <span class="tab-label">${lang === 'de' ? 'Sammlung' : 'Collection'}</span>
        </button>
        <button class="hub-tab-btn ${activeCategory === 'social' ? 'active' : ''}" onClick=${() => handleTabClick('social')} type="button">
          <img src="icons/Gemeinschaft (Social).png" class="tab-icon-img" aria-hidden="true" alt="Gemeinschaft" />
          <span class="tab-label">${lang === 'de' ? 'Gemeinschaft' : 'Social'}</span>
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
                <span class="cinzel text-lg">${lang === 'de' ? 'Archiv' : 'Archive'}</span>
                <span class="label">${lang === 'de' ? 'Hauptspiel betreten' : 'Enter main game'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-hero" onClick=${() => handleAction(EVENTS.UI_OPEN_HERO)} type="button">
                <img src="icons/Ausrüstung.png" class="hub-btn-img" aria-hidden="true" alt="Mein Held" />
                <span class="cinzel text-lg">${lang === 'de' ? 'Mein Held' : 'My Hero'}</span>
                <span class="label">${lang === 'de' ? 'Ausrüstung & Stats' : 'Equipment & Stats'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-story" onClick=${() => handleAction(EVENTS.UI_OPEN_STORY)} type="button">
                <img src="icons/Bossfight.png" class="hub-btn-img" aria-hidden="true" alt="Story & Bosse" />
                <span class="cinzel text-lg">${lang === 'de' ? 'Story & Bosse' : 'Story & Bosses'}</span>
                <span class="label">${lang === 'de' ? 'Kapitel & Kämpfe' : 'Chapters & Battles'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${prestigeLevel > 0 ? html`
                <button class="hub-btn" id="hub-skills" onClick=${() => handleAction('ui:openSkillTree')} type="button">
                  <img src="icons/Talentbaum (Prestige)-Photoroom.png" class="hub-btn-img" aria-hidden="true" alt="Talentbaum" />
                  <span class="cinzel text-lg">${t('hub.skilltree')}</span>
                  <span class="label">${lang === 'de' ? 'Prestige-Punkte nutzen' : 'Spend Prestige Points'}</span>
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
                <span class="cinzel text-lg">${lang === 'de' ? 'Ruhmeshalle' : 'Hall of Fame'}</span>
                <span class="label">${lang === 'de' ? 'Persönliche Rekorde' : 'Personal Records'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${bossProgress >= 3 ? html`
                <button class="hub-btn" id="hub-relic" onClick=${() => handleAction(EVENTS.UI_OPEN_RELICHUNT)} type="button">
                  <img src="icons/Relikt-Jagd (Relikte).png" class="hub-btn-img" aria-hidden="true" alt="Relikte" />
                  <span class="cinzel text-lg">${t('hub.relicHunt')}</span>
                  <span class="label">${lang === 'de' ? 'Relikte finden' : 'Find relics'}</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              ${prestigeLevel > 0 ? html`
                <button class="hub-btn hub-btn-danger span-2" id="hub-challenges" onClick=${() => handleAction('ui:openChallenges')} type="button">
                  <img src="icons/Anomalien (Challenges).png" class="hub-btn-img" aria-hidden="true" alt="Anomalien" />
                  <span class="cinzel text-lg text-danger">${lang === 'de' ? 'Anomalien' : 'Anomalies'}</span>
                  <span class="label">${lang === 'de' ? 'Extreme Herausforderungen' : 'Extreme Challenges'}</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              <button class="hub-btn" id="hub-wiki" onClick=${() => { setIsWikiOpen(true); setSelectedWikiItem(null); }} type="button">
                <span class="icon" aria-hidden="true">📖</span>
                <span class="cinzel text-lg">${lang === 'de' ? 'Archiv-Kodex' : 'Archive Codex'}</span>
                <span class="label">${lang === 'de' ? 'Lexikon & Spiel-Wiki' : 'Lexicon & Game Wiki'}</span>
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
                  <span class="cinzel text-lg">${lang === 'de' ? 'Artefakt-Schmiede' : 'Artifact Forge'}</span>
                  <span class="label">${lang === 'de' ? 'Ausrüstung herstellen' : 'Craft equipment'}</span>
                  <span class="hub-btn-glow"></span>
                </button>
              ` : null}
              <button class="hub-btn" id="hub-crafting" onClick=${() => handleAction(EVENTS.UI_OPEN_CRAFTING)} type="button">
                <span class="icon" aria-hidden="true">🏭</span>
                <span class="cinzel text-lg">${lang === 'de' ? 'Meisterwerkstatt' : 'Master Workshop'}</span>
                <span class="label">${lang === 'de' ? 'Komplexes Crafting' : 'Complex crafting'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              ${bossProgress >= 1 ? html`
                <button class="hub-btn" id="hub-library" onClick=${() => handleAction(EVENTS.UI_OPEN_LIBRARY)} type="button">
                  <span class="icon" aria-hidden="true">📚</span>
                  <span class="cinzel text-lg">${lang === 'de' ? 'Bibliothek' : 'Library'}</span>
                  <span class="label">${lang === 'de' ? 'Forschungen' : 'Research'}</span>
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
                <span class="cinzel text-lg">${t('hub.codex')}</span>
                <span class="label">${lang === 'de' ? 'Tagebuch & Lore' : 'Journal & Lore'}</span>
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
                <span class="cinzel text-lg">${lang === 'de' ? 'Weltrangliste' : 'World Ranking'}</span>
                <span class="label">${lang === 'de' ? 'Globale Bestenliste' : 'Global Leaderboard'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-guild" onClick=${() => handleAction(EVENTS.UI_OPEN_GUILD)} type="button">
                <span class="icon" aria-hidden="true">🏛️</span>
                <span class="cinzel text-lg">${t('hub.guild')}</span>
                <span class="label">${lang === 'de' ? 'Clan & Mitglieder' : 'Clan & Members'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-friends" onClick=${() => handleAction(EVENTS.UI_OPEN_FRIENDS)} type="button">
                <span class="icon" aria-hidden="true">👥</span>
                <span class="cinzel text-lg">${t('hub.friends')}</span>
                <span class="label">${lang === 'de' ? 'Freundesliste' : 'Friends list'}</span>
                <span class="hub-btn-glow"></span>
              </button>
              <button class="hub-btn" id="hub-chat" onClick=${() => handleAction(EVENTS.UI_OPEN_CHAT)} type="button">
                <span class="icon" aria-hidden="true">💬</span>
                <span class="cinzel text-lg">${t('hub.chat')}</span>
                <span class="label">${lang === 'de' ? 'Globaler Chat' : 'Global chat'}</span>
                <span class="hub-btn-glow"></span>
              </button>
            </div>
          </div>
        ` : null}
      </section>

      <!-- Hub-Footer -->
      <footer id="hub-footer">
        <button class="hub-back-btn glass-btn" id="hub-back-to-menu" onClick=${handleBackToMenu} type="button">« ${t('common.back')}</button>
        <div id="hub-notifications">
          <span id="hub-quest-indicator" style="display: none;">📋 ${lang === 'de' ? 'Mission aktiv' : 'Quest active'}</span>
        </div>
        <span class="hub-version">${t('menu.version')}</span>
      </footer>

      <!-- ARCHIV-KODEX WIKI MODAL OVERLAY -->
      ${isWikiOpen ? html`
        <div class="modal-overlay fade-in active" style="z-index: 15000; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
          <div class="glass-panel" style="max-width: 950px; width: 90%; height: 85vh; display: flex; flex-direction: column; padding: 1.5rem; border-color: var(--color-gold); background: rgba(10, 8, 5, 0.95); box-shadow: 0 0 40px rgba(212, 175, 55, 0.15); border-radius: 8px; position: relative;">
            
            <!-- Close Button -->
            <button class="glass-btn" style="position: absolute; top: 15px; right: 15px; border-radius: 50%; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-color: rgba(255,255,255,0.1); cursor: pointer;" onClick=${() => setIsWikiOpen(false)}>✕</button>

            <!-- Header -->
            <div style="text-align: center; margin-bottom: 1.2rem; border-bottom: 1px solid rgba(212, 175, 55, 0.15); padding-bottom: 0.8rem;">
              <h2 class="glow-text text-gold cinzel" style="font-size: 1.6rem; letter-spacing: 2px; margin: 0; text-transform: uppercase;">📖 ${lang === 'de' ? 'ARCHIV-KODEX' : 'ARCHIVE CODEX'} 📖</h2>
              <p style="color: #888; font-size: 0.78rem; margin: 3px 0 0 0; font-family: var(--font-header);">${lang === 'de' ? 'Das allsehende Lexikon über Spielmechaniken, Attribute und Gegenstände' : 'The all-seeing lexicon of game mechanics, attributes and items'}</p>
            </div>

            <!-- Main Layout (Sidebar + Content) -->
            <div style="display: flex; flex: 1; min-height: 0; gap: 1.5rem;">
              
              <!-- Sidebar -->
              <div style="width: 250px; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 1rem; gap: 0.8rem; overflow-y: auto;">
                
                <!-- Category Selector -->
                <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                  <button class="glass-btn ${wikiCategory === 'mechanics' ? 'primary' : ''}" style="text-align: left; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-family: var(--font-header);" onClick=${() => { setWikiCategory('mechanics'); setSelectedWikiItem(null); }}>
                    🌀 ${lang === 'de' ? 'Spielmechaniken' : 'Game Mechanics'}
                  </button>
                  <button class="glass-btn ${wikiCategory === 'stats' ? 'primary' : ''}" style="text-align: left; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-family: var(--font-header);" onClick=${() => { setWikiCategory('stats'); setSelectedWikiItem(null); }}>
                    ⚔️ ${lang === 'de' ? 'Attribute & Stats' : 'Attributes & Stats'}
                  </button>
                  <button class="glass-btn ${wikiCategory === 'items' ? 'primary' : ''}" style="text-align: left; padding: 0.5rem 0.8rem; font-size: 0.8rem; font-family: var(--font-header);" onClick=${() => { setWikiCategory('items'); setSelectedWikiItem(null); }}>
                    💎 ${lang === 'de' ? 'Beutestücke & Loot' : 'Loot & Equipment'}
                  </button>
                </div>

                <div style="height: 1px; background: rgba(255,255,255,0.05); margin: 0.2rem 0;"></div>

                <!-- Sub-items List based on Category -->
                <div style="display: flex; flex-direction: column; gap: 0.3rem; flex: 1; overflow-y: auto;">
                  ${wikiItems.map(item => html`
                    <button class="glass-btn" 
                            style="text-align: left; padding: 0.4rem 0.6rem; font-size: 0.72rem; border-color: ${selectedWikiItem?.id === item.id ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)'}; background: ${selectedWikiItem?.id === item.id ? 'rgba(212,175,55,0.05)' : 'transparent'};" 
                            onClick=${() => setSelectedWikiItem(item)}>
                      ${item.icon} ${item.name}
                    </button>
                  `)}
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
                        <h4 class="text-gold cinzel" style="font-size: 0.85rem; margin-top: 0; margin-bottom: 0.6rem; text-transform: uppercase;">${lang === 'de' ? 'Details & Funktionsweise' : 'Details & Mechanics'}</h4>
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
                            <div style="font-size: 0.7rem; color: #2ecc71; margin-top: 4px;">${lang === 'de' ? 'Segen' : 'Blessing'}: ${pact.passiveText}</div>
                            <div style="font-size: 0.7rem; color: #e74c3c; margin-top: 2px;">${lang === 'de' ? 'Fluch' : 'Curse'}: ${pact.curseText}</div>
                          </div>
                        `)}
                      </div>
                    ` : ''}

                    ${selectedWikiItem.itemsGrid && !selectedWikiItem.isLocked ? html`
                      <div style="font-size: 0.68rem; color: var(--color-gold); font-family: var(--font-header); font-style: italic; margin-bottom: 0.5rem; text-align: right; opacity: 0.8;">
                        ${lang === 'de' ? 'Es werden nur entdeckte Qualitätsstufen angezeigt. Dringe tiefer in das Archiv vor, um mächtigere Artefakte freizuschalten!' : 'Only discovered quality levels are displayed. Delve deeper into the Archive to unlock more powerful artifacts!'}
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
                          const rarityNames = {
                            de: {
                              common: 'Gewöhnlich',
                              uncommon: 'Ungewöhnlich',
                              rare: 'Selten',
                              epic: 'Episch',
                              legendary: 'Legendär'
                            },
                            en: {
                              common: 'Common',
                              uncommon: 'Uncommon',
                              rare: 'Rare',
                              epic: 'Epic',
                              legendary: 'Legendary'
                            }
                          }[lang];
                          return html`
                            <div class="glass-panel text-center" style="padding: 0.5rem; border-color: ${rarityColors[item.rarity] || '#aaa'}; background: rgba(0,0,0,0.3);">
                              <div style="font-size: 0.75rem; font-weight: bold; color: ${rarityColors[item.rarity]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title=${item.name}>${item.name}</div>
                              <div style="font-size: 0.6rem; color: #888; text-transform: uppercase; margin-top: 2px;">${rarityNames[item.rarity]}</div>
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
                    <h3 class="cinzel text-gold" style="font-size: 1.1rem; margin-bottom: 0.4rem;">${lang === 'de' ? 'Wähle ein Thema' : 'Choose a Topic'}</h3>
                    <p style="font-size: 0.75rem; line-height: 1.3;">${lang === 'de' ? 'Klicke links auf eine Kategorie und wähle einen Eintrag, um seine Geheimnisse und mathematischen Funktionsweisen zu enthüllen.' : 'Click on a category on the left and select an entry to reveal its secrets and mechanics.'}</p>
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

function getWikiItems(category, hero, bossProgress, prestigeLevel, guildId, lang = 'de') {
  const heroLevel = hero?.level || 1;

  if (category === 'mechanics') {
    const isPactsUnlocked = prestigeLevel > 0 || bossProgress >= 20;
    const isRaidsUnlocked = guildId || bossProgress >= 3;
    const isSocketsUnlocked = bossProgress >= 1;

    if (lang === 'en') {
      return [
        {
          id: 'time_warp',
          icon: '🌀',
          name: 'Mneme Time Warp',
          subtitle: 'Accelerating the flow of time',
          description: 'The Time Warp allows the chronologist to bend the timelines within the Archive. When activated, the global game clock speeds up by a factor of 3x for exactly 30 seconds.',
          details: [
            'Charging: Charges passively at +0.1% per second.',
            'Active Extraction: Each click on "Extract Mneme Particles" charges the clock by an additional +1.0%.',
            'Effect: Increases the speed of all calculations (energy, experience, expeditions, crafting) threefold without desynchronizing timestamps.',
            'Activation: The golden button in the upper right starts pulsing blue as soon as it reaches 100%.'
          ]
        },
        {
          id: 'dark_pacts',
          icon: isPactsUnlocked ? '🌀' : '🔒',
          name: isPactsUnlocked ? 'Dark Prestige Pacts' : '🔒 ???',
          subtitle: isPactsUnlocked ? 'Power at any cost' : 'Hidden Codex',
          description: isPactsUnlocked 
            ? 'Once you perform Eternity (Prestige), reality tears apart. You must choose one of three offered Dark Pacts. These pacts grant devastating blessings, but demand equally draconian sacrifices.'
            : 'A mysterious, sinful pact that only becomes visible once you eternalize your hero for the very first time. Continue the adventure to reveal this powerful covenant.',
          isLocked: !isPactsUnlocked,
          pacts: isPactsUnlocked ? Object.values(PACTS).map(p => ({
            name: p.name_en || p.name,
            passiveText: p.passiveText_en || p.passiveText,
            curseText: p.curseText_en || p.curseText
          })) : null
        },
        {
          id: 'clan_raids',
          icon: isRaidsUnlocked ? '👥' : '🔒',
          name: isRaidsUnlocked ? 'Heroic Clan Raids' : '🔒 ???',
          subtitle: isRaidsUnlocked ? 'Cooperative battles in the catacombs' : 'Hidden Expedition',
          description: isRaidsUnlocked
            ? 'In the Clan menu, you can not only send your followers on simple explorations, but also dispatch them on heroic expeditions (Clan Raids) deep into the dark catacombs.'
            : 'Gather a powerful following! This mechanic is unlocked once you join a guild or progress further in the adventure (defeat the 3rd boss).',
          isLocked: !isRaidsUnlocked,
          details: isRaidsUnlocked ? [
            'Participants: You can select between 1 and 5 idle clan members for the raid.',
            'Duration: A raid takes 5 minutes (300 seconds) by default.',
            'Success Chance: Scales with the combined level and toughness of all raiders.',
            'Rewards: Grants high XP for all participants, 1-3 rare crafting catalysts, and legendary loot chests (30% chance of high-tier epics/legendaries).'
          ] : null
        },
        {
          id: 'sockets',
          icon: isSocketsUnlocked ? '💎' : '🔒',
          name: isSocketsUnlocked ? 'Equipment Socket System' : '🔒 ???',
          subtitle: isSocketsUnlocked ? 'Power refinement through catalysts' : 'Ancient Alchemy',
          description: isSocketsUnlocked
            ? 'Items of "Rare", "Epic" and "Legendary" quality can have empty sockets for catalysts. These can be slotted in the Artifact Forge.'
            : 'Unlock the Artifact Forge (defeat the first boss of the Archive) to learn how to insert powerful gem catalysts into armors.',
          isLocked: !isSocketsUnlocked,
          details: isSocketsUnlocked ? [
            'Socket Count: Rare items have up to 1 socket, Epic up to 2, Legendary up to 3 sockets.',
            'Ember Ruby: Permanently grants +5 attack power per socket.',
            'Warding Sapphire: Permanently grants +5 toughness/defense per socket.',
            'Agility Emerald: Permanently grants +5 dexterity per socket.',
            'Vitality Amber: Permanently grants +5 vitality/max HP per socket.',
            'Catalyst Costs: Each slotting consumes 1 rare catalyst, primarily earned via Clan Raids.'
          ] : null
        }
      ];
    }

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

    if (lang === 'en') {
      return [
        {
          id: 'stat_attack',
          icon: '⚔️',
          name: 'Attack Power',
          subtitle: 'Destructive force in combat',
          description: 'The most critical attribute for any warrior. Determines how hard your attacks strike bosses and monsters in the Archive.',
          details: [
            'Increase: Raised by spending stat points, crafting new weapons, and socketing Ember Rubies.',
            'Scaling: Each point in attack increases your base damage in combat by 1.5.'
          ]
        },
        {
          id: 'stat_defense',
          icon: '🛡️',
          name: 'Toughness & Defense',
          subtitle: 'Protection from enemy attacks',
          description: 'Reduces the damage your hero suffers from hits by anomalies or bosses.',
          details: showAdvancedFormulas ? [
            'Damage Reduction: Defense is directly converted into damage reduction (DR).',
            'Formula: DR (%) = (Defense / (Defense + 100)) * 100.',
            'Cap: Maximum of 85% damage reduction achievable through armor items.'
          ] : [
            'Damage Reduction: Reduces incoming damage.',
            '💡 Advanced Tip: Reach Hero Level 5 to decode the exact mathematical damage calculation of this attribute in the Codex!'
          ]
        },
        {
          id: 'stat_agility',
          icon: '⚡',
          name: 'Dexterity / Agility',
          subtitle: 'Speed and precision',
          description: 'Influences tactical agility and reflexes in the Archive combat system.',
          details: [
            'Evasion: Increases your chance to completely dodge enemy attacks without taking damage.',
            'Critical Strikes: Boosts the probability of landing devastating critical hits that deal double damage.'
          ]
        },
        {
          id: 'stat_stamina',
          icon: '❤️',
          name: 'Vitality & Stamina',
          subtitle: 'Your life force',
          description: 'Determines the amount of punishment and attacks your hero can endure before dying.',
          details: [
            'Hit Points (HP): Each point in Vitality permanently increases your maximum hit points by 12 HP.'
          ]
        }
      ];
    }
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

    if (lang === 'en') {
      return [
        {
          id: 'slot_weapon',
          icon: '🗡️',
          name: 'Weapons',
          subtitle: 'Two-handers, Staves & Daggers',
          description: 'Weapons occupy the active hand slot of the hero and focus exclusively on scaling attack power and dexterity.',
          itemsGrid: filteredItems.filter(i => i.slot === 'weapon')
        },
        {
          id: 'slot_shield',
          icon: '🛡️',
          name: 'Shields',
          subtitle: 'Bulwarks and Round Shields',
          description: 'Shields are carried in the off-hand. They maximize your toughness and grant high armor values.',
          itemsGrid: filteredItems.filter(i => i.slot === 'shield')
        },
        {
          id: 'slot_armor',
          icon: '👕',
          name: 'Armor & Robes',
          subtitle: 'Breastplates and Mage Robes',
          description: 'Body wear provides the strongest foundation for physical defense and vitality multipliers.',
          itemsGrid: filteredItems.filter(i => i.slot === 'armor')
        },
        {
          id: 'slot_helmet',
          icon: '🪖',
          name: 'Helmets & Diadems',
          subtitle: 'Headwear of Power',
          description: 'Head protection that often possesses additional vitality, dexterity, or intelligence attribute bonuses.',
          itemsGrid: filteredItems.filter(i => i.slot === 'helmet')
        },
        {
          id: 'slot_shoulders',
          icon: '🛡️',
          name: 'Shoulders',
          subtitle: 'Plates and Pauldrons',
          description: 'Shoulder armor for toughness, vitality, and wearer comfort.',
          itemsGrid: filteredItems.filter(i => i.slot === 'shoulders')
        },
        {
          id: 'slot_gloves',
          icon: '🧤',
          name: 'Gloves',
          subtitle: 'Precision Grips',
          description: 'Gloves that steady your grip on your weapon and grant dexterity or attack bonuses.',
          itemsGrid: filteredItems.filter(i => i.slot === 'gloves')
        },
        {
          id: 'slot_belt',
          icon: '🎗️',
          name: 'Belts',
          subtitle: 'Buckles & Sashes',
          description: 'Belts offer minor attributes on toughness and stamina.',
          itemsGrid: filteredItems.filter(i => i.slot === 'belt')
        },
        {
          id: 'slot_boots',
          icon: '🥾',
          name: 'Boots',
          subtitle: 'Steps of Eternity',
          description: 'Boots speed up your journey and significantly increase your agility and evasion.',
          itemsGrid: filteredItems.filter(i => i.slot === 'boots')
        },
        {
          id: 'slot_jewelry',
          icon: '💍',
          name: 'Jewelry',
          subtitle: 'Amulets & Signet Rings',
          description: 'Particularly precious jewelry (rings, amulets) that display unmatched hybrid attribute combinations.',
          itemsGrid: filteredItems.filter(i => i.slot === 'ring' || i.slot === 'amulet')
        }
      ];
    }

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
