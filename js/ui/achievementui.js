import { html, useState, useEventBus } from './preact-setup.js';
import { EVENTS } from '../core/events.js';
import ErrorBoundary from './ErrorBoundary.js';

function AchievementList({ context, onClose }) {
    const { eventBus, achievementManager } = context;
    const [achievements, setAchievements] = useState([]);

    const refreshAchievements = () => {
        try {
            setAchievements([...achievementManager.getAchievements()]);
        } catch (e) {
            console.error('[AchievementUI] refresh failed:', e);
        }
    };

    useEventBus(eventBus, 'ui:openAchievements', refreshAchievements);
    useEventBus(eventBus, EVENTS.ACHIEVEMENT_UNLOCKED, refreshAchievements);
    useEventBus(eventBus, EVENTS.ACHIEVEMENT_CLAIMED, refreshAchievements);

    const handleClaim = (e, achId) => {
        try {
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
        } catch (error) {
            console.error('[AchievementUI] claim failed:', error);
            eventBus.publish('ui:showToast', {
                message: `❌ Fehler beim Einlösen: ${error.message}`,
                type: 'error',
                duration: 4000
            });
        }
    };

    const renderProgress = (ach) => {
        const progressPercent = Math.min(100, (ach.progress / ach.target) * 100);
        const isComplete = ach.progress >= ach.target;

        return html`
            <div class="achievement-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${isComplete ? 'var(--color-gold)' : 'var(--color-text-muted)'};"></div>
                    <div class="progress-text">${Math.round(progressPercent)}%</div>
                </div>
            </div>
        `;
    };

    if (achievements.length === 0) {
        return html`
            <div class="achievement-empty-state">
                <span class="achievement-empty-icon">📜</span>
                <div class="achievement-empty-text">Keine Erfolge verfügbar.</div>
                <div class="achievement-empty-hint">Mehr Erfolge werden mit dem Fortschritt freigeschaltet.</div>
            </div>
        `;
    }

    return html`
        <div class="modal-scroll-area">
            ${achievements.map(ach => {
                const rewards = [];
                if (ach.reward.particles) rewards.push(`${ach.reward.particles} Partikel`);
                if (ach.reward.relics) rewards.push(`${ach.reward.relics} Relikte`);
                if (ach.reward.artifacts) rewards.push(`${ach.reward.artifacts} Artefakte`);
                if (ach.reward.title) rewards.push(`📛 Titel: ${ach.reward.title}`);

                let statusClass = 'locked';
                let statusText = '🔒 Gesperrt';
                let actionHtml = '';

                if (ach.claimed) {
                    statusClass = 'claimed';
                    statusText = '✅ Abgeholt';
                    actionHtml = html`<span class="achievement-status-text claimed">${statusText}</span>`;
                } else if (ach.achieved) {
                    statusClass = 'achieved';
                    statusText = '🎯 Bereit';
                    actionHtml = html`
                        <button class="glass-btn primary btn-small" onClick=${(e) => handleClaim(e, ach.id)}>
                            🎁 Abholen
                        </button>
                    `;
                } else {
                    statusClass = 'locked';
                    statusText = '🔒 Gesperrt';
                    actionHtml = html`<span class="achievement-status-text locked">${statusText}</span>`;
                }

                const titleColor = ach.achieved && !ach.claimed ? 'var(--color-gold)' : 
                                  ach.claimed ? 'var(--color-success)' : 
                                  'var(--color-text-muted)';

                return html`
                    <div class="achievement-card ${statusClass}" key=${ach.id}>
                        <div class="achievement-info">
                            <div class="achievement-title" style="color: ${titleColor}">
                                ${ach.claimed ? '✅ ' : ach.achieved ? '✨ ' : '🔒 '} ${ach.label}
                            </div>
                            <div class="achievement-reward">
                                🎁 Belohnung: <span class="text-gold">${rewards.join(' | ')}</span>
                            </div>
                            ${renderProgress(ach)}
                        </div>
                        <div class="achievement-action">
                            ${actionHtml}
                        </div>
                    </div>
                `;
            })}
        </div>
    `;
}

// ---- HAUPT-KOMPONENTE MIT ERRORBOUNDARY ----
export default function AchievementUI({ context }) {
    const { eventBus } = context;
    const [isOpen, setIsOpen] = useState(false);

    useEventBus(eventBus, 'ui:openAchievements', () => {
        setIsOpen(true);
    });

    if (!isOpen) return null;

    // Event zum Schließen
    const handleClose = () => setIsOpen(false);

    // Fallback für ErrorBoundary
    const fallback = html`
        <div class="modal-overlay" style="display: flex;" onClick=${handleClose}>
            <div class="modal-content glass-panel" onClick=${(e) => e.stopPropagation()} style="max-width: 500px;">
                <button class="modal-close glass-btn" onClick=${handleClose}>×</button>
                <h2 style="color: var(--color-danger); font-family: var(--font-header); text-align: center; margin-bottom: 1rem;">
                    ⚠️ Fehler beim Laden der Erfolge
                </h2>
                <p style="color: var(--color-text-muted); text-align: center; margin-bottom: 1rem;">
                    Die Erfolgsliste konnte nicht geladen werden. Bitte versuche es später erneut.
                </p>
                <button class="glass-btn primary w-100" onClick=${handleClose}>Schließen</button>
            </div>
        </div>
    `;

    return html`
        <div class="modal-overlay" style="display: flex;" onClick=${handleClose}>
            <div class="modal-content glass-panel" onClick=${(e) => e.stopPropagation()}>
                <button class="modal-close glass-btn" onClick=${handleClose}>×</button>
                <h2 class="achievement-modal-title">🏆 Erfolge &amp; Meilensteine</h2>
                <div class="achievement-modal-subtitle">Erreiche Ziele, um seltene Titel und Belohnungen freizuschalten.</div>
                
                <${ErrorBoundary} eventBus=${eventBus} fallback=${fallback} onReset=${() => setIsOpen(false)}>
                    <${AchievementList} context=${context} onClose=${handleClose} />
                <//>
            </div>
        </div>
    `;
}