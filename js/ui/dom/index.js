/**
 * ============================================================
 * FILE: ui/dom/index.js – DOM-UI (Partikel, Floating-Texts)
 * ============================================================
 */

import { initParticles } from './particles.js';
import { initFloatingText } from './floating-text.js';
import { EVENTS } from '../../core/events/definitions.js';

export function initDOMUI({ eventBus, stateManager, settingsManager }) {
  // Partikel initialisieren
  const particles = initParticles();

  // Floating-Texts
  const floatingText = initFloatingText(eventBus, settingsManager);

  // Event-Bindings für Floating-Texts
  eventBus.subscribe(EVENTS.CMD_SPAWN_FLOAT_TEXT, (data) => {
    if (settingsManager.get('floatingText') !== false) {
      floatingText.spawn(data.text, data.x, data.y);
    }
  });

  // Partikel-Einstellungen
  eventBus.subscribe('settings:updated', (data) => {
    if (data.particles !== undefined) {
      particles.setEnabled(data.particles);
    }
  });

  return {
    destroy: () => {
      particles.destroy();
      floatingText.destroy();
    }
  };
}