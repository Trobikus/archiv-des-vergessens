/**
 * ============================================================
 * FILE: controllers/game-boot.js – EINZIGER EINSTIEGSPUNKT
 * ============================================================
 * 
 * Ersetzt main.js (420 Zeilen → 180 Zeilen)
 * - DI-Container-Initialisierung
 * - StateManager + Services
 * - GameLoop + Navigation
 * - UI-Initialisierung (Preact + DOM)
 * ============================================================
 */

import EventBus from '../core/events/bus.js';
import { DIContainer } from '../core/di/container.js';
import { registerServices } from '../core/di/config.js';
import StateManager from '../core/state/manager.js';
import * as Middleware from '../core/state/middleware.js';
import GameLoop from '../core/game/loop.js';
import NavigationController from './navigation.js';
import { initPreactUI } from '../ui/preact/index.js';
import { initDOMUI } from '../ui/dom/index.js';
import SaveManager from '../core/persistence/save-manager.js';
import Logger from '../core/logger.js';
import { CONFIG } from '../data/config.js';

/**
 * Bootet das Spiel.
 */
export async function bootGame() {
  console.log('[GameBoot] Initialisiere Spiel...');
  
  // ============================================================
  // 1. CORE: Logger + EventBus
  // ============================================================
  
  const logger = new Logger();
  const eventBus = new EventBus();
  logger.setEventBus(eventBus);
  
  // ============================================================
  // 2. DI-CONTAINER
  // ============================================================
  
  const container = new DIContainer();
  container.register('eventBus', () => eventBus);
  container.register('logger', () => logger);
  
  // ============================================================
  // 3. STATE MANAGER
  // ============================================================
  
  const stateManager = new StateManager(eventBus);
  
  // Middleware
  stateManager
    .use(Middleware.loggingMiddleware(logger))
    .use(Middleware.performanceMiddleware(50))
    .use(Middleware.persistenceMiddleware(
      () => SaveManager.save(stateManager.getState()),
      1500
    ));
  
  container.register('stateManager', () => stateManager);
  
  // ============================================================
  // 4. SERVICES (registriert via DI)
  // ============================================================
  
  registerServices(container);
  
  // Services aus Container holen
  const heroService = container.get('heroService');
  const resourceService = container.get('resourceService');
  const clanService = container.get('clanService');
  const storyService = container.get('storyService');
  const forgeService = container.get('forgeService');
  const craftingService = container.get('craftingService');
  const questService = container.get('questService');
  const achievementService = container.get('achievementService');
  
  // ============================================================
  // 5. STATE INITIALISIEREN
  // ============================================================
  
  // Initialen State aus Save laden oder Default erstellen
  const savedState = await SaveManager.load();
  if (savedState) {
    // State-Hydration
    stateManager.dispatch(() => savedState, 'boot/hydrate');
    // Expeditionen bereinigen
    clanService.cleanupExpeditions();
    logger.info('State hydriert (Save geladen)');
  } else {
    logger.info('Neuer State initialisiert');
  }
  
  // ============================================================
  // 6. GAME LOOP
  // ============================================================
  
  const gameLoop = new GameLoop({
    eventBus,
    stateManager,
    services: { resourceService, clanService, storyService }
  });
  container.register('gameLoop', () => gameLoop);
  
  // ============================================================
  // 7. NAVIGATION
  // ============================================================
  
  const navigation = new NavigationController({
    eventBus,
    stateManager,
    gameLoop,
    heroService,
    resourceService,
    clanService,
    saveManager: SaveManager
  });
  container.register('navigation', () => navigation);
  
  // ============================================================
  // 8. UI INITIALISIEREN
  // ============================================================
  
  // Preact-UI (moderne Komponenten)
  const preactUI = initPreactUI({
    container: document.getElementById('preact-root'),
    stateManager,
    eventBus,
    services: {
      heroService,
      resourceService,
      clanService,
      questService,
      achievementService
    }
  });
  
  // DOM-UI (Partikel, Floating-Texts)
  const domUI = initDOMUI({
    eventBus,
    stateManager,
    settingsManager: container.get('settingsManager')
  });
  
  // ============================================================
  // 9. SAVEGAME SETUP
  // ============================================================
  
  SaveManager.setServices({
    stateManager,
    heroService,
    resourceService,
    clanService,
    storyService,
    forgeService,
    craftingService,
    questService,
    achievementService
  });
  
  // ============================================================
  // 10. AUTOSAVE
  // ============================================================
  
  const autosaveInterval = CONFIG.SYSTEM.AUTOSAVE_INTERVAL_MS || 15000;
  const autosaveTimer = setInterval(() => {
    SaveManager.save(stateManager.getState());
  }, autosaveInterval);
  
  // ============================================================
  // 11. CLEANUP (bei Page-Unload)
  // ============================================================
  
  window.addEventListener('beforeunload', async () => {
    clearInterval(autosaveTimer);
    await SaveManager.save(stateManager.getState());
    gameLoop.stop();
    preactUI.destroy();
    domUI.destroy();
    clanService.destroy();
    eventBus.clear();
    logger.info('[GameBoot] Cleanup abgeschlossen');
  });
  
  // ============================================================
  // 12. START
  // ============================================================
  
  // Menü anzeigen
  navigation.showMenu();
  gameLoop.start();
  
  // Wenn Save existiert, Continue-Button aktivieren
  const hasSave = await SaveManager.hasSave();
  navigation.updateMenuButtons(hasSave);
  
  logger.info('[GameBoot] Spiel bereit!');
  eventBus.publish('game:booted', { timestamp: Date.now() });
  
  // Return für Debugging
  return {
    container,
    stateManager,
    eventBus,
    gameLoop,
    navigation,
    services: {
      heroService,
      resourceService,
      clanService,
      storyService,
      forgeService,
      craftingService,
      questService,
      achievementService
    }
  };
}

// ============================================================
// AUTO-BOOT
// ============================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    bootGame().catch((error) => {
      console.error('[GameBoot] Boot fehlgeschlagen:', error);
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#050507;color:#d1d1d6;font-family:monospace;padding:2rem;text-align:center;">
          <h1 style="color:#8b1c1c;">⚠️ Boot fehlgeschlagen</h1>
          <p style="color:#6e6e7a;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 2rem;background:#1a1a20;border:1px solid #c5a059;color:#c5a059;border-radius:2px;cursor:pointer;">
            🔄 Neu laden
          </button>
        </div>
      `;
    });
  });
}

// ============================================================
// EXPORT
// ============================================================

export default bootGame;