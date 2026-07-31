import { h, html } from '../../setup.js';
import { EVENTS } from '../../../../core/events/definitions.js';

export function HubCategorySocial({ lang, t, handleAction }) {
  return html`
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
  `;
}
