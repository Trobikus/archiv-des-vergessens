import { h, html } from '../../setup.js';
import { EVENTS } from '../../../../core/events/definitions.js';

export function HubCategoryCollection({ bossProgress, prestigeLevel, lang, t, handleAction }) {
  return html`
    <div id="hub-category-collection" class="hub-category">
      <div class="hub-grid">
        ${(bossProgress >= 3 || prestigeLevel > 0) ? html`
          <button class="hub-btn" id="hub-relic" onClick=${() => handleAction(EVENTS.UI_OPEN_RELICHUNT)} type="button">
            <img src="icons/Relikt-Jagd (Relikte).png" class="hub-btn-img" aria-hidden="true" alt="Relikte" />
            <span class="cinzel text-lg">${t('hub.relicHunt')}</span>
            <span class="label">${lang === 'de' ? 'Relikte finden' : 'Find relics'}</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
        ${(prestigeLevel > 0 || bossProgress >= 20) ? html`
          <button class="hub-btn hub-btn-danger" id="hub-challenges" onClick=${() => handleAction('ui:openChallenges')} type="button">
            <img src="icons/Anomalien (Challenges).png" class="hub-btn-img" aria-hidden="true" alt="Anomalien" />
            <span class="cinzel text-lg text-danger">${lang === 'de' ? 'Anomalien' : 'Anomalies'}</span>
            <span class="label">${lang === 'de' ? 'Extreme Herausforderungen' : 'Extreme Challenges'}</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
      </div>
    </div>
  `;
}
