import { h, html, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function UpdateModal({ eventBus, services }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    title: 'Neue Offenbarung',
    subtitle: 'Ein Update wurde im Archiv gesichtet',
    message: 'Version 1.6.0 ist verfügbar. Möchtest du die neuen Aufzeichnungen herunterladen?',
    onConfirm: null
  });

  useEffect(() => {
    if (!eventBus) return;

    const handleShowUpdate = (data) => {
      setUpdateData({
        title: data.title || 'Neue Offenbarung',
        subtitle: data.subtitle || 'Ein Update wurde im Archiv gesichtet',
        message: data.message || 'Ein Update ist verfügbar. Möchtest du die neuen Aufzeichnungen herunterladen?',
        onConfirm: data.onConfirm
      });
      setIsOpen(true);
    };

    const handleCloseAllModals = () => {
      setIsOpen(false);
    };

    const sub1 = eventBus.subscribe(EVENTS.UI_SHOW_UPDATE_MODAL, handleShowUpdate);
    const sub2 = eventBus.subscribe(EVENTS.UI_CLOSE_ALL_MODALS, handleCloseAllModals);

    return () => {
      eventBus.unsubscribe(sub1);
      eventBus.unsubscribe(sub2);
    };
  }, [eventBus]);

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay" style="display: flex; z-index: 11000;" role="dialog" aria-label="Update-Benachrichtigung">
      <div class="modal-content glass-panel" style="width: 480px; max-width: 95vw; text-align: center;">
        <h2 class="glow-text text-gold cinzel text-center">${updateData.title}</h2>
        <p class="text-muted text-center mb-2">${updateData.subtitle}</p>
        
        <div class="glass-inner-panel mb-2" style="padding: 1.2rem; line-height: 1.6; text-align: center;">
          <span class="text-muted">${updateData.message}</span>
        </div>

        <div class="flex-between" style="gap: 1rem;">
          <button class="glass-btn primary w-100" type="button" onClick=${() => {
            if (updateData.onConfirm) updateData.onConfirm();
            setIsOpen(false);
          }}>Herunterladen</button>
          <button class="glass-btn w-100" type="button" onClick=${() => setIsOpen(false)}>Später</button>
        </div>
      </div>
    </div>
  `;
}
