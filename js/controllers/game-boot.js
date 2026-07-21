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
import SettingsManager from '../core/settings.js';
import { EVENTS } from '../core/events/definitions.js';
import { CONFIG } from '../data/config.js';

/**
 * Bootet das Spiel.
 */
export async function bootGame() {
  console.log('[GameBoot] Initialisiere Spiel (AAA-Architektur v2.0)...');

  // ============================================================
  // 1. CORE: Logger + EventBus
  // ============================================================

  const logger = new Logger();
  logger.level = 'info';

  const eventBus = new EventBus();
  logger.setEventBus(eventBus);

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
  // 2. DI-CONTAINER
  // ============================================================

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
  const tutorialService = container.get('tutorialService');
  const networkService = container.get('networkService');

  // Querverweise für Netzwerk-Verarbeitung initialisieren
  networkService.setServices(chatService, leaderboardService, cloudManager);

  // ============================================================
  // 5. STATE INITIALISIEREN
  // ============================================================

  // State mit Default-Werten initialisieren
  stateManager.init(null, null, null);

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
    cloudManager
  });
  container.register('navigation', () => navigation);

  // ============================================================
  // 8. UI INITIALISIEREN
  // ============================================================

  // Preact-UI (alle Komponenten)
  const preactContainer = document.getElementById('preact-root');
  if (preactContainer) {
    const preactUI = bootPreactUI({
      container: preactContainer,
      stateManager,
      eventBus,
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
        libraryService,
        tutorialService,
        saveManager: SaveManager
      }
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

  SaveManager.setServices({
    stateManager,
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
    cloudManager
  });

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

  // --- A. Electron Safe-Quit (Desktop) ---
  if (window.electronAPI && typeof window.electronAPI.onQuitRequested === 'function') {
    window.electronAPI.onQuitRequested(async () => {
      if (cleanupDone) return;
      cleanupDone = true;

      console.log('[GameBoot] Beenden angefordert. Speichere Spielstand lokal und online...');
      try {
        // Spielstand sichern
        await SaveManager.save(stateManager.getState());
        // Cloud-Sync durchführen
        if (settingsManager.get('cloudEnabled')) {
          await cloudManager.sync(stateManager.getState());
        }
      } catch (error) {
        console.error('[GameBoot] Fehler beim Speichern vor Beenden:', error);
      } finally {
        console.log('[GameBoot] Speichern abgeschlossen. Beende Electron...');
        
        // Timer und Loop sauber stoppen
        gameLoop.stop();
        if (autosaveTimer) {
          clearInterval(autosaveTimer);
          autosaveTimer = null;
        }
        eventBus.clear();

        window.electronAPI.sendQuitReady();
      }
    });
  }

  // --- B. Browser Safe-Quit (Web-Modus) ---
  window.addEventListener('beforeunload', (e) => {
    // Falls wir in Electron sind, wird das Beenden exklusiv oben über 'onQuitRequested' abgewickelt
    if (window.electronAPI) return;

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

  const introContainer = document.getElementById('intro-container');
  if (introContainer) {
    let introFinished = false;
    let handleIntroClick = null;

    // ----------------------------------------------------------
    // MYSTISCHES CANVAS-PARTIKELSYSTEM
    // Zero-Alloc Render Loop · OffscreenCanvas Stamps · Screen-Blend
    // ----------------------------------------------------------
    const _startIntroParticles = () => {
      const canvas = document.getElementById('intro-particle-canvas');
      if (!canvas) return null;

      // alpha:true für transparenten Hintergrund (screen-blending über dunklem BG)
      const ctx = canvas.getContext('2d', { alpha: true });
      let animFrameId = null;
      let stopped     = false;
      let lastTS      = -1;

      const resize = () => {
        canvas.width  = introContainer.clientWidth  || window.innerWidth;
        canvas.height = introContainer.clientHeight || window.innerHeight;
        // Composite-Mode muss nach Canvas-Resize neu gesetzt werden
        ctx.globalCompositeOperation = 'screen';
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      // ---- Pre-render Glow-Stamps auf OffscreenCanvas ----
      // Jeder Partikel-Typ wird einmalig auf eine kleine OffscreenCanvas gezeichnet.
      // Im Render-Loop nur noch drawImage (GPU-Textur-Blit, null GC, null Shader-Wechsel).
      const mkStamp = (coreColor, glowColor, coreR, haloR) => {
        const dim  = Math.ceil(haloR * 2 + 2);
        const half = dim / 2;
        const oc   = new OffscreenCanvas(dim, dim);
        const c    = oc.getContext('2d');
        const g    = c.createRadialGradient(half, half, coreR * 0.3, half, half, haloR);
        g.addColorStop(0, glowColor);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(half, half, haloR, 0, 6.283); c.fill();
        c.fillStyle = coreColor;
        c.beginPath(); c.arc(half, half, coreR,  0, 6.283); c.fill();
        return { img: oc, half };
      };

      const mkRuneStamp = (glyph, fontSize) => {
        const pad  = 8;
        const dim  = Math.ceil(fontSize + pad * 2);
        const half = dim / 2;
        const oc   = new OffscreenCanvas(dim, dim);
        const c    = oc.getContext('2d');
        // shadowBlur nur einmalig beim Stamp-Bake (kein Per-Frame-Cost mehr)
        c.shadowColor   = 'rgba(197,160,89,0.95)';
        c.shadowBlur    = 5;
        c.font          = `${fontSize}px serif`;
        c.textAlign     = 'center';
        c.textBaseline  = 'middle';
        c.fillStyle     = '#c5a059';
        c.fillText(glyph, half, half);
        return { img: oc, half };
      };

      const RUNE_GLYPHS = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ'];

      const ST = {
        eGold  : mkStamp('#ebd576',              'rgba(197,160,89,0.45)',  1.8, 10),
        eBright: mkStamp('#fff8c0',              'rgba(235,213,118,0.45)', 1.8, 10),
        dGold  : mkStamp('rgba(197,160,89,0.9)', 'rgba(197,160,89,0.22)', 1.2,  7),
        dPurp  : mkStamp('rgba(130,80,200,0.9)', 'rgba(130,80,200,0.22)', 1.2,  7),
        oGold  : mkStamp('rgba(197,160,89,0.5)', 'rgba(197,160,89,0.28)', 12,  50),
        oPurp  : mkStamp('rgba(130,80,200,0.4)', 'rgba(130,80,200,0.22)', 12,  50),
      };
      const RUNE_SM = RUNE_GLYPHS.map(g => mkRuneStamp(g,  9));
      const RUNE_LG = RUNE_GLYPHS.map(g => mkRuneStamp(g, 14));

      // ---- TypedArray-Partikel-Pool (null Heap-Alloc im Loop) ----
      const MAX      = 90;
      const px       = new Float32Array(MAX);
      const py       = new Float32Array(MAX);
      const pvx      = new Float32Array(MAX);
      const pvy      = new Float32Array(MAX);
      const psc      = new Float32Array(MAX); // drawImage-Scale
      const palpha   = new Float32Array(MAX);
      const pmaxA    = new Float32Array(MAX);
      const plife    = new Float32Array(MAX);
      const pmaxLife = new Float32Array(MAX);
      const pwob     = new Float32Array(MAX);
      const pwobS    = new Float32Array(MAX);
      const ptype    = new Uint8Array(MAX);   // 0=ember 1=dust 2=rune 3=spark 4=orb
      const pcol     = new Uint8Array(MAX);
      const prun     = new Uint8Array(MAX);
      const ptx      = new Float32Array(MAX);
      const pty      = new Float32Array(MAX);
      let count = 0;

      const reset = (i, init) => {
        const W = canvas.width, H = canvas.height;
        const cx = W * 0.5, cy = H * 0.5;
        plife[i] = 0; palpha[i] = 0; pwob[i] = Math.random() * 6.283;
        const t = ptype[i];
        if (t === 0) {
          const a = Math.random() * 6.283, d = 50 + Math.random() * 110;
          px[i] = cx + Math.cos(a) * d;
          py[i] = init ? cy + Math.random() * H * 0.5 : cy + 20 + Math.random() * 70;
          pvx[i] = (Math.random() - 0.5) * 0.5; pvy[i] = -(0.35 + Math.random() * 0.7);
          psc[i] = 0.5 + Math.random() * 0.9; pmaxA[i] = 0.4 + Math.random() * 0.5;
          pmaxLife[i] = 110 + Math.random() * 160; pwobS[i] = 0.022 + Math.random() * 0.025;
          pcol[i] = Math.random() > 0.4 ? 0 : 1;
        } else if (t === 1) {
          px[i] = Math.random() * W; py[i] = init ? Math.random() * H : H + 5;
          pvx[i] = (Math.random() - 0.5) * 0.2; pvy[i] = -(0.07 + Math.random() * 0.17);
          psc[i] = 0.4 + Math.random() * 0.75; pmaxA[i] = 0.08 + Math.random() * 0.18;
          pmaxLife[i] = 280 + Math.random() * 320; pwobS[i] = 0.007 + Math.random() * 0.012;
          pcol[i] = Math.random() > 0.55 ? 1 : 0;
        } else if (t === 2) {
          const a = Math.random() * 6.283, d = 75 + Math.random() * (Math.min(W, H) * 0.28);
          px[i] = cx + Math.cos(a) * d; py[i] = cy + Math.sin(a) * d;
          pvx[i] = Math.cos(a) * 0.1; pvy[i] = Math.sin(a) * 0.1;
          psc[i] = Math.random() > 0.5 ? 1 : 0; pmaxA[i] = 0.12 + Math.random() * 0.22;
          pmaxLife[i] = 170 + Math.random() * 200; pwobS[i] = 0.012;
          prun[i] = Math.floor(Math.random() * RUNE_GLYPHS.length);
        } else if (t === 3) {
          const a = Math.random() * 6.283;
          px[i] = cx + (Math.random() - 0.5) * 55; py[i] = cy + (Math.random() - 0.5) * 55;
          ptx[i] = px[i]; pty[i] = py[i];
          pvx[i] = Math.cos(a) * (1.4 + Math.random() * 1.9);
          pvy[i] = Math.sin(a) * (1.4 + Math.random() * 1.9);
          psc[i] = 0.7 + Math.random() * 0.7; pmaxA[i] = 0.7 + Math.random() * 0.3;
          pmaxLife[i] = 22 + Math.random() * 38; pwobS[i] = 0;
        } else {
          px[i] = cx + (Math.random() - 0.5) * W * 0.5;
          py[i] = cy + (Math.random() - 0.5) * H * 0.5;
          pvx[i] = (Math.random() - 0.5) * 0.15; pvy[i] = (Math.random() - 0.5) * 0.15;
          psc[i] = 0.6 + Math.random() * 0.9; pmaxA[i] = 0.12 + Math.random() * 0.18;
          pmaxLife[i] = 340 + Math.random() * 400; pwobS[i] = 0.004 + Math.random() * 0.005;
          pcol[i] = Math.random() > 0.5 ? 0 : 1;
        }
        if (init) plife[i] = Math.random() * pmaxLife[i];
      };

      const initTypes = [...Array(5).fill(4), ...Array(22).fill(1), ...Array(32).fill(0), ...Array(8).fill(2)];
      count = initTypes.length;
      for (let i = 0; i < count; i++) { ptype[i] = initTypes[i]; reset(i, true); }

      // screen-compositing: überlappende Partikel addieren Helligkeit → Glow ohne shadowBlur
      ctx.globalCompositeOperation = 'screen';

      let sparkCooldown = 65;

      // ---- Zero-Alloc Render-Loop ----
      const tick = (now) => {
        if (stopped) return;
        animFrameId = requestAnimationFrame(tick);
        if (lastTS < 0) { lastTS = now; return; }          // Warmup-Frame überspringen
        const dt = Math.min((now - lastTS) / 16.667, 2.5); // normiert: 1.0 = 60fps
        lastTS = now;
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        sparkCooldown -= dt;
        if (sparkCooldown <= 0 && count < MAX - 6) {
          const n = 2 + Math.floor(Math.random() * 4);
          for (let b = 0; b < n && count < MAX; b++) { ptype[count] = 3; reset(count, false); count++; }
          sparkCooldown = 65 + Math.random() * 75;
        }

        let lt, st, sc, w, h;

        // Orbs
        for (let i = 0; i < count; i++) {
          if (ptype[i] !== 4) continue;
          plife[i] += dt; pwob[i] += pwobS[i] * dt;
          lt = plife[i] / pmaxLife[i];
          palpha[i] = lt < 0.2 ? (lt/0.2)*pmaxA[i] : lt > 0.7 ? ((1-lt)/0.3)*pmaxA[i] : pmaxA[i];
          px[i] += (pvx[i] + Math.cos(pwob[i]) * 0.28) * dt;
          py[i] += (pvy[i] + Math.sin(pwob[i] * 0.7) * 0.22) * dt;
          if (palpha[i] > 0.004) {
            st = pcol[i] ? ST.oPurp : ST.oGold; sc = psc[i];
            w = st.img.width * sc; h = st.img.height * sc;
            ctx.globalAlpha = palpha[i];
            ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
          }
          if (plife[i] >= pmaxLife[i]) reset(i, false);
        }

        // Dust
        for (let i = 0; i < count; i++) {
          if (ptype[i] !== 1) continue;
          plife[i] += dt; pwob[i] += pwobS[i] * dt;
          lt = plife[i] / pmaxLife[i];
          palpha[i] = lt < 0.2 ? (lt/0.2)*pmaxA[i] : lt > 0.7 ? ((1-lt)/0.3)*pmaxA[i] : pmaxA[i];
          px[i] += (pvx[i] + Math.sin(pwob[i]) * 0.22) * dt;
          py[i] += pvy[i] * dt;
          if (palpha[i] > 0.004) {
            st = pcol[i] ? ST.dPurp : ST.dGold; sc = psc[i];
            w = st.img.width * sc; h = st.img.height * sc;
            ctx.globalAlpha = palpha[i];
            ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
          }
          if (plife[i] >= pmaxLife[i]) reset(i, false);
        }

        // Embers
        for (let i = 0; i < count; i++) {
          if (ptype[i] !== 0) continue;
          plife[i] += dt; pwob[i] += pwobS[i] * dt;
          lt = plife[i] / pmaxLife[i];
          palpha[i] = lt < 0.2 ? (lt/0.2)*pmaxA[i] : lt > 0.7 ? ((1-lt)/0.3)*pmaxA[i] : pmaxA[i];
          px[i] += (pvx[i] + Math.sin(pwob[i]) * 0.28) * dt;
          py[i] += pvy[i] * dt;
          if (palpha[i] > 0.004) {
            st = pcol[i] ? ST.eBright : ST.eGold; sc = psc[i];
            w = st.img.width * sc; h = st.img.height * sc;
            ctx.globalAlpha = palpha[i];
            ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
          }
          if (plife[i] >= pmaxLife[i]) reset(i, false);
        }

        // Runes (vorgerenderte Glyphen-Stamps)
        for (let i = 0; i < count; i++) {
          if (ptype[i] !== 2) continue;
          plife[i] += dt; pwob[i] += pwobS[i] * dt;
          lt = plife[i] / pmaxLife[i];
          palpha[i] = lt < 0.2 ? (lt/0.2)*pmaxA[i] : lt > 0.7 ? ((1-lt)/0.3)*pmaxA[i] : pmaxA[i];
          px[i] += pvx[i] * dt;
          py[i] += (pvy[i] + Math.sin(pwob[i]) * 0.18) * dt;
          if (palpha[i] > 0.004) {
            st = (psc[i] > 0.5 ? RUNE_LG : RUNE_SM)[prun[i]];
            ctx.globalAlpha = palpha[i];
            ctx.drawImage(st.img, px[i] - st.half, py[i] - st.half);
          }
          if (plife[i] >= pmaxLife[i]) reset(i, false);
        }

        // Sparks
        ctx.strokeStyle = '#ebd576';
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
          if (ptype[i] !== 3) continue;
          ptx[i] = px[i]; pty[i] = py[i];
          plife[i] += dt;
          lt = plife[i] / pmaxLife[i];
          palpha[i] = lt < 0.1 ? (lt/0.1)*pmaxA[i] : ((1-lt)/0.9)*pmaxA[i];
          px[i] += pvx[i] * dt; py[i] += pvy[i] * dt;
          if (palpha[i] > 0.02) {
            ctx.globalAlpha = palpha[i];
            ctx.lineWidth   = psc[i];
            ctx.beginPath();
            ctx.moveTo(ptx[i], pty[i]); ctx.lineTo(px[i], py[i]);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // Tote Sparks entfernen (Swap-with-Last, O(1), kein splice/GC)
        for (let i = count - 1; i >= 0; i--) {
          if (ptype[i] === 3 && plife[i] >= pmaxLife[i]) {
            const L = --count;
            if (i !== L) {
              ptype[i]=ptype[L]; px[i]=px[L]; py[i]=py[L];
              pvx[i]=pvx[L]; pvy[i]=pvy[L]; psc[i]=psc[L];
              palpha[i]=palpha[L]; pmaxA[i]=pmaxA[L];
              plife[i]=plife[L]; pmaxLife[i]=pmaxLife[L];
              pwob[i]=pwob[L]; pwobS[i]=pwobS[L];
              pcol[i]=pcol[L]; prun[i]=prun[L];
              ptx[i]=ptx[L]; pty[i]=pty[L];
            }
          }
        }
      };

      // GPU-Warmup: zwei Frames warten bevor Loop startet
      requestAnimationFrame(() => { lastTS = performance.now(); requestAnimationFrame(tick); });

      return () => {
        stopped = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    };



    const stopParticles = _startIntroParticles();

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

        // Menü anzeigen
        navigation.showMenu();

        // GameLoop starten
        gameLoop.start();

        // Event veröffentlichen
        eventBus.publish(EVENTS.GAME_BOOTED, {
          timestamp: Date.now(),
          version: '1.6',
          services: Array.from(container.getKeys())
        });

        logger.info('[GameBoot] Spiel bereit! 🏛️✨');
        console.log('[GameBoot] Bootstrapping abgeschlossen.');
      }, 800);
    };

    // Timer für das automatische Beenden des Intros
    let introTimeoutId = setTimeout(finishIntro, 7000);

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

    // ============================================================
    // ELECTRON AUTO-UPDATER INTEGRATION (IN-GAME UI)
    // ============================================================
    const updateOverlay = document.getElementById('update-overlay');
    const updateTitle = document.getElementById('update-title');
    const updateMessage = document.getElementById('update-message');
    const updateConfirmBtn = document.getElementById('update-confirm-btn');
    const updateCancelBtn = document.getElementById('update-cancel-btn');
    const loadingBar = document.querySelector('.intro-loading-bar');
    const loadingText = document.getElementById('intro-loading-text');

    if (window.electronAPI) {
      // 1. Wenn ein Update verfügbar ist
      window.electronAPI.onUpdateEvent('update:available', (info) => {
        logger.info(`[Update] Neue Version ${info.version} verfügbar.`);
        
        // Intro-Beendigungstimer stoppen, damit das Spiel auf der Intro-Page wartet
        if (introTimeoutId) {
          clearTimeout(introTimeoutId);
          introTimeoutId = null;
        }

        // Custom Modal mit Grimoire-Spieldesign anzeigen
        updateTitle.innerText = "Neue Offenbarung";
        updateMessage.innerText = `Eine neue Version (${info.version}) wurde im Archiv gesichtet. Möchtest du die neuen Fragmente jetzt herunterladen?`;
        updateConfirmBtn.innerText = "Herunterladen";
        updateCancelBtn.innerText = "Später";
        updateOverlay.style.display = 'flex';

        // Download starten bei Klick
        updateConfirmBtn.onclick = () => {
          updateOverlay.style.display = 'none';

          // Intro-Ladebalken pausieren und für echten Download-Fortschritt vorbereiten
          if (loadingBar) {
            loadingBar.classList.add('manual-progress');
            loadingBar.style.width = '0%';
          }
          if (loadingText) {
            loadingText.style.opacity = '1';
            loadingText.innerText = "Lade Archiv-Fragmente herunter (0%)...";
          }

          // IPC-Signal zum Starten des Downloads senden
          window.electronAPI.startDownload();
        };

        // Überspringen (Später updaten)
        updateCancelBtn.onclick = () => {
          updateOverlay.style.display = 'none';
          finishIntro();
        };
      });

      // 2. Download-Fortschritt visualisieren
      window.electronAPI.onUpdateEvent('update:progress', (progress) => {
        const percent = progress.percent || 0;
        if (loadingBar) {
          loadingBar.style.width = `${percent}%`;
        }
        if (loadingText) {
          loadingText.innerText = `Lade Archiv-Fragmente herunter (${percent}%)...`;
        }
      });

      // 3. Download fertiggestellt
      window.electronAPI.onUpdateEvent('update:downloaded', (info) => {
        logger.info(`[Update] Version ${info.version} vollständig heruntergeladen.`);

        // Bestätigung für die direkte Installation und den Neustart
        updateTitle.innerText = "Download Abgeschlossen";
        updateMessage.innerText = `Das Update für Version ${info.version} ist bereit. Soll die Installation durchgeführt und das Spiel neu gestartet werden?`;
        updateConfirmBtn.innerText = "Jetzt installieren";
        updateCancelBtn.innerText = "Später";
        updateOverlay.style.display = 'flex';

        updateConfirmBtn.onclick = () => {
          updateOverlay.style.display = 'none';
          window.electronAPI.quitAndInstall();
        };

        updateCancelBtn.onclick = () => {
          updateOverlay.style.display = 'none';
          finishIntro();
        };
      });

      // 4. Update-Fehler abfangen
      window.electronAPI.onUpdateEvent('update:error', (err) => {
        logger.error('[Update-Fehler]', err.message);
        
        if (introTimeoutId) {
          clearTimeout(introTimeoutId);
          introTimeoutId = null;
        }

        if (loadingText) {
          loadingText.style.opacity = '1';
          loadingText.innerText = "Update-Prüfung fehlgeschlagen. Starte Spiel...";
        }
        
        // Nach kurzer Anzeige der Fehlermeldung normal fortfahren
        setTimeout(() => {
          finishIntro();
        }, 2000);
      });

      // 5. Wenn kein Update verfügbar ist (Spiel ist aktuell)
      window.electronAPI.onUpdateEvent('update:not-available', () => {
        logger.info('[Update] Das Spiel ist auf dem neuesten Stand.');
        
        if (introTimeoutId) {
          clearTimeout(introTimeoutId);
          introTimeoutId = null;
        }

        if (loadingText) {
          loadingText.style.opacity = '1';
          loadingText.innerText = "Das Archiv ist auf dem neuesten Stand.";
        }

        // Nach einer kurzen Verzögerung normal fortfahren
        setTimeout(() => {
          finishIntro();
        }, 1500);
      });
    }
  } else {
    // Fallback falls kein Intro-Container existiert
    navigation.showMenu();
    gameLoop.start();

    eventBus.publish(EVENTS.GAME_BOOTED, {
      timestamp: Date.now(),
      version: '1.6',
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