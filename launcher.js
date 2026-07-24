import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';

/* ============================================================
   LAUNCHER.JS - AAA Native Tauri Launcher
   ============================================================ */

/**
 * Parse a version string (e.g. "1.0.13" or "v1.0.13") into numerical components.
 */
function parseVersion(v) {
  return (v || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
}

/**
 * Compare two SemVer strings to check if latestVer is newer than currentVer.
 */
function isNewerVersion(currentVer, latestVer) {
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
  console.log('[Launcher] Initialisiere native Tauri-Interaktionslogik...');

  // DOM Elemente abrufen
  const actionBtn = document.getElementById('action-btn');
  const closeBtn = document.getElementById('close-btn');
  const progressContainer = document.getElementById('progress-container');
  const particlesContainer = document.getElementById('particles-container');
  const launcherContainer = document.querySelector('.launcher-container');
  const updateToast = document.getElementById('update-toast');
  const versionIndicator = document.getElementById('version-indicator');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');
  const offlineBtn = document.getElementById('offline-btn');

  let updateState = 'checking';
  let latestReleaseUrl = 'https://github.com/Trobikus/archiv-des-vergessens/releases/latest';

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
      versionIndicator.innerText = `Version v${appVersion}`;
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

  // 2. Partikel-System (Dynamisches Spawnen von goldenen Glühwürmchen)
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

    if (state === 'error') {
      actionBtn.style.display = 'none';
      progressContainer.style.display = 'none';
      if (errorContainer) {
        errorContainer.style.display = 'flex';
        if (errorMessage) {
          errorMessage.innerText = text || 'Update-Prüfung fehlgeschlagen.';
        }
      }
    } else {
      progressContainer.style.display = 'none';
      if (errorContainer) errorContainer.style.display = 'none';
      actionBtn.style.display = 'inline-block';
      actionBtn.disabled = false;

      switch (state) {
        case 'checking':
          actionBtn.disabled = true;
          actionBtn.innerText = 'PRÜFE UPDATES...';
          break;
        case 'update-available':
          actionBtn.innerText = 'UPDATE AUF GITHUB';
          break;
        case 'ready-to-play':
          actionBtn.innerText = 'PLAY ADVENTURE';
          break;
      }
    }

    if (versionIndicator) {
      versionIndicator.classList.add('show');
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
      if (updateState === 'update-available') {
        console.log('[Launcher] Öffne GitHub Release-Seite:', latestReleaseUrl);
        try {
          await invoke('open_release_page', { url: latestReleaseUrl });
        } catch (e) {
          window.open(latestReleaseUrl, '_blank');
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

  // 5. Portable Release Update-Prüfung via GitHub API
  async function performUpdateCheck() {
    setUIState('checking');
    try {
      const appVersion = await getVersion();
      const response = await fetch('https://api.github.com/repos/Trobikus/archiv-des-vergessens/releases/latest', {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (response.ok) {
        const releaseData = await response.json();
        const latestTag = releaseData.tag_name || releaseData.name;
        if (releaseData.html_url) {
          latestReleaseUrl = releaseData.html_url;
        }

        if (latestTag && isNewerVersion(appVersion, latestTag)) {
          console.log(`[Launcher] Neue Version ${latestTag} auf GitHub verfügbar! (Aktuell: v${appVersion})`);
          if (updateToast) {
            updateToast.innerText = `✨ Neue Version ${latestTag} auf GitHub verfügbar!`;
            updateToast.classList.add('show');
          }
          setUIState('update-available');
          return;
        }
      }
      console.log('[Launcher] Spiel ist auf dem neuesten Stand.');
      setUIState('ready-to-play');
    } catch (err) {
      console.warn('[Launcher] Update-Prüfung fehlgeschlagen / offline. Spiel freigegeben:', err);
      setUIState('ready-to-play');
    }
  }

  // Verzögerter Start für ein flüssiges Gefühl beim Öffnen
  setTimeout(() => {
    performUpdateCheck();
  }, 800);

});
