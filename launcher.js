import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/* ============================================================
   LAUNCHER.JS - AAA Native Tauri Launcher
   ============================================================ */

/**
 * Format bytes into human-readable string (e.g., "14.2 MB", "28.5 MB", "500 KB").
 */
function formatBytes(bytes, decimals = 1) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format speed in bytes per second into human-readable string (e.g., "2.4 MB/s").
 */
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${Math.round(bytesPerSec)} B/s`;
}

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
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');
  const offlineBtn = document.getElementById('offline-btn');

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
      if (errorContainer) errorContainer.style.display = 'none';
      progressContainer.style.display = 'flex';
      if (text && progressLabel) progressLabel.innerText = text;
      
      if (state === 'validating') {
        progressFill.classList.add('pulse');
      } else {
        progressFill.classList.remove('pulse');
      }
    } else if (state === 'error') {
      actionBtn.style.display = 'none';
      progressContainer.style.display = 'none';
      progressFill.classList.remove('pulse');
      if (errorContainer) {
        errorContainer.style.display = 'flex';
        if (errorMessage) {
          errorMessage.innerText = text || 'Update fehlgeschlagen oder keine Netzverbindung.';
        }
      }
    } else {
      progressContainer.style.display = 'none';
      if (errorContainer) errorContainer.style.display = 'none';
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

  // Error recovery button handlers
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      console.log('[Launcher] Erneuter Update-Versuch...');
      performUpdateCheck();
    });
  }

  if (offlineBtn) {
    offlineBtn.addEventListener('click', async () => {
      console.log('[Launcher] Offline-Modus gewählt. Starte Hauptspiel...');
      try {
        await invoke('launch_game');
      } catch (e) {
        console.error('[Launcher] Konnte Spiel nicht starten:', e);
      }
    });
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
        let startTime = performance.now();

        try {
          await tauriUpdate.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength || 0;
                downloaded = 0;
                startTime = performance.now();
                console.log(`[Launcher] Download gestartet. Größe: ${contentLength}`);
                break;
              case 'Progress': {
                downloaded += event.data.chunkLength;
                const now = performance.now();
                const elapsedSec = (now - startTime) / 1000;
                const speedBytesPerSec = elapsedSec > 0 ? downloaded / elapsedSec : 0;
                const speedStr = formatSpeed(speedBytesPerSec);

                if (contentLength > 0) {
                  const percent = Math.min(100, Math.round((downloaded / contentLength) * 100));
                  progressFill.style.width = `${percent}%`;
                  const downloadedFormatted = formatBytes(downloaded, 1);
                  const totalFormatted = formatBytes(contentLength, 1);
                  progressLabel.innerText = `Downloading... ${downloadedFormatted} / ${totalFormatted} (${percent}%) - ${speedStr}`;
                } else {
                  const downloadedFormatted = formatBytes(downloaded, 1);
                  progressLabel.innerText = `Downloading... ${downloadedFormatted} - ${speedStr}`;
                }
                break;
              }
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
            await relaunch();
          }, 1500);

        } catch (e) {
          console.error('[Launcher] Fehler beim Update:', e);
          setUIState('error', 'Download oder Installation fehlgeschlagen. Bitte Verbindung prüfen.');
        }

      } else if (updateState === 'ready-to-play') {
        console.log('[Launcher] Starte Hauptspiel...');
        actionBtn.disabled = true;
        actionBtn.innerText = 'LAUNCHING...';
        try {
          await invoke('launch_game');
        } catch (e) {
          console.error('[Launcher] Konnte Spiel nicht starten:', e);
          actionBtn.disabled = false;
          actionBtn.innerText = 'PLAY ADVENTURE';
        }
      }
    });
  }

  // 5. Update Prüfung
  async function performUpdateCheck() {
    setUIState('checking');
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
      // Wenn noch kein GitHub Release mit latest.json existiert (404) oder offline,
      // erlauben wir dem Spieler direkt zu spielen ("PLAY ADVENTURE").
      console.warn('[Launcher] Update-Prüfung fehlgeschlagen / kein GitHub-Release online. Spiel freigegeben:', err);
      setUIState('ready-to-play');
    }
  }

  // Verzögerter Start für besseres Gefühl
  setTimeout(() => {
    performUpdateCheck();
  }, 1000);

});
