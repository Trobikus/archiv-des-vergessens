import { h, html } from '../../setup.js';
import { EVENTS } from '../../../../core/events/definitions.js';

export function HubCategoryCrafting({ bossProgress, prestigeLevel, lang, t, handleAction }) {
  return html`
    <div id="hub-category-crafting" class="hub-category">
      <div class="hub-grid">
        ${(bossProgress >= 1 || prestigeLevel > 0) ? html`
          <button class="hub-btn" id="hub-artifact" onClick=${() => handleAction(EVENTS.UI_OPEN_FORGE)} type="button">
            <span class="icon" aria-hidden="true">⚒️</span>
            <span class="cinzel text-lg">${lang === 'de' ? 'Artefakt-Schmiede' : 'Artifact Forge'}</span>
            <span class="label">${lang === 'de' ? 'Ausrüstung herstellen' : 'Craft equipment'}</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
        ${(bossProgress >= 1 || prestigeLevel > 0) ? html`
          <button class="hub-btn" id="hub-crafting" onClick=${() => handleAction(EVENTS.UI_OPEN_CRAFTING)} type="button">
            <span class="icon" aria-hidden="true">🏭</span>
            <span class="cinzel text-lg">${lang === 'de' ? 'Meisterwerkstatt' : 'Master Workshop'}</span>
            <span class="label">${lang === 'de' ? 'Komplexes Crafting' : 'Complex crafting'}</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
        ${(bossProgress >= 1 || prestigeLevel > 0) ? html`
          <button class="hub-btn" id="hub-library" onClick=${() => handleAction(EVENTS.UI_OPEN_LIBRARY)} type="button">
            <span class="icon" aria-hidden="true">📚</span>
            <span class="cinzel text-lg">${lang === 'de' ? 'Bibliothek' : 'Library'}</span>
            <span class="label">${lang === 'de' ? 'Forschungen' : 'Research'}</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
      </div>
    </div>
  `;
}
