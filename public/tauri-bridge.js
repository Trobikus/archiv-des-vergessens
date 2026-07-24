/**
 * ============================================================
 * FILE: public/tauri-bridge.js – Tauri to Electron Compatibility Bridge
 * ============================================================
 *
 * Implements the identical interface as Electron's preload.js (window.electronAPI)
 * but routes all commands and listeners to Tauri 2.0 APIs under the hood.
 *
 * This allows migrating from Electron to Tauri without modifying any frontend files.
 */

(function () {
  'use strict';

  // Check if we are running inside Tauri
  const isTauri = !!window.__TAURI__;

  if (!isTauri) {
    console.log('[Tauri Bridge] Tauri not detected. Skipping injection.');
    return;
  }

  console.log('[Tauri Bridge] Tauri environment detected. Injecting compatible electronAPI...');

  // Extract core Tauri functions defensively
  const tauriCore = window.__TAURI__ ? window.__TAURI__.core : null;
  const tauriEvent = window.__TAURI__ ? window.__TAURI__.event : null;
  // In Tauri 2.0, window management is exported as `webviewWindow` or `window`
  const tauriWindow = window.__TAURI__ ? (window.__TAURI__.webviewWindow || window.__TAURI__.window) : null;

  const invoke = tauriCore ? tauriCore.invoke : null;
  const currentWindow = tauriWindow
    ? (typeof tauriWindow.getCurrentWebviewWindow === 'function'
        ? tauriWindow.getCurrentWebviewWindow()
        : (typeof tauriWindow.getCurrentWindow === 'function' ? tauriWindow.getCurrentWindow() : null))
    : null;

  const updateListeners = {};
  let activeUpdate = null;

  // Global API exposed to the frontend
  window.electronAPI = {
    // --- App Info ---
    getVersion: async () => {
      if (window.__TAURI__ && window.__TAURI__.app && typeof window.__TAURI__.app.getVersion === 'function') {
        try {
          return await window.__TAURI__.app.getVersion();
        } catch (e) {
          // fallback
        }
      }
      return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : "1.8.0";
    },

    getResourcesPath: async () => {
      // Under Tauri, we don't need raw filesystem/asar paths to load background assets.
      // Slashes and asset loading are handled natively.
      return ".";
    },

    // --- Auto-Updater ---
    checkForUpdate: async () => {
      if (window.__TAURI__ && window.__TAURI__.updater) {
        try {
          const update = await window.__TAURI__.updater.check();
          if (update && update.available) {
            activeUpdate = update;
            if (typeof updateListeners['update:available'] === 'function') {
              updateListeners['update:available']({ version: update.version });
            }
            return { status: 'update-available', version: update.version };
          }
        } catch (e) {
          console.warn('[Tauri Bridge] Echtzeit-Update-Prüfung konnte nicht ausgeführt werden:', e);
        }
      }
      setTimeout(() => {
        if (typeof updateListeners['update:not-available'] === 'function') {
          updateListeners['update:not-available']();
        }
      }, 600);
      return { status: 'up-to-date' };
    },

    startDownload: async () => {
      if (activeUpdate) {
        try {
          let downloaded = 0;
          let contentLength = 0;
          let startTime = performance.now();

          await activeUpdate.downloadAndInstall((event) => {
            if (event.event === 'Started') {
              contentLength = event.data.contentLength || 0;
              downloaded = 0;
              startTime = performance.now();
            } else if (event.event === 'Progress') {
              downloaded += event.data.chunkLength;
              const now = performance.now();
              const elapsedSec = (now - startTime) / 1000;
              const speed = elapsedSec > 0 ? downloaded / elapsedSec : 0;
              const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
              if (typeof updateListeners['update:progress'] === 'function') {
                updateListeners['update:progress']({
                  percent,
                  downloaded,
                  total: contentLength,
                  downloadedBytes: downloaded,
                  totalBytes: contentLength,
                  speed
                });
              }
            }
          });
          if (typeof updateListeners['update:downloaded'] === 'function') {
            updateListeners['update:downloaded']({ version: activeUpdate.version });
          }
        } catch (e) {
          console.error('[Tauri Bridge] Fehler beim Herunterladen/Installieren des Updates:', e);
          if (typeof updateListeners['update:error'] === 'function') {
            updateListeners['update:error'](e);
          }
        }
      } else {
        console.log('[Tauri Bridge] startDownload aufgerufen ohne aktives Update');
      }
    },

    quitAndInstall: async () => {
      if (window.__TAURI__ && window.__TAURI__.process && typeof window.__TAURI__.process.relaunch === 'function') {
        await window.__TAURI__.process.relaunch();
      } else {
        invoke('quit_app');
      }
    },

    onUpdateEvent: (channel, callback) => {
      console.log(`[Tauri Bridge] Registered listener for update channel: ${channel}`);
      updateListeners[channel] = callback;
      // Return an unlisten function
      return () => {
        delete updateListeners[channel];
      };
    },

    // --- Launcher Control ---
    launchGame: () => {
      invoke('launch_game');
    },

    showMainWindow: () => {
      if (invoke) {
        invoke('show_main_window');
      } else if (currentWindow) {
        currentWindow.show();
      }
    },


    onGameLaunched: (callback) => {
      if (tauriEvent && typeof tauriEvent.listen === 'function') {
        let unlistenFn = null;
        tauriEvent.listen('launcher:game-launched', () => {
          callback();
        }).then(unlisten => {
          unlistenFn = unlisten;
        });

        return () => {
          if (unlistenFn) unlistenFn();
        };
      }
      return () => {};
    },

    minimizeLauncher: () => {
      if (currentWindow) {
        currentWindow.minimize();
      }
    },

    closeLauncher: () => {
      if (invoke) {
        invoke('close_launcher');
      } else if (currentWindow) {
        currentWindow.close();
      }
    },

    // --- Safe Quitting (Savegame protection) ---
    onQuitRequested: (callback) => {
      if (tauriEvent && typeof tauriEvent.listen === 'function') {
        let unlistenFn = null;
        tauriEvent.listen('app:quit-requested', () => {
          callback();
        }).then(unlisten => {
          unlistenFn = unlisten;
        });

        // Return a cleanup function
        return () => {
          if (unlistenFn) unlistenFn();
        };
      }
      return () => {};
    },

    sendQuitReady: () => {
      invoke('quit_app');
    }
  };

  // Fix background image loading automatically for Tauri and show window smoothly
  window.addEventListener('DOMContentLoaded', () => {
    const launcherContainer = document.querySelector('.launcher-container');
    const bgUrl = '/background.png';

    if (launcherContainer) {
      // Create a preload image object to load and decode the background image in the background
      const img = new Image();
      
      img.onload = () => {
        // Once the image is 100% loaded and cached, apply it to the container
        launcherContainer.style.backgroundImage = `url('${bgUrl}')`;
        console.log('[Tauri Bridge] Background image successfully loaded and cached.');

        // Show launcher window smoothly after a tiny timeout to ensure the browser has fully painted the layout
        setTimeout(() => {
          if (invoke) {
            invoke('show_launcher');
            console.log('[Tauri Bridge] show_launcher command invoked after image load.');
          } else if (currentWindow) {
            currentWindow.show();
          }
        }, 80);
      };

      img.onerror = (err) => {
        console.error('[Tauri Bridge] Failed to load background image:', err);
        // Fallback: show the window anyway so the launcher is not stuck hidden
        if (invoke) {
          invoke('show_launcher');
        } else if (currentWindow) {
          currentWindow.show();
        }
      };

      img.src = bgUrl;
    } else {
      // Fallback if launcher container is not found
      if (invoke) {
        invoke('show_launcher');
      } else if (currentWindow) {
        currentWindow.show();
      }
    }
  });

})();
