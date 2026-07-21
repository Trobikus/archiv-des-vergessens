/**
 * ============================================================
 * FILE: ui/preact/index.js – Preact-UI-Initialisierung (KOMPLETT)
 * ============================================================
 */

import { h, render } from "preact";
import { MainApp } from './views/MainApp.js';

export function bootPreactUI({ container, stateManager, eventBus, services }) {
  // Render the unified MainApp
  render(h(MainApp, { stateManager, eventBus, services }), container);

  return {
    destroy: () => {
      render(null, container);
    }
  };
}

export default bootPreactUI;