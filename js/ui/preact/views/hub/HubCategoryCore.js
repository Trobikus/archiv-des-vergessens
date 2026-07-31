import { h, html } from '../../setup.js';
import { EVENTS } from '../../../../core/events/definitions.js';

export function HubCategoryCore({ lang, bossProgress, prestigeLevel, pendingEwigeMneme, handleEnterGame, handleAction, handleEwigeMnemePrestige }) {
  return html`
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
        ${(bossProgress >= 3 || prestigeLevel > 0) ? html`
          <button class="hub-btn" id="hub-vault" onClick=${() => handleAction('ui:openSharedVault')} type="button">
            <span style="font-size: 2.2rem; margin-bottom: 4px; display: block;">🏦</span>
            <span class="cinzel text-lg">${lang === 'de' ? 'Account-Lager' : 'Account Vault'}</span>
            <span class="label">${lang === 'de' ? 'Gemeinsamer Tresor' : 'Shared Vault'}</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
        <button class="hub-btn" id="hub-story" onClick=${() => handleAction(EVENTS.UI_OPEN_STORY)} type="button">
          <img src="icons/Bossfight.png" class="hub-btn-img" aria-hidden="true" alt="Story & Bosse" />
          <span class="cinzel text-lg">${lang === 'de' ? 'Story & Bosse' : 'Story & Bosses'}</span>
          <span class="label">${lang === 'de' ? 'Kapitel & Kämpfe' : 'Chapters & Battles'}</span>
          <span class="hub-btn-glow"></span>
        </button>
        
        ${pendingEwigeMneme > 0 ? html`
          <button class="hub-btn primary epic-pulse" id="hub-prestige-ewig" onClick=${handleEwigeMnemePrestige} type="button">
            <span style="font-size: 2.2rem; margin-bottom: 4px; display: block; filter: drop-shadow(0 0 10px var(--color-primary));">🌌</span>
            <span class="cinzel text-lg">${lang === 'de' ? 'Verewigung' : 'Eternity'}</span>
            <span class="label text-gold">+${pendingEwigeMneme} Ewige Mneme</span>
            <span class="hub-btn-glow"></span>
          </button>
        ` : null}
      </div>
    </div>
  `;
}
