import { h, html } from '../../setup.js';

export function HubNavigation({ activeCategory, handleTabClick, bossProgress, prestigeLevel, lang, t }) {
  return html`
    <nav class="hub-tab-bar" aria-label="Hub-Kategorien">
      <button class="hub-tab-btn ${activeCategory === 'core' ? 'active' : ''}" onClick=${() => handleTabClick('core')} type="button">
        <img src="icons/Kern (Core).png" class="tab-icon-img" aria-hidden="true" alt="Kern" />
        <span class="tab-label">${lang === 'de' ? 'Kern' : 'Core'}</span>
      </button>
      ${(bossProgress >= 1 || prestigeLevel > 0) ? html`
        <button class="hub-tab-btn ${activeCategory === 'crafting' ? 'active' : ''}" onClick=${() => handleTabClick('crafting')} type="button">
          <img src="icons/Handwerk (Crafting).png" class="tab-icon-img" aria-hidden="true" alt="Handwerk" />
          <span class="tab-label">${t('hub.crafting')}</span>
        </button>
      ` : null}
      ${(bossProgress >= 3 || prestigeLevel > 0) ? html`
        <button class="hub-tab-btn ${activeCategory === 'collection' ? 'active' : ''}" onClick=${() => handleTabClick('collection')} type="button">
          <img src="icons/Sammlung (Collection).png" class="tab-icon-img" aria-hidden="true" alt="Sammlung" />
          <span class="tab-label">${lang === 'de' ? 'Sammlung' : 'Collection'}</span>
        </button>
      ` : null}
      <button class="hub-tab-btn ${activeCategory === 'social' ? 'active' : ''}" onClick=${() => handleTabClick('social')} type="button">
        <img src="icons/Gemeinschaft (Social).png" class="tab-icon-img" aria-hidden="true" alt="Gemeinschaft" />
        <span class="tab-label">${lang === 'de' ? 'Gemeinschaft' : 'Social'}</span>
      </button>
      <button class="hub-tab-btn ${activeCategory === 'settings' ? 'active' : ''}" onClick=${() => handleTabClick('settings')} type="button">
        <span class="icon" aria-hidden="true" style="font-size: 1.2rem; margin-right: 4px;">⚙️</span>
        <span class="tab-label">${lang === 'de' ? 'Einstellungen' : 'Settings'}</span>
      </button>
    </nav>
  `;
}
