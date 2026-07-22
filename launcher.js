import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';

/* ============================================================
   LAUNCHER.JS - AAA Native Tauri Launcher
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Launcher] Initialisiere native Tauri-Interaktionslogik...');

  // DOM Elemente abrufen
  const actionBtn = document.getElementById('action-btn');
  const closeBtn = document.getElementById('close-btn');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const particlesContainer = document.getElementById('particles-container');
  const launcherContainer = document.querySelector('.launcher-container');
  const updateToast = document.getElementById('update-toast');
  const versionIndicator = document.getElementById('version-indicator');

  let updateState = 'checking'; 
  let tauriUpdate = null; // Store update object if available

  const appWindow = getCurrentWindow();

  // Hintergrundbild asynchron laden um Flackern zu verhindern
  const bgUrl = '/background.png';
  const img = new Image();
  img.onload = () => {
    if (launcherContainer) {
      launcherContainer.style.backgroundImage = `url('${bgUrl}')`;
    }
    // Zeige das Fenster sanft an
    setTimeout(() => {
      invoke('show_launcher').catch(() => appWindow.show());
    }, 50);
  };
  img.onerror = () => {
    console.error('[Launcher] Konnte Hintergrundbild nicht laden.');
    invoke('show_launcher').catch(() => appWindow.show());
  };
  img.src = bgUrl;

  // Aktuelle App-Version asynchron ermitteln und im Indicator setzen
  try {
    const appVersion = await getVersion();
    if (versionIndicator) {
      versionIndicator.innerText = `aktuellste Version v${appVersion}`;
    }
  } catch (e) {
    console.warn('[Launcher] Konnte Version nicht auslesen:', e);
  }

  // Button anfangs während der Update-Prüfung deaktivieren
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.innerText = 'PRÜFE UPDATES...';
  }

  // 1. Fenstersteuerung (Schließen via IPC)
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      invoke('close_launcher').catch(() => appWindow.close());
    });
  }

  // 2. Partikel-System (Dynamisches Spawnen von goldene Glühwürmchen)
  function createParticle() {
    if (!particlesContainer) return;

    const particle = document.createElement('div');
    particle.className = 'particle';

    const startX = Math.random() * 100;
    const size = Math.random() * 2.5 + 0.5;
    const duration = Math.random() * 3 + 4;
    const driftX = (Math.random() * 60 - 30) + 'px';
    const delay = Math.random() * 2;

    particle.style.left = `${startX}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.setProperty('--drift-x', driftX);
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;

    particlesContainer.appendChild(particle);

    particle.addEventListener('animationend', () => {
      particle.remove();
    });
  }

  // Initial Partikel erzeugen
  for (let i = 0; i < 15; i++) {
    createParticle();
  }
  setInterval(createParticle, 400);

  // 3. UI-Status Steuerungshelfer
  function setUIState(state, text = '') {
    updateState = state;
    if (!actionBtn || !progressContainer) return;

    if (state === 'downloading' || state === 'validating') {
      actionBtn.style.display = 'none';
      progressContainer.style.display = 'flex';
      if (text) progressLabel.innerText = text;
      
      if (state === 'validating') {
        progressFill.classList.add('pulse');
      } else {
        progressFill.classList.remove('pulse');
      }
    } else {
      progressContainer.style.display = 'none';
      actionBtn.style.display = 'inline-block';
      actionBtn.disabled = false;
      progressFill.classList.remove('pulse');

      switch (state) {
        case 'checking':
          actionBtn.disabled = true;
          actionBtn.innerText = 'PRÜFE UPDATES...';
          break;
        case 'update-available':
          actionBtn.innerText = 'UPDATE';
          break;
        case 'ready-to-install':
          actionBtn.innerText = 'INSTALL UPDATE';
          break;
        case 'ready-to-play':
          actionBtn.innerText = 'PLAY ADVENTURE';
          break;
      }
    }

    if (updateToast) {
      if (state === 'ready-to-install') {
        updateToast.classList.add('show');
      } else {
        updateToast.classList.remove('show');
      }
    }

    if (versionIndicator) {
      if (state === 'ready-to-play') {
        versionIndicator.classList.add('show');
      } else {
        versionIndicator.classList.remove('show');
      }
    }
  }

  // 4. Action Button Handler
  if (actionBtn) {
    actionBtn.addEventListener('click', async () => {
      if (updateState === 'update-available' && tauriUpdate) {
        console.log('[Launcher] Starte echten Download...');
        setUIState('downloading', 'Downloading... 0%');
        progressFill.style.width = '0%';
        
        let downloaded = 0;
        let contentLength = 0;

        try {
          await tauriUpdate.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength || 0;
                console.log(`[Launcher] Download gestartet. Größe: ${contentLength}`);
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                if (contentLength > 0) {
                  const percent = Math.round((downloaded / contentLength) * 100);
                  progressFill.style.width = `${percent}%`;
                  progressLabel.innerText = `Downloading... ${percent}%`;
                } else {
                  progressLabel.innerText = `Downloading... ${Math.round(downloaded / 1024)} KB`;
                }
                break;
              case 'Finished':
                console.log('[Launcher] Download beendet.');
                break;
            }
          });
          
          setUIState('validating', 'VALIDATING FILES...');
          progressFill.style.width = '100%';
          
          // Kurze Pause für Ästhetik
          setTimeout(async () => {
            console.log('[Launcher] Installation abgeschlossen. Starte App neu...');
            // App neu starten
            const { relaunch } = await import('@tauri-apps/plugin-process');
            await relaunch();
          }, 1500);

        } catch (e) {
          console.error('[Launcher] Fehler beim Update:', e);
          setUIState('ready-to-play'); // Fallback auf Spiel starten
        }

      } else if (updateState === 'ready-to-play') {
        console.log('[Launcher] Starte Hauptspiel...');
        try {
          await invoke('launch_game');
        } catch (e) {
          console.error('[Launcher] Konnte Spiel nicht starten:', e);
        }
      }
    });
  }

  // 5. Update Prüfung
  async function performUpdateCheck() {
    try {
      const update = await check();
      if (update?.available) {
        console.log(`[Launcher] Update auf ${update.version} verfügbar!`);
        tauriUpdate = update;
        setUIState('update-available');
      } else {
        console.log('[Launcher] Spiel ist auf dem neuesten Stand.');
        setUIState('ready-to-play');
      }
    } catch (err) {
      // Wenn der Server nicht erreichbar ist, erlauben wir trotzdem das Spielen
      console.warn('[Launcher] Update-Prüfung fehlgeschlagen. Offline/Dev-Modus aktiv.', err);
      setUIState('ready-to-play');
    }
  }

  // Verzögerter Start für besseres Gefühl
  setTimeout(() => {
    performUpdateCheck();
  }, 1500);

});
