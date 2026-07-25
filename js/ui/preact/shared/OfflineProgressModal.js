import { h, html, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function OfflineProgressModal({ eventBus, services }) {
  const [isOpen, setIsOpen] = useState(false);
  const [progressData, setProgressData] = useState({
    timeStr: '0s',
    particles: 0,
    relics: 0,
    artifacts: 0,
    levels: 0
  });

  useEffect(() => {
    if (!eventBus) return;

    const handleShowOfflineProgress = (data) => {
      setProgressData({
        timeStr: data.timeStr || '0s',
        particles: data.particles || 0,
        relics: data.relics || 0,
        artifacts: data.artifacts || 0,
        levels: data.levels || 0
      });
      setIsOpen(true);
    };

    const handleCloseAllModals = () => {
      setIsOpen(false);
    };

    const sub1 = eventBus.subscribe(EVENTS.UI_SHOW_OFFLINE_PROGRESS, handleShowOfflineProgress);
    const sub2 = eventBus.subscribe(EVENTS.UI_CLOSE_ALL_MODALS, handleCloseAllModals);

    return () => {
      eventBus.unsubscribe(sub1);
      eventBus.unsubscribe(sub2);
    };
  }, [eventBus]);

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay" style="display: flex; z-index: 1000;" role="dialog" aria-label="Offline-Belohnungen">
      <div class="modal-content-small glass-panel">
        <h2 class="glow-text text-gold cinzel text-center">WILLKOMMEN ZURÜCK!</h2>
        <p class="text-muted text-center mb-2">Das Archiv ruhte nie, während du fort warst.</p>
        <div class="glass-inner-panel mb-2">
          <div class="flex-between mb-1"><span class="text-muted">Abwesenheitszeit:</span><span class="text-bold text-highlight">${progressData.timeStr}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">+ Mneme-Partikel:</span><span class="text-gold text-bold">${progressData.particles}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">+ Mneme-Relikte:</span><span class="text-gold text-bold">${progressData.relics}</span></div>
          <div class="flex-between mb-1"><span class="text-muted">+ Mneme-Artefakte:</span><span class="text-gold text-bold">${progressData.artifacts}</span></div>
          <div class="flex-between"><span class="text-muted">+ Stufenaufstiege:</span><span class="text-success text-bold">${progressData.levels}</span></div>
        </div>
        <button class="glass-btn primary w-100" type="button" onClick=${() => setIsOpen(false)}>Archiv betreten</button>
      </div>
    </div>
  `;
}
