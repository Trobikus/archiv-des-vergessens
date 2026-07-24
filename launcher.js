import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

/* ============================================================
   LAUNCHER.JS - Standalone Lightweight Launcher
   ============================================================ */

/**
 * Parse a version string (e.g. "1.0.16" or "v1.0.16") into numerical components.
 */
function parseVersion(v) {
  return (v || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
}

/**
 * Compare two SemVer strings to check if latestVer is newer than currentVer.
 */
function isNewerVersion(currentVer, latestVer) {
  if (!currentVer) return true;
  const current = parseVersion(currentVer);
  const latest = parseVersion(latestVer);
  for (let i = 0; i < Math.max(current.length, latest.length); i++) {
    const c = current[i] || 0;
    const l = latest[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Launcher] Initialisiere den eigenständigen Launcher...');

  // DOM Elemente
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

  let installedVersion = null;
  let latestReleaseInfo = null;
  let launcherState = 'checking'; // 'checking', 'not-installed', 'update-available', 'ready-to-play', 'downloading', 'error'

  const appWindow = getCurrentWindow();

  // Hintergrundbild asynchron laden
  const bgUrl = '/background.png';
  const img = new Image();
  img.onload = () => {
    if (launcherContainer) {
      launcherContainer.style.backgroundImage = `url('${bgUrl}')`;
    }
  };
  img.src = bgUrl;

  // 1. Fenstersteuerung
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      try {
        await invoke('close_launcher');
      } catch (e) {
        if (appWindow) appWindow.close();
      }
    });
  }

  // 2. Partikel-System
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

  for (let i = 0; i < 15; i++) {
    createParticle();
  }
  setInterval(createParticle, 400);

  // 3. UI State Management
  function setUIState(state, customText = '') {
    launcherState = state;

    if (!actionBtn || !progressContainer) return;

    if (state === 'error') {
      actionBtn.style.display = 'none';
      progressContainer.style.display = 'none';
      if (errorContainer) {
        errorContainer.style.display = 'flex';
        if (errorMessage) {
          errorMessage.innerText = customText || 'Ein Fehler ist aufgetreten.';
        }
      }
      return;
    }

    if (errorContainer) errorContainer.style.display = 'none';

    if (state === 'downloading') {
      actionBtn.style.display = 'none';
      progressContainer.style.display = 'block';
      return;
    }

    progressContainer.style.display = 'none';
    actionBtn.style.display = 'inline-block';
    actionBtn.disabled = false;

    switch (state) {
      case 'checking':
        actionBtn.disabled = true;
        actionBtn.innerText = 'PRÜFE UPDATES...';
        break;
      case 'not-installed':
        actionBtn.innerText = 'INSTALL GAME';
        break;
      case 'update-available':
        actionBtn.innerText = 'UPDATE GAME';
        break;
      case 'ready-to-play':
        actionBtn.innerText = 'PLAY ADVENTURE';
        break;
    }

    if (versionIndicator) {
      if (installedVersion) {
        versionIndicator.innerText = `Version: v${installedVersion}`;
        versionIndicator.classList.add('show');
      } else {
        versionIndicator.innerText = 'Nicht installiert';
        versionIndicator.classList.add('show');
      }
    }
  }

  // Event Listener for Download Progress
  try {
    await listen('download_progress', (event) => {
      const payload = event.payload;
      if (payload) {
        setUIState('downloading');
        if (progressFill) progressFill.style.width = `${payload.percent}%`;
        if (progressLabel) progressLabel.innerText = `${payload.status}`;
      }
    });
  } catch (e) {
    console.warn('[Launcher] Konnte Event Listener nicht registrieren:', e);
  }

  // Action Button Handler
  if (actionBtn) {
    actionBtn.addEventListener('click', async () => {
      if (launcherState === 'not-installed' || launcherState === 'update-available') {
        if (!latestReleaseInfo) {
          setUIState('error', 'Keine Release Information vorhanden.');
          return;
        }

        setUIState('downloading');
        try {
          await invoke('download_and_extract_game', {
            downloadUrl: latestReleaseInfo.download_url,
            version: latestReleaseInfo.tag_name.replace(/^v/i, '')
          });

          installedVersion = latestReleaseInfo.tag_name.replace(/^v/i, '');
          if (updateToast) {
            updateToast.innerText = `✨ ${installedVersion} erfolgreich installiert!`;
            updateToast.classList.add('show');
          }
          setUIState('ready-to-play');
        } catch (err) {
          console.error('[Launcher] Download/Extraction Fehler:', err);
          setUIState('error', `Installation fehlgeschlagen: ${err}`);
        }
      } else if (launcherState === 'ready-to-play') {
        actionBtn.disabled = true;
        actionBtn.innerText = 'STARTE SPIEL...';
        try {
          await invoke('launch_installed_game');
        } catch (err) {
          console.error('[Launcher] Spiel konnte nicht gestartet werden:', err);
          setUIState('error', `Fehler beim Starten: ${err}`);
        }
      }
    });
  }

  // Error Buttons
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      checkSystemAndUpdates();
    });
  }

  if (offlineBtn) {
    offlineBtn.addEventListener('click', async () => {
      try {
        await invoke('launch_installed_game');
      } catch (err) {
        setUIState('error', `Offline-Start fehlgeschlagen: ${err}`);
      }
    });
  }

  // 4. Update and Installation Check
  async function checkSystemAndUpdates() {
    setUIState('checking');

    // 1. Check installed game version
    try {
      installedVersion = await invoke('get_installed_game_version');
      console.log('[Launcher] Installierte Version:', installedVersion);
    } catch (e) {
      console.warn('[Launcher] Konnte installierte Version nicht abfragen:', e);
      installedVersion = null;
    }

    // 2. Query latest GitHub release
    try {
      latestReleaseInfo = await invoke('check_github_release');
      console.log('[Launcher] Neueste GitHub Release Info:', latestReleaseInfo);

      const latestTag = latestReleaseInfo.tag_name;

      if (!installedVersion) {
        setUIState('not-installed');
      } else if (isNewerVersion(installedVersion, latestTag)) {
        if (updateToast) {
          updateToast.innerText = `✨ Update verfügbar: ${latestTag}`;
          updateToast.classList.add('show');
        }
        setUIState('update-available');
      } else {
        setUIState('ready-to-play');
      }
    } catch (e) {
      console.warn('[Launcher] Offline oder Release-Abfrage fehlgeschlagen:', e);
      if (installedVersion) {
        setUIState('ready-to-play');
      } else {
        setUIState('not-installed');
      }
    }
  }

  // Initial Check
  setTimeout(() => {
    checkSystemAndUpdates();
  }, 300);
});
