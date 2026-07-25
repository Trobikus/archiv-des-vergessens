/**
 * ============================================================
 * FILE: controllers/game-boot.js – EINZIGER EINSTIEGSPUNKT (v2.0 FINAL)
 * ============================================================
 * 
 * Initialisiert:
 * - DI-Container mit ALLEN Services
 * - StateManager mit Middleware
 * - GameLoop
 * - Navigation
 * - Preact-UI (alle Komponenten)
 * - DOM-UI (Partikel, Floating-Texts)
 * ============================================================
 */

import EventBus from '../core/events/bus.js';
import { DIContainer } from '../core/di/container.js';
import { registerServices } from '../core/di/config.js';
import StateManager from '../core/state/manager.js';
import * as Middleware from '../core/state/middleware.js';
import GameLoop from '../core/game/loop.js';
import NavigationController from './navigation.js';
import { bootPreactUI } from '../ui/preact/index.js';
import { initDOMUI } from '../ui/dom/index.js';
import SaveManager from '../core/persistence/save-manager.js';
import CloudManager from '../core/persistence/cloud-manager.js';
import Logger, { logger } from '../core/logger.js';
import { APP_VERSION } from '../utils/version.js';
import SettingsManager from '../core/settings.js';
import { EVENTS } from '../core/events/definitions.js';
import { CONFIG } from '../data/config.js';
import { escapeHtml } from '../utils/sanitizer.js';

/**
 * Bootet das Spiel.
 */
export async function bootGame() {
  logger.info('[GameBoot] Initialisiere Spiel (AAA-Architektur v2.0)...');

  const updateBootProgress = async (percent, statusText) => {
    const bar = document.getElementById('intro-loading-bar') || document.querySelector('.intro-loading-bar');
    const text = document.getElementById('intro-loading-text');
    if (bar) {
      bar.classList.add('manual-progress');
      bar.style.width = `${percent}%`;
    }
    if (text) {
      text.style.opacity = '1';
      text.innerText = statusText;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  };

  // ============================================================
  // Step 1 (10%): "Lade Konfiguration & EventBus..."
  // ============================================================
  await updateBootProgress(10, 'Lade Konfiguration & EventBus...');

  logger.level = 'info';

  const eventBus = new EventBus();
  logger.setEventBus(eventBus);

  // Globaler Catch-All Handler für verwaiste Events
  eventBus.subscribeAll((eventName, data) => {
    if (eventBus.countListeners(eventName) === 0) {
      switch (eventName) {
        case EVENTS.HERO_LEVEL_UP:
        case EVENTS.HERO_LEVEL_UP:
          eventBus.publish(EVENTS.UI_SHOW_TOAST, {
            message: `🌟 Level Up! Du bist nun Level ${data?.level || '!'}!`,
            type: 'success',
            duration: 4000
          });
          break;
        case EVENTS.NETWORK_CONNECTED:
          eventBus.publish(EVENTS.UI_SHOW_TOAST, {
            message: '🌐 Netzwerk verbunden',
            type: 'info',
            duration: 3000
          });
          break;
        case EVENTS.NETWORK_DISCONNECTED:
          eventBus.publish(EVENTS.UI_SHOW_TOAST, {
            message: '⚠️ Netzwerkverbindung unterbrochen!',
            type: 'warning',
            duration: 4000
          });
          break;
      }
    }
  });

  // Registriere globale Helper-Funktionen für spieleigene, wunderschöne Popups
  window.gameConfirm = (message, title = 'BESTÄTIGUNG') => {
    return new Promise((resolve) => {
      eventBus.publish(EVENTS.UI_OPEN_CONFIRM, {
        title,
        message,
        isAlert: false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };

  window.gameAlert = (message, title = 'HINWEIS') => {
    return new Promise((resolve) => {
      eventBus.publish(EVENTS.UI_OPEN_CONFIRM, {
        title,
        message,
        isAlert: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };

  // Globale Fehlerbehandlung
  window.addEventListener('error', (e) => {
    logger.error(`[Global Error] ${e.message}`, e.error?.stack);
    eventBus.publish(EVENTS.UI_SHOW_TOAST, {
      message: `⚠️ ${e.message}`,
      type: 'error',
      duration: 6000
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    logger.error(`[Unhandled Promise] ${e.reason?.message || 'Unbekannter Fehler'}`, e.reason?.stack);
    eventBus.publish(EVENTS.UI_SHOW_TOAST, {
      message: `⚠️ ${e.reason?.message || 'Unbekannter Fehler'}`,
      type: 'error',
      duration: 6000
    });
  });

  // ============================================================
  // Step 2 (35%): "Registriere Services & StateManager..."
  // ============================================================
  await updateBootProgress(35, 'Registriere Services & StateManager...');

  const container = new DIContainer();
  container.register('eventBus', () => eventBus);
  container.register('logger', () => logger);

  // ============================================================
  // 3. STATE MANAGER
  // ============================================================

  const stateManager = new StateManager(eventBus);

  // Middleware registrieren
  stateManager
    .use(Middleware.loggingMiddleware(logger, 'info'))
    .use(Middleware.performanceMiddleware(50))
    .use(Middleware.persistenceMiddleware(
      async (state) => {
        try {
          await SaveManager.save(state);
        } catch (e) {
          logger.error('[State] Autosave fehlgeschlagen:', e);
        }
      },
      1500,
      ['setSavingStatus', 'state:timeTravel']
    ))
    .use(Middleware.createDefaultValidationMiddleware(false));

  container.register('stateManager', () => stateManager);

  // ============================================================
  // 4. ALLE SERVICES REGISTRIEREN (via DI-Config)
  // ============================================================

  registerServices(container);

  // Services aus Container holen (für Boot-Prozess)
  const heroService = container.get('heroService');
  const resourceService = container.get('resourceService');
  const clanService = container.get('clanService');
  const storyService = container.get('storyService');
  const forgeService = container.get('forgeService');
  const craftingService = container.get('craftingService');
  const questService = container.get('questService');
  const achievementService = container.get('achievementService');
  const friendService = container.get('friendService');
  const chatService = container.get('chatService');
  const codexService = container.get('codexService');
  const relicHuntService = container.get('relicHuntService');
  const dailyRewardService = container.get('dailyRewardService');
  const leaderboardService = container.get('leaderboardService');
  const storyBranchService = container.get('storyBranchService');
  const challengeService = container.get('challengeService');
  const libraryService = container.get('libraryService');
  const settingsManager = container.get('settingsManager');
  const cloudManager = container.get('cloudManager');
  const saveManager = container.get('saveManager');
  const tutorialService = container.get('tutorialService');
  const networkService = container.get('networkService');
  const i18nService = container.get('i18nService');
  const accountVaultService = container.get('accountVaultService');
  const authService = container.get('authService');

  // Alte Gast-Speicherstände bereinigen
  await SaveManager.clearGuestSaves();

  // Bei Login oder Umwandlung direkt speichern
  eventBus.subscribe(EVENTS.AUTH_STATE_CHANGED, (data) => {
    if (data && data.user && !data.user.isGuest && data.isLoggedIn) {
      SaveManager.save(stateManager.getState());
    }
  });

  // Account-Lager initialisieren
  await accountVaultService.init();

  // ============================================================
  // Step 3 (60%): "Lade und hydriere Spielstand..."
  // ============================================================
  await updateBootProgress(60, 'Lade und hydriere Spielstand...');

  // State mit Default-Werten und geladenen Einstellungen initialisieren
  const initialSettings = settingsManager.load();
  stateManager.init(null, null, null, initialSettings);

  // Save laden, falls vorhanden
  const savedState = await SaveManager.load();
  if (savedState) {
    try {
       // Migration: Falls es ein alter Spielstand ist, Tutorial als beendet markieren
      if (savedState.system && savedState.system.tutorialFinished === undefined) {
        savedState.system.tutorialFinished = true;
        savedState.system.tutorialStep = -1;
      }
      // Erzwingen, dass das Intro beim Spielstart geladen wird, statt direkt ins Menü/Hub zu springen
      if (savedState.system) {
        savedState.system.currentView = 'intro';
        savedState.system.originalLastSave = savedState.system.lastSave;
      }
      stateManager.dispatch(() => savedState, 'boot/hydrate');
      // Expeditionen bereinigen
      clanService.cleanupExpeditions();
      logger.info('[GameBoot] State hydriert (Save geladen)');
    } catch (e) {
      logger.error('[GameBoot] Hydration fehlgeschlagen:', e);
    }
  } else {
    logger.info('[GameBoot] Neuer State initialisiert');
  }

  // Cloud-Sync initialisieren
  if (settingsManager.get('cloudEnabled')) {
    cloudManager.setEnabled(true);
    // Sync nach 5 Sekunden (nicht blockierend)
    setTimeout(() => {
      cloudManager.sync(stateManager.getState());
    }, 5000);
  }

  // ============================================================
  // 6. GAME LOOP
  // ============================================================

  const gameLoop = new GameLoop({
    eventBus,
    stateManager,
    services: {
      resourceService,
      clanService,
      storyService
    }
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
    saveManager: SaveManager,
    settingsManager,
    cloudManager,
    i18nService
  });
  container.register('navigation', () => navigation);

  // ============================================================
  // Step 4 (80%): "Initialisiere UI & Preact-Komponenten..."
  // ============================================================
  await updateBootProgress(80, 'Initialisiere UI & Preact-Komponenten...');

  // Preact-UI & globale Services
  const services = {
    heroService,
    resourceService,
    clanService,
    storyService,
    forgeService,
    craftingService,
    questService,
    achievementService,
    friendService,
    chatService,
    codexService,
    relicHuntService,
    dailyRewardService,
    leaderboardService,
    storyBranchService,
    challengeService,
    libraryService,
    tutorialService,
    i18nService,
    accountVaultService,
    authService,
    networkService,
    cloudManager,
    saveManager: SaveManager
  };

  if (typeof window !== 'undefined') {
    window.services = services;
  }

  // Preact-UI (alle Komponenten)
  const preactContainer = document.getElementById('preact-root');
  if (preactContainer) {
    const preactUI = bootPreactUI({
      container: preactContainer,
      stateManager,
      eventBus,
      services
    });
    container.register('preactUI', () => preactUI);
  }

  // DOM-UI (Partikel, Floating-Texts)
  const domUI = initDOMUI({
    eventBus,
    stateManager,
    settingsManager
  });
  container.register('domUI', () => domUI);

  // ============================================================
  // 9. SAVEGAME SETUP
  // ============================================================

  // ============================================================
  // 10. AUTOSAVE
  // ============================================================

  const autosaveInterval = settingsManager.get('autosave') || 15000;
  let autosaveTimer = null;

  if (autosaveInterval > 0) {
    autosaveTimer = setInterval(() => {
      SaveManager.save(stateManager.getState()).catch(e => {
        logger.error('[Autosave] Fehlgeschlagen:', e);
      });
    }, autosaveInterval);
  }

  // Autosave-Intervall bei Einstellungs-Änderung anpassen
  eventBus.subscribe(EVENTS.SETTINGS_UPDATED, (newSettings) => {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
    const newInterval = newSettings.autosave;
    if (newInterval > 0) {
      autosaveTimer = setInterval(() => {
        SaveManager.save(stateManager.getState()).catch(e => {
          logger.error('[Autosave] Fehlgeschlagen:', e);
        });
      }, newInterval);
    }
  });

  // ============================================================
  // 11. CLEANUP & SICHERES BEENDEN (Schnittstelle zu Electron & Browser)
  // ============================================================

  // Safe-Quit Handler für Tauri / Electron Integration
  if (window.electronAPI && typeof window.electronAPI.onQuitRequested === 'function') {
    window.electronAPI.onQuitRequested(async () => {
      logger.info('[GameBoot] Safe-Quit Beendigung angefordert via Tauri...');
      try {
        await SaveManager.save(stateManager.getState());
        if (settingsManager.get('cloudEnabled')) {
          await cloudManager.sync(stateManager.getState());
        }
      } catch (error) {
        logger.warn('[GameBoot] Safe-Quit-Speichern fehlgeschlagen:', error);
      } finally {
        if (typeof window.electronAPI.sendQuitReady === 'function') {
          window.electronAPI.sendQuitReady();
        }
      }
    });
  }

  // Safe-Quit (Browser / Fallback)
  let cleanupDone = false;
  window.addEventListener('beforeunload', (e) => {
    // In Tauri desktop environment, gracefully ignore browser beforeunload traps
    if (window['__TAURI__']) {
      try {
        SaveManager.save(stateManager.getState());
      } catch (_) {}
      return;
    }

    if (cleanupDone) return;
    cleanupDone = true;

    try {
      // Trigger asynchrones Speichern im Hintergrund
      SaveManager.save(stateManager.getState());
      if (settingsManager.get('cloudEnabled')) {
        cloudManager.sync(stateManager.getState());
      }
    } catch (error) {
      logger.warn('[GameBoot] Browser-Cleanup-Save fehlgeschlagen:', error);
    }

    // Timer und Loop sauber stoppen
    gameLoop.stop();
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
    eventBus.clear();

    logger.info('[GameBoot] Browser-Cleanup gestartet.');

    e.preventDefault();
    e.returnValue = 'Möchtest du das Archiv wirklich verlassen? Dein Fortschritt wird gespeichert.';
    return e.returnValue;
  });

  // ============================================================
  // 12. START (Studio-Intro abspielen, danach Hauptmenü laden)
  // ============================================================

  // Step 5 (100%): "Starte Game Loop & Partikel-System..."
  await updateBootProgress(100, 'Starte Game Loop & Partikel-System...');

  // Start the game loop immediately. The IntroView (Preact) will handle the 
  // visual intro and publish EVENTS.AUTH_SHOW_LOGIN when it's done.
  gameLoop.start();

  eventBus.publish(EVENTS.GAME_BOOTED, {
    timestamp: Date.now(),
    version: APP_VERSION,
    services: Array.from(container.getKeys())
  });

  logger.info('[GameBoot] Spiel bereit! 🏛️✨');
  logger.info('[GameBoot] Bootstrapping abgeschlossen.');


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
      achievementService,
      friendService,
      chatService,
      codexService,
      relicHuntService,
      dailyRewardService,
      leaderboardService,
      storyBranchService,
      challengeService,
      libraryService
    }
  };
}

// ============================================================
// AUTO-BOOT
// ============================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    bootGame().catch((error) => {
      logger.error('[GameBoot] Boot fehlgeschlagen:', error);
      
      const safeMessage = escapeHtml(error?.message || 'Unbekannter Fehler');
      const safeStack = escapeHtml(error?.stack || error?.message || '');

      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#050507;color:#d1d1d6;font-family:monospace;padding:2rem;text-align:center;">
          <h1 style="color:#8b1c1c;">⚠️ Boot fehlgeschlagen</h1>
          <p style="color:#6e6e7a;">${safeMessage}</p>
          <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 2rem;background:#1a1a20;border:1px solid #c5a059;color:#c5a059;border-radius:2px;cursor:pointer;">
            🔄 Neu laden
          </button>
          <details style="margin-top:1rem;text-align:left;color:#6e6e7a;font-size:0.8rem;max-width:600px;">
            <summary>Fehlerdetails</summary>
            <pre style="background:#0a0a0c;padding:1rem;border-radius:2px;overflow:auto;max-height:200px;">${safeStack}</pre>
          </details>
        </div>
      `;
    });
  });
}

// ============================================================
// EXPORT
// ============================================================

export default bootGame;