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

  // Global API exposed to the frontend
  window.electronAPI = {
    // --- App Info ---
    getVersion: async () => {
      // Return a clean fallback version matching our Cargo/package.json
      return "1.7.1";
    },

    getResourcesPath: async () => {
      // Under Tauri, we don't need raw filesystem/asar paths to load background assets.
      // Slashes and asset loading are handled natively.
      return ".";
    },

    // --- Auto-Updater ---
    checkForUpdate: async () => {
      // For now, we simulate updater in dev-mode or normal mode.
      // Can be connected to Tauri's built-in updater plugin later if desired.
      return { status: 'dev-mode' };
    },

    startDownload: () => {
      console.log('[Tauri Bridge] startDownload requested (no-op in bridge simulation)');
    },

    quitAndInstall: () => {
      console.log('[Tauri Bridge] quitAndInstall requested');
    },

    onUpdateEvent: (channel, callback) => {
      console.log(`[Tauri Bridge] Registered listener for update channel: ${channel}`);
      // Return a dummy unlisten function
      return () => {};
    },

    // --- Launcher Control ---
    launchGame: () => {
      invoke('launch_game');
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
