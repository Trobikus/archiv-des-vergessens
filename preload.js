/**
 * ============================================================
 * FILE: preload.js – Electron Preload / Kontext-Brücke
 * ============================================================
 *
 * Läuft in einem privilegierten Kontext zwischen Main und Renderer.
 * Stellt dem Renderer-Prozess eine sichere, eingeschränkte API bereit.
 *
 * Sicherheit: contextIsolation=true + sandbox=true bleiben aktiv.
 * Nur explizit freigegebene Funktionen sind für das Spiel sichtbar.
 * ============================================================
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ---- API-Bridge: Main → Renderer (eingehende Events) ----
const validUpdateChannels = [
  'update:available',
  'update:not-available',
  'update:progress',
  'update:downloaded',
  'update:error'
];

contextBridge.exposeInMainWorld('electronAPI', {
  // --- App-Info ---
  /** @returns {Promise<string>} Aktuelle App-Version */
  getVersion: () => ipcRenderer.invoke('app:version'),

  /** @returns {Promise<string>} Pfad zu den extraResources (background.png etc.) */
  getResourcesPath: () => ipcRenderer.invoke('app:resources-path'),

  // --- Auto-Updater ---
  /** Manuell nach Updates suchen (z.B. aus einem Einstellungsmenü) */
  checkForUpdate: () => ipcRenderer.invoke('updater:check'),

  /** Startet den Download des Updates */
  startDownload: () => ipcRenderer.send('updater:start-download'),

  /** Beendet die App und installiert das heruntergeladene Update */
  quitAndInstall: () => ipcRenderer.send('updater:quit-and-install'),

  /**
   * Auf Update-Events lauschen.
   * @param {'update:available'|'update:not-available'|'update:progress'|'update:downloaded'|'update:error'} channel
   * @param {Function} callback
   * @returns {Function} cleanup – Aufruf entfernt den Listener wieder
   */
  onUpdateEvent: (channel, callback) => {
    if (!validUpdateChannels.includes(channel)) {
      console.warn('[Preload] Ungültiger Kanal:', channel);
      return () => {};
    }
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    // Gibt eine Cleanup-Funktion zurück
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // --- Launcher-Steuerung ---
  /** Startet das Hauptspiel und schließt den Launcher */
  launchGame: () => ipcRenderer.send('launcher:launch-game'),

  /** Minimiert das Launcher-Fenster */
  minimizeLauncher: () => ipcRenderer.send('launcher:minimize'),

  /** Schließt den Launcher (und damit die App) */
  closeLauncher: () => ipcRenderer.send('launcher:close'),

  // --- Sicheres Beenden (Savegame-Schutz) ---
  /** Signalisiert dem Renderer, dass das Fenster geschlossen werden soll */
  onQuitRequested: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:quit-requested', handler);
    return () => ipcRenderer.removeListener('app:quit-requested', handler);
  },

  /** Meldet dem Hauptprozess, dass das Speichern abgeschlossen ist und beendet werden kann */
  sendQuitReady: () => ipcRenderer.send('app:quit-ready')
});

// ---- Konsolenausgabe bei erfolgreichem Laden ----
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Electron Preload] Sicherer Kontext geladen. electronAPI verfügbar:', typeof window.electronAPI !== 'undefined');
});
