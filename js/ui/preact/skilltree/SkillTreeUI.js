/**
 * ============================================================
 * FILE: ui/preact/skilltree/SkillTreeUI.js – Talentbaum
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function SkillTreeUI({ stateManager, eventBus, services }) {
  const { skillTreeService, heroService } = services;
  const [isOpen, setIsOpen] = useState(false);

  const hero = useStateSelector(stateManager, (state) => state.hero);
  const skills = useStateSelector(stateManager, () => skillTreeService.getSkills());

  useEventBus(eventBus, 'ui:openSkillTree', () => setIsOpen(true));
  useEventBus(eventBus, 'hero:updated', () => {});

  if (!isOpen) return null;

  const handleUnlock = (skillId) => {
    const result = skillTreeService.unlockSkill(skillId);
    if (result.success) {
      eventBus.publish('ui:showToast', {
        message: `🌳 ${result.message}`,
        type: 'success',
        duration: 3000
      });
    } else {
      eventBus.publish('ui:showToast', {
        message: `❌ ${result.message}`,
        type: 'warning',
        duration: 2000
      });
    }
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 700px; max-width: 95vw; max-height: 85vh;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="modal-title glow-text text-success cinzel text-center">Talentbaum der Erinnerung</h2>

        <div class="skilltree-points-display" style="text-align: center; padding: 0.6rem 1.2rem; margin-bottom: 1rem; border-left: 3px solid var(--color-gold); background: rgba(0,0,0,0.2);">
          <span class="text-muted">Verfügbare Prestige-Punkte:</span>
          <span class="text-gold text-bold text-lg glow-text">${hero.prestige.points}</span>
        </div>

        <div class="modal-scroll-area" style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
          ${skills.map(skill => {
            const isUnlocked = hero.unlockedSkills.includes(skill.id);
            const canUnlock = !isUnlocked &&
              skill.req.every(r => hero.unlockedSkills.includes(r)) &&
              hero.prestige.points >= skill.cost;

            return html`
              <div class="skilltree-card glass-inner-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; margin-bottom: 0.6rem; border-left: 3px solid ${isUnlocked ? 'var(--color-success)' : canUnlock ? 'var(--color-gold)' : 'var(--color-text-muted)'}; opacity: ${isUnlocked || canUnlock ? 1 : 0.5}; transition: all 0.3s ease;">
                <div class="skilltree-info" style="flex: 1; min-width: 0;">
                  <div class="skilltree-name" style="font-family: var(--font-header); font-size: 1.05rem; color: ${isUnlocked ? 'var(--color-success)' : canUnlock ? 'var(--color-gold)' : 'var(--color-text-muted)'};">${isUnlocked ? '✅ ' : ''}${skill.name}</div>
                  <div class="skilltree-desc" style="color: var(--color-text-muted); font-size: 0.85rem;">${skill.desc}</div>
                  <div class="skilltree-reqs" style="color: var(--color-text-muted); font-size: 0.7rem; margin-top: 0.1rem;">
                    Voraussetzungen: ${skill.req.length === 0 ? 'Keine' : skill.req.map(r => {
                      const s = skills.find(sk => sk.id === r);
                      return s ? s.name : r;
                    }).join(', ')}
                  </div>
                </div>
                <div class="skilltree-action" style="flex-shrink: 0; margin-left: 1rem; min-width: 70px; text-align: center;">
                  ${!isUnlocked ? html`
                    <button class="glass-btn primary btn-small unlock-btn" onClick=${() => handleUnlock(skill.id)} disabled=${!canUnlock}>
                      ${skill.cost} PP
                    </button>
                  ` : html`<span class="skilltree-unlocked" style="color: var(--color-success); font-weight: bold;">✅ Aktiv</span>`}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}