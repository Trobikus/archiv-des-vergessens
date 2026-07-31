import { h, html } from '../../setup.js';
import { EVENTS } from '../../../../core/events/definitions.js';

export function HubCategorySettings({ lang, t, handleAction, setIsWikiOpen }) {
  return html`
    <div id="hub-category-settings" class="hub-category">
      <div class="hub-grid">
        <button class="hub-btn" id="hub-wiki" onClick=${() => setIsWikiOpen(true)} type="button">
          <span class="icon" aria-hidden="true">📖</span>
          <span class="cinzel text-lg">${lang === 'de' ? 'Archiv-Kodex' : 'Archive Codex'}</span>
          <span class="label">${lang === 'de' ? 'Lexikon & Spiel-Wiki' : 'Lexicon & Game Wiki'}</span>
          <span class="hub-btn-glow"></span>
        </button>
        <button class="hub-btn" id="hub-codex" onClick=${() => handleAction(EVENTS.UI_OPEN_CODEX)} type="button">
          <span class="icon" aria-hidden="true">📚</span>
          <span class="cinzel text-lg">${t('hub.codex')}</span>
          <span class="label">${lang === 'de' ? 'Tagebuch & Lore' : 'Journal & Lore'}</span>
          <span class="hub-btn-glow"></span>
        </button>
        <button class="hub-btn" id="hub-options" onClick=${() => handleAction('menu:options')} type="button">
          <span class="icon" aria-hidden="true">⚙️</span>
          <span class="cinzel text-lg">${lang === 'de' ? 'Optionen' : 'Options'}</span>
          <span class="label">${lang === 'de' ? 'Audio & Grafik' : 'Audio & Graphics'}</span>
          <span class="hub-btn-glow"></span>
        </button>
      </div>
    </div>
  `;
}
