import { h, html } from '../../setup.js';
import { PACTS } from '../../../../data/pacts.js';

export function ResourcesTab({ resources, hero, lang, onOpenSkillTree, getLocText }) {
  return html`
    <div class="glass-inner-panel mb-2">
      <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">${lang === 'de' ? 'Erinnerungsschatz' : 'Memory Vault'}</h3>
      <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Mneme-Partikel:' : 'Mneme Particles:'}</span> <span class="text-gold text-bold">${resources.particles}</span></div>
      <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Mneme-Relikte:' : 'Mneme Relics:'}</span> <span class="text-gold text-bold">${resources.relics}</span></div>
      <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Mneme-Artefakte:' : 'Mneme Artifacts:'}</span> <span class="text-gold text-bold">${resources.artifacts}</span></div>
      <div class="flex-between"><span class="text-muted">${lang === 'de' ? 'Erinnerungsstaub:' : 'Memory Dust:'}</span> <span class="text-dust text-bold">${resources.memoryDust}</span></div>
    </div>
    <div class="glass-inner-panel mb-2">
      <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">${lang === 'de' ? 'Heldentum & Prestige' : 'Heroism & Prestige'}</h3>
      <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Prestige-Stufe:' : 'Prestige Level:'}</span> <span class="text-gold text-bold">${lang === 'de' ? 'Stufe' : 'Level'} ${hero?.prestige?.level || 0}</span></div>
      <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Prestige-Punkte:' : 'Prestige Points:'}</span> <span class="text-gold text-bold">${hero?.prestige?.points || 0}</span></div>
      <div style="margin-top: 0.8rem;">
        <button
          class="glass-btn primary cinzel"
          style="width: 100%; padding: 0.6rem; font-size: 0.85rem; border-color: #00e5ff; color: #00e5ff;"
          onClick=${onOpenSkillTree}
        >
          🌌 Mneme-Talentbaum
        </button>
      </div>
      ${(() => {
        const activePactId = hero?.prestige?.activePact;
        const activePactData = activePactId ? PACTS[activePactId] : null;
        if (activePactData) {
          return html`
            <div style="margin-top: 0.6rem; padding: 0.5rem; background: rgba(212,175,55,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 4px; box-shadow: inset 0 0 10px rgba(212,175,55,0.05);">
              <div style="font-size: 0.58rem; text-transform: uppercase; color: var(--color-gold); font-family: var(--font-header); font-weight: bold; letter-spacing: 0.5px;">${lang === 'de' ? 'Aktiver finsterer Pakt' : 'Active Dark Pact'}</div>
              <div class="text-gold text-bold" style="font-size: 0.78rem; font-family: var(--font-header); margin-top: 1px;">${getLocText(activePactData, 'name')}</div>
              <div style="font-size: 0.68rem; color: #2ecc71; margin-top: 4px; font-weight: 500;">${getLocText(activePactData, 'passiveText')}</div>
              <div style="font-size: 0.68rem; color: #e74c3c; margin-top: 2px; font-weight: 500;">${getLocText(activePactData, 'curseText')}</div>
            </div>
          `;
        } else {
          return html`
            <div class="text-muted text-center" style="font-size: 0.68rem; margin-top: 0.6rem; font-style: italic; opacity: 0.6;">${lang === 'de' ? 'Kein aktiver Sündenpakt vorhanden.' : 'No active sin pact present.'}</div>
          `;
        }
      })()}
    </div>
    <div class="glass-inner-panel">
      <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">${lang === 'de' ? 'Statistiken' : 'Statistics'}</h3>
      <div class="flex-between mb-1"><span class="text-muted">${lang === 'de' ? 'Besiegte Bosse:' : 'Defeated Bosses:'}</span> <span class="text-highlight text-bold">${hero?.prestige?.defeatedBosses?.length || 0}</span></div>
      <div class="flex-between"><span class="text-muted">${lang === 'de' ? 'Erworbene Titel:' : 'Acquired Titles:'}</span> <span class="text-gold text-bold">${Array.from(new Set(hero?.titles || [])).length}</span></div>
    </div>
  `;
}
