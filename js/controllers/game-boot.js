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
import { Logger } from '../core/logger.js';
import { APP_VERSION } from '../utils/version.js';
import SettingsManager from '../core/settings.js';
import { EVENTS } from '../core/events/definitions.js';
import { CONFIG } from '../data/config.js';

/**
 * Bootet das Spiel.
 */
export async function bootGame() {
  console.log('[GameBoot] Initialisiere Spiel (AAA-Architektur v2.0)...');

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

  const logger = new Logger();
  logger.level = 'info';

  const eventBus = new EventBus();
  logger.setEventBus(eventBus);

  // Registriere globale Helper-Funktionen für spieleigene, wunderschöne Popups
  window.gameConfirm = (message, title = 'BESTÄTIGUNG') => {
    return new Promise((resolve) => {
      eventBus.publish('ui:openConfirm', {
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
      eventBus.publish('ui:openConfirm', {
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
    eventBus.publish('ui:showToast', {
      message: `⚠️ ${e.message}`,
      type: 'error',
      duration: 6000
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    logger.error(`[Unhandled Promise] ${e.reason?.message || 'Unbekannter Fehler'}`, e.reason?.stack);
    eventBus.publish('ui:showToast', {
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
  const guildService = container.get('guildService');
  const friendService = container.get('friendService');
  const chatService = container.get('chatService');
  const codexService = container.get('codexService');
  const relicHuntService = container.get('relicHuntService');
  const dailyRewardService = container.get('dailyRewardService');
  const leaderboardService = container.get('leaderboardService');
  const storyBranchService = container.get('storyBranchService');
  const skillTreeService = container.get('skillTreeService');
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
  eventBus.subscribe('auth:stateChanged', (data) => {
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
    guildService,
    friendService,
    chatService,
    codexService,
    relicHuntService,
    dailyRewardService,
    leaderboardService,
    storyBranchService,
    skillTreeService,
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
  eventBus.subscribe('settings:updated', (newSettings) => {
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

  let cleanupDone = false;

  // Safe-Quit (Browser / Desktop)
  window.addEventListener('beforeunload', (e) => {

    if (cleanupDone) return;
    cleanupDone = true;

    try {
      // Trigger asynchrones Speichern im Hintergrund
      SaveManager.save(stateManager.getState());
      if (settingsManager.get('cloudEnabled')) {
        cloudManager.sync(stateManager.getState());
      }
    } catch (error) {
      console.warn('[GameBoot] Browser-Cleanup-Save fehlgeschlagen:', error);
    }

    // Timer und Loop sauber stoppen
    gameLoop.stop();
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
    eventBus.clear();

    logger.info('[GameBoot] Browser-Cleanup gestartet.');

    // Verhindere das sofortige Schließen des Fensters im Browser.
    // Während der Benutzer die Bestätigung liest, läuft das Speichern im Hintergrund fertig!
    e.preventDefault();
    e.returnValue = 'Möchtest du das Archiv wirklich verlassen? Dein Fortschritt wird gespeichert.';
    return e.returnValue;
  });

  // ============================================================
  // 12. START (Studio-Intro abspielen, danach Hauptmenü laden)
  // ============================================================

  // Step 5 (100%): "Starte Game Loop & Partikel-System..."
  await updateBootProgress(100, 'Starte Game Loop & Partikel-System...');

  if (typeof window !== 'undefined' && window['__TAURI__']) {
    const bar = document.getElementById('intro-loading-bar') || document.querySelector('.intro-loading-bar');
    if (bar) bar.style.width = '0%';
  }

  const introContainer = document.getElementById('intro-container');
  if (introContainer) {
    let introFinished = false;
    let handleIntroClick = null;

    // ----------------------------------------------------------
    // MYSTISCHES CANVAS-PARTIKELSYSTEM
    // Elegantes, gut lesbares Canvas-2D-Partikelsystem (Standard-JS-Objekte)
    // ----------------------------------------------------------
    const _startIntroParticles = () => {
      /** @type {HTMLCanvasElement} */
      const canvas = (/** @type {any} */ (document.getElementById('intro-particle-canvas')));
      if (!canvas) return null;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return null;

      let animFrameId = null;
      let stopped = false;
      let lastTS = -1;

      const resize = () => {
        canvas.width = introContainer.clientWidth || window.innerWidth;
        canvas.height = introContainer.clientHeight || window.innerHeight;
        ctx.globalCompositeOperation = 'screen';
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      const RUNE_GLYPHS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ'];
      const MAX_PARTICLES = 90;

      /**
       * Erstellt ein neues Partikel-Objekt basierend auf seinem Typ.
       */
      const createParticle = (type, isInit = false) => {
        const W = canvas.width;
        const H = canvas.height;
        const cx = W * 0.5;
        const cy = H * 0.5;

        const p = {
          type, // 'ember' | 'dust' | 'rune' | 'spark' | 'orb'
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          scale: 1,
          alpha: 0,
          maxAlpha: 0.5,
          life: 0,
          maxLife: 100,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.01,
          colorType: Math.random() > 0.5 ? 'gold' : 'purple',
          rune: RUNE_GLYPHS[Math.floor(Math.random() * RUNE_GLYPHS.length)],
          prevX: 0,
          prevY: 0
        };

        if (type === 'ember') {
          const a = Math.random() * Math.PI * 2;
          const d = 50 + Math.random() * 110;
          p.x = cx + Math.cos(a) * d;
          p.y = isInit ? cy + Math.random() * H * 0.5 : cy + 20 + Math.random() * 70;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = -(0.35 + Math.random() * 0.7);
          p.scale = 0.5 + Math.random() * 0.9;
          p.maxAlpha = 0.4 + Math.random() * 0.5;
          p.maxLife = 110 + Math.random() * 160;
          p.wobbleSpeed = 0.022 + Math.random() * 0.025;
          p.colorType = Math.random() > 0.4 ? 'gold' : 'bright';
        } else if (type === 'dust') {
          p.x = Math.random() * W;
          p.y = isInit ? Math.random() * H : H + 5;
          p.vx = (Math.random() - 0.5) * 0.2;
          p.vy = -(0.07 + Math.random() * 0.17);
          p.scale = 0.4 + Math.random() * 0.75;
          p.maxAlpha = 0.08 + Math.random() * 0.18;
          p.maxLife = 280 + Math.random() * 320;
          p.wobbleSpeed = 0.007 + Math.random() * 0.012;
          p.colorType = Math.random() > 0.55 ? 'purple' : 'gold';
        } else if (type === 'rune') {
          const a = Math.random() * Math.PI * 2;
          const d = 75 + Math.random() * (Math.min(W, H) * 0.28);
          p.x = cx + Math.cos(a) * d;
          p.y = cy + Math.sin(a) * d;
          p.vx = Math.cos(a) * 0.1;
          p.vy = Math.sin(a) * 0.1;
          p.scale = Math.random() > 0.5 ? 1 : 0.7;
          p.maxAlpha = 0.12 + Math.random() * 0.22;
          p.maxLife = 170 + Math.random() * 200;
          p.wobbleSpeed = 0.012;
        } else if (type === 'spark') {
          const a = Math.random() * Math.PI * 2;
          p.x = cx + (Math.random() - 0.5) * 55;
          p.y = cy + (Math.random() - 0.5) * 55;
          p.prevX = p.x;
          p.prevY = p.y;
          p.vx = Math.cos(a) * (1.4 + Math.random() * 1.9);
          p.vy = Math.sin(a) * (1.4 + Math.random() * 1.9);
          p.scale = 0.7 + Math.random() * 0.7;
          p.maxAlpha = 0.7 + Math.random() * 0.3;
          p.maxLife = 22 + Math.random() * 38;
          p.wobbleSpeed = 0;
        } else if (type === 'orb') {
          p.x = cx + (Math.random() - 0.5) * W * 0.5;
          p.y = cy + (Math.random() - 0.5) * H * 0.5;
          p.vx = (Math.random() - 0.5) * 0.15;
          p.vy = (Math.random() - 0.5) * 0.15;
          p.scale = 0.6 + Math.random() * 0.9;
          p.maxAlpha = 0.12 + Math.random() * 0.18;
          p.maxLife = 340 + Math.random() * 400;
          p.wobbleSpeed = 0.004 + Math.random() * 0.005;
          p.colorType = Math.random() > 0.5 ? 'gold' : 'purple';
        }

        if (isInit) {
          p.life = Math.random() * p.maxLife;
        }

        return p;
      };

      // Partikel-Array initialisieren
      const particles = [];
      const initTypes = [
        ...Array(5).fill('orb'),
        ...Array(22).fill('dust'),
        ...Array(32).fill('ember'),
        ...Array(8).fill('rune')
      ];

      for (const t of initTypes) {
        particles.push(createParticle(t, true));
      }

      ctx.globalCompositeOperation = 'screen';
      let sparkCooldown = 65;

      const tick = (now) => {
        if (stopped) return;
        animFrameId = requestAnimationFrame(tick);
        if (lastTS < 0) {
          lastTS = now;
          return;
        }
        const dt = Math.min((now - lastTS) / 16.667, 2.5);
        lastTS = now;

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Gelegentlich neue Funken erzeugen
        sparkCooldown -= dt;
        if (sparkCooldown <= 0 && particles.length < MAX_PARTICLES - 6) {
          const count = 2 + Math.floor(Math.random() * 4);
          for (let b = 0; b < count && particles.length < MAX_PARTICLES; b++) {
            particles.push(createParticle('spark', false));
          }
          sparkCooldown = 65 + Math.random() * 75;
        }

        // Partikel aktualisieren & zeichnen
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          p.wobble += p.wobbleSpeed * dt;

          const lt = p.life / p.maxLife;
          p.alpha = lt < 0.2 ? (lt / 0.2) * p.maxAlpha : lt > 0.7 ? ((1 - lt) / 0.3) * p.maxAlpha : p.maxAlpha;

          if (p.type === 'orb') {
            p.x += (p.vx + Math.cos(p.wobble) * 0.28) * dt;
            p.y += (p.vy + Math.sin(p.wobble * 0.7) * 0.22) * dt;
            if (p.alpha > 0.004) {
              const radius = 25 * p.scale;
              const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
              const color = p.colorType === 'purple' ? '130,80,200' : '197,160,89';
              grad.addColorStop(0, `rgba(${color}, ${p.alpha * 0.6})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.type === 'dust') {
            p.x += (p.vx + Math.sin(p.wobble) * 0.22) * dt;
            p.y += p.vy * dt;
            if (p.alpha > 0.004) {
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.colorType === 'purple' ? 'rgba(130,80,200,0.9)' : 'rgba(197,160,89,0.9)';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1.2 * p.scale, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.type === 'ember') {
            p.x += (p.vx + Math.sin(p.wobble) * 0.28) * dt;
            p.y += p.vy * dt;
            if (p.alpha > 0.004) {
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.colorType === 'bright' ? '#fff8c0' : '#ebd576';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1.8 * p.scale, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.type === 'rune') {
            p.x += p.vx * dt;
            p.y += (p.vy + Math.sin(p.wobble) * 0.18) * dt;
            if (p.alpha > 0.004) {
              ctx.globalAlpha = p.alpha;
              ctx.font = `${p.scale > 0.8 ? 14 : 9}px serif`;
              ctx.fillStyle = '#c5a059';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(p.rune, p.x, p.y);
            }
          } else if (p.type === 'spark') {
            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.alpha > 0.02) {
              ctx.globalAlpha = p.alpha;
              ctx.strokeStyle = '#ebd576';
              ctx.lineWidth = p.scale;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(p.prevX, p.prevY);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
          }

          // Lebensdauer abgelaufen?
          if (p.life >= p.maxLife) {
            if (p.type === 'spark') {
              particles.splice(i, 1);
            } else {
              particles[i] = createParticle(p.type, false);
            }
          }
        }

        ctx.globalAlpha = 1;
      };

      requestAnimationFrame(() => {
        lastTS = performance.now();
        requestAnimationFrame(tick);
      });

      return () => {
        stopped = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    };



    let stopParticles = null;
    let introTimeoutId = null;
    let introStarted = false;

    const finishIntro = () => {
      if (introFinished) return;
      introFinished = true;

      // Klick-Event-Listener sauber entfernen
      if (handleIntroClick) {
        introContainer.removeEventListener('click', handleIntroClick);
        introContainer.style.cursor = 'default';
      }

      // Partikel stoppen
      if (stopParticles) stopParticles();

      // Intro ausblenden (800ms CSS-Transition)
      introContainer.style.opacity = '0';

      setTimeout(() => {
        introContainer.style.display = 'none';

        // Login-Portal anzeigen (zwischen Intro und Hauptmenü)
        navigation.showLogin();

        // GameLoop starten
        gameLoop.start();

        // Event veröffentlichen
        eventBus.publish(EVENTS.GAME_BOOTED, {
          timestamp: Date.now(),
          version: APP_VERSION,
          services: Array.from(container.getKeys())
        });

        logger.info('[GameBoot] Spiel bereit! 🏛️✨');
        console.log('[GameBoot] Bootstrapping abgeschlossen.');
      }, 800);
    };

    const startIntroSequence = () => {
      if (introFinished || introStarted) return;
      introStarted = true;


      // Sicherstellen, dass der Intro-Container sichtbar ist
      introContainer.style.display = 'flex';
      introContainer.style.opacity = '1';


      logger.info('[GameBoot] Starte Intro-Sequenz nach Vollbild-Fensteröffnung...');
      stopParticles = _startIntroParticles();

      // Ladebalken zurücksetzen und dynamisch füllen
      const loadingBar = document.getElementById('intro-loading-bar') || document.querySelector('.intro-loading-bar');
      const loadingText = document.getElementById('intro-loading-text');

      if (loadingBar) {
        loadingBar.classList.add('manual-progress');
        loadingBar.style.width = '0%';
      }

      // Animierte Ladebalken-Fortschritts-Sequenz während des Intros
      const steps = [
        { pct: 15, text: 'Initialisiere Archiv-Kern...', delay: 200 },
        { pct: 35, text: 'Sammle Mneme-Partikel...', delay: 600 },
        { pct: 60, text: 'Lade Chroniken & Relikte...', delay: 1200 },
        { pct: 85, text: 'Entsiegele Weltenzustand...', delay: 1800 },
        { pct: 100, text: 'Das Archiv ist bereit.', delay: 2400 }
      ];

      steps.forEach(({ pct, text, delay }) => {
        setTimeout(() => {
          if (introFinished) return;
          if (loadingBar) loadingBar.style.width = `${pct}%`;
          if (loadingText) {
            loadingText.style.opacity = '1';
            loadingText.innerText = text;
          }
        }, delay);
      });

      // Timer für das automatische Beenden des Intros (7 Sekunden)
      introTimeoutId = setTimeout(finishIntro, 7000);
    };

    // Wenn ein Spielstand existiert, kann das Intro per Klick übersprungen werden
    if (savedState) {
      // Optischen Hinweis geben (Zeiger wird zur Hand)
      introContainer.style.cursor = 'pointer';

      handleIntroClick = (e) => {
        // Nicht überspringen, wenn das Update-Overlay gerade aktiv ist
        const updateOverlay = document.getElementById('update-overlay');
        if (updateOverlay && updateOverlay.style.display === 'flex') {
          return;
        }

        logger.info('[GameBoot] Intro vom Benutzer per Klick übersprungen.');
        
        if (introTimeoutId) {
          clearTimeout(introTimeoutId);
          introTimeoutId = null;
        }
        
        finishIntro();
      };

      introContainer.addEventListener('click', handleIntroClick);
    }

    let gameLaunched = false;


    // Fallback: Für Browser-Betrieb ohne Launcher
    if (!window['__TAURI__']) {
      gameLaunched = true;
      if (!document.hidden) {
        setTimeout(startIntroSequence, 100);
      } else {
        const handleBrowserVisibility = () => {
          if (!document.hidden && !introStarted) {
            document.removeEventListener('visibilitychange', handleBrowserVisibility);
            setTimeout(startIntroSequence, 100);
          }
        };
        document.addEventListener('visibilitychange', handleBrowserVisibility);
      }
    } else {
      // Sicherheits-Fallback für Tauri falls launcher:game-launched nicht empfangen wurde
      setTimeout(() => {
        if (!gameLaunched && !introStarted && !introFinished) {
          logger.info('[GameBoot] Sicherheits-Fallback: Starte Intro in Tauri-Umgebung...');
          gameLaunched = true;
          startIntroSequence();
        }
      }, 5000);
    }


  } else {
    // Fallback falls kein Intro-Container existiert
    navigation.showMenu();
    gameLoop.start();

    eventBus.publish(EVENTS.GAME_BOOTED, {
      timestamp: Date.now(),
      version: APP_VERSION,
      services: Array.from(container.getKeys())
    });

    logger.info('[GameBoot] Spiel bereit! 🏛️✨');
    console.log('[GameBoot] Bootstrapping abgeschlossen.');
  }


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
      guildService,
      friendService,
      chatService,
      codexService,
      relicHuntService,
      dailyRewardService,
      leaderboardService,
      storyBranchService,
      skillTreeService,
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
      console.error('[GameBoot] Boot fehlgeschlagen:', error);
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#050507;color:#d1d1d6;font-family:monospace;padding:2rem;text-align:center;">
          <h1 style="color:#8b1c1c;">⚠️ Boot fehlgeschlagen</h1>
          <p style="color:#6e6e7a;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 2rem;background:#1a1a20;border:1px solid #c5a059;color:#c5a059;border-radius:2px;cursor:pointer;">
            🔄 Neu laden
          </button>
          <details style="margin-top:1rem;text-align:left;color:#6e6e7a;font-size:0.8rem;max-width:600px;">
            <summary>Fehlerdetails</summary>
            <pre style="background:#0a0a0c;padding:1rem;border-radius:2px;overflow:auto;max-height:200px;">${error.stack || error.message}</pre>
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