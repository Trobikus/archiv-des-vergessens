/* ============================================================
   LAUNCHER.JS - Logik & Interaktion für den Game Launcher
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Launcher] Initialisiere Interaktionslogik...');

  // DOM Elemente abrufen
  const actionBtn = document.getElementById('action-btn');
  const closeBtn = document.getElementById('close-btn');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const particlesContainer = document.getElementById('particles-container');
  const launcherContainer = document.querySelector('.launcher-container');

  let isDevMode = false;
  let updateState = 'checking'; // Zustände: 'checking', 'dev-mode', 'update-available', 'downloading', 'ready-to-install', 'ready-to-play'

  // Hintergrundbild dynamisch per IPC laden (löst das asar-Pfad-Problem)
  // In Dev: Projekt-Root / In Production: resources/ neben app.asar
  if (launcherContainer && window.electronAPI && window.electronAPI.getResourcesPath) {
    try {
      const resourcesPath = await window.electronAPI.getResourcesPath();
      // Slashes normalisieren für file:// URLs auf Windows
      const bgPath = resourcesPath.replace(/\\/g, '/');
      launcherContainer.style.backgroundImage = `url('file:///${bgPath}/background.png')`;
      console.log('[Launcher] Hintergrundbild geladen aus:', bgPath);
    } catch (e) {
      console.warn('[Launcher] Konnte Hintergrundbild-Pfad nicht laden:', e);
    }
  }

  // Button anfangs während der Update-Prüfung deaktivieren
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.innerText = 'PRÜFE UPDATES...';
  }

  // 1. Fenstersteuerung (Schließen via IPC-Bridge)
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.electronAPI && typeof window.electronAPI.closeLauncher === 'function') {
        window.electronAPI.closeLauncher();
      } else {
        console.log('[Launcher] Schließe Fenster (Mock)');
        window.close();
      }
    });
  }

  // 2. Partikel-System (Dynamisches Spawnen von goldene Glühwürmchen)
  function createParticle() {
    if (!particlesContainer) return;

    const particle = document.createElement('div');
    particle.className = 'particle';

    const startX = Math.random() * 100; // Prozentuale Breite
    const size = Math.random() * 2.5 + 0.5; // Größe zwischen 0.5px und 3px
    const duration = Math.random() * 3 + 4; // Dauer 4s bis 7s
    const driftX = (Math.random() * 60 - 30) + 'px'; // Seitlicher Drift
    const delay = Math.random() * 2; // Verzögerung beim Start

    particle.style.left = `${startX}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.setProperty('--drift-x', driftX);
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;

    particlesContainer.appendChild(particle);

    // Partikel löschen, sobald die Animation beendet ist (Verhindert DOM-Lecks)
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
  }

  // Initial Partikel erzeugen
  for (let i = 0; i < 15; i++) {
    createParticle();
  }

  // Regelmäßig neue Partikel spawnen
  setInterval(createParticle, 400);

  // 3. UI-Status Steuerungshelfer
  function setUIState(state, text = '') {
    updateState = state;
    if (!actionBtn || !progressContainer) return;

    if (state === 'downloading') {
      actionBtn.style.display = 'none';
      progressContainer.style.display = 'flex';
      if (text) progressLabel.innerText = text;
    } else {
      progressContainer.style.display = 'none';
      actionBtn.style.display = 'inline-block';
      actionBtn.disabled = false;

      switch (state) {
        case 'checking':
          actionBtn.disabled = true;
          actionBtn.innerText = 'PRÜFE UPDATES...';
          break;
        case 'dev-mode':
          actionBtn.innerText = 'INSTALL GAME';
          break;
        case 'update-available':
          actionBtn.innerText = 'DOWNLOAD UPDATE';
          break;
        case 'ready-to-install':
          actionBtn.innerText = 'INSTALL UPDATE';
          break;
        case 'ready-to-play':
          actionBtn.innerText = 'PLAY ADVENTURE';
          break;
      }
    }
  }

  // 4. Action Button Handler (Schaltet je nach Status die entsprechende Logik)
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      if (updateState === 'dev-mode') {
        // --- SIMULATIONS-MODUS (Dev/Browser) ---
        console.log('[Launcher] Starte Download-Simulation...');
        setUIState('downloading', 'Downloading... 0%');
        progressFill.style.width = '0%';
        
        let progress = 0;
        const totalDuration = 4000; // 4 Sekunden
        const intervalStep = 40; // Aktualisierung alle 40ms
        const increment = 100 / (totalDuration / intervalStep);

        const simInterval = setInterval(() => {
          progress += increment;
          if (progress >= 100) {
            progress = 100;
            clearInterval(simInterval);
            
            setTimeout(() => {
              setUIState('ready-to-play');
              console.log('[Launcher] Simulation abgeschlossen.');
            }, 300);
          }
          
          const roundedProgress = Math.round(progress);
          progressFill.style.width = `${roundedProgress}%`;
          progressLabel.innerText = `Downloading... ${roundedProgress}%`;
        }, intervalStep);

      } else if (updateState === 'update-available') {
        // --- REALER UPDATER: Download starten ---
        console.log('[Launcher] Starte realen Download...');
        setUIState('downloading', 'Downloading... 0%');
        progressFill.style.width = '0%';
        if (window.electronAPI && typeof window.electronAPI.startDownload === 'function') {
          window.electronAPI.startDownload();
        }
      } else if (updateState === 'ready-to-install') {
        // --- REALER UPDATER: Installation starten (App-Neustart) ---
        console.log('[Launcher] Starte App-Installation...');
        if (window.electronAPI && typeof window.electronAPI.quitAndInstall === 'function') {
          window.electronAPI.quitAndInstall();
        }
      } else if (updateState === 'ready-to-play') {
        // --- SPIEL STARTEN ---
        console.log('[Launcher] Starte Hauptspiel...');
        if (window.electronAPI && typeof window.electronAPI.launchGame === 'function') {
          window.electronAPI.launchGame();
        } else {
          alert('Starte Spiel (Mock)! Das Hauptfenster würde sich nun öffnen.');
        }
      }
    });
  }

  // 5. Electron Auto-Updater Events (falls electronAPI verfügbar)
  if (window.electronAPI) {
    // A. Update verfügbar
    window.electronAPI.onUpdateEvent('update:available', (info) => {
      console.log('[Launcher] Update gefunden:', info);
      setUIState('update-available');
    });

    // B. Kein Update gefunden (Spiel aktuell)
    window.electronAPI.onUpdateEvent('update:not-available', () => {
      console.log('[Launcher] Keine Updates gefunden. Spiel ist aktuell.');
      setUIState('ready-to-play');
    });

    // C. Download-Fortschritt
    window.electronAPI.onUpdateEvent('update:progress', (progressInfo) => {
      const percent = Math.round(progressInfo.percent || 0);
      setUIState('downloading');
      progressFill.style.width = `${percent}%`;
      progressLabel.innerText = `Downloading... ${percent}%`;
    });

    // D. Update fertig heruntergeladen
    window.electronAPI.onUpdateEvent('update:downloaded', (info) => {
      console.log('[Launcher] Download beendet. Bereit zur Installation:', info);
      setUIState('ready-to-install');
    });

    // E. Fehler bei der Update-Abfrage
    window.electronAPI.onUpdateEvent('update:error', (err) => {
      console.error('[Launcher] AutoUpdater Fehler:', err);
      // Fallback: Ermögliche Offline-Spielstart bei Verbindungsfehlern
      setUIState('ready-to-play');
    });

    // Initiale Suche nach Updates starten (1.5 Sek. verzögert für Lade-Ästhetik)
    setTimeout(() => {
      window.electronAPI.checkForUpdate().then(res => {
        console.log('[Launcher] Update-Abfrage Ergebnis:', res);
        if (res && res.status === 'dev-mode') {
          isDevMode = true;
          setUIState('dev-mode');
        }
      }).catch(err => {
        console.error('[Launcher] Fehler bei Update-Abfrage:', err);
        setUIState('ready-to-play');
      });
    }, 1500);

  } else {
    // Fallback für Browser-Tests (außerhalb Electron)
    console.warn('[Launcher] Kein Electron-Kontext erkannt. Fallback zu Dev-Modus.');
    isDevMode = true;
    setTimeout(() => {
      setUIState('dev-mode');
    }, 1000);
  }
});
