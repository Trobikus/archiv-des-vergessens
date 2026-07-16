import { html, useState, useEventBus } from './preact-setup.js';
import { EVENTS } from '../core/events.js';

export default function AchievementUI({ context }) {
  const { eventBus, achievementManager } = context;

  const [isOpen, setIsOpen] = useState(false);
  const [achievements, setAchievements] = useState([]);

  const refreshAchievements = () => {
    setAchievements([...achievementManager.getAchievements()]);
  };

  useEventBus(eventBus, 'ui:openAchievements', () => {
    refreshAchievements();
    setIsOpen(true);
  });
  useEventBus(eventBus, EVENTS.ACHIEVEMENT_UNLOCKED, refreshAchievements);
  useEventBus(eventBus, EVENTS.ACHIEVEMENT_CLAIMED, refreshAchievements);

  const handleClaim = (e, achId) => {
    const row = e.currentTarget.closest('.achievement-card');
    row.classList.add('flash-gold');
    document.body.classList.add('screen-shake');

    if (window.spawnClickParticles) {
      window.spawnClickParticles(e.clientX, e.clientY);
    }

    setTimeout(() => {
      row.classList.remove('flash-gold');
      document.body.classList.remove('screen-shake');
      achievementManager.claimReward(achId);
    }, 300);
  };

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${() => setIsOpen(false)}>
      <div class="modal-content glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close glass-btn" onClick=${() => setIsOpen(false)} aria-label="Schließen">×</button>
        <h2 class="modal-title glow-text">Erfolge & Meilensteine</h2>
        <div class="hub-subtitle mb-1">Erreiche Ziele, um seltene Titel und Belohnungen freizuschalten.</div>
        
        <div class="modal-scroll-area">
          ${achievements.length === 0 ? html`
            <div style="color: #5a5a6a; font-style: italic;">Keine Erfolge verfügbar.</div>
          ` : achievements.map(ach => {

            const rewards = [];
            if (ach.reward.particles) rewards.push(`${ach.reward.particles} Partikel`);
            if (ach.reward.relics) rewards.push(`${ach.reward.relics} Relikte`);
            if (ach.reward.artifacts) rewards.push(`${ach.reward.artifacts} Artefakte`);
            if (ach.reward.title) rewards.push(`Titel: ${ach.reward.title}`);

            const statusClass = ach.claimed ? 'claimed' : ach.achieved ? 'achieved' : 'locked';

            return html`
              <div class="ui-card achievement-card ${statusClass}" key=${ach.id}>
                <div>
                  <div class="ui-card-title ach-title">${ach.label}</div>
                  <div class="ui-card-desc ach-desc">Belohnung: ${rewards.join(' | ')}</div>
                  <div class="ui-card-meta ach-meta">Fortschritt: ${ach.progress} / ${ach.target}</div>
                </div>
                <div class="ach-action">
                  ${ach.claimed ? html`<span style="color:#8a7a5a;">✅ Abgeholt</span>`
                : ach.achieved ? html`<button class="ui-btn ui-btn-gold" onClick=${(e) => handleClaim(e, ach.id)}>Abholen</button>`
                  : html`<span style="color:#5a5a6a;">🔒 Gesperrt</span>`}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}