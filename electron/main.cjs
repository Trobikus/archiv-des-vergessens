/**
 * ============================================================
 * FILE: electron/main.cjs – Electron Hauptprozess (CommonJS)
 * ============================================================
 */

'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// ---- Konstanten ----
const IS_DEV = process.env.NODE_ENV === 'development';
const ICON_PATH = path.join(__dirname, '..', 'icon.ico');

// ---- Logging für den Updater ----
autoUpdater.logger = {
  info:  (msg) => console.log('[AutoUpdater] INFO:', msg),
  warn:  (msg) => console.warn('[AutoUpdater] WARN:', msg),
  error: (msg) => console.error('[AutoUpdater] ERROR:', msg),
  debug: (msg) => { /* debug stumm im Production */ }
};

// ---- Globale Fenster-Referenz (verhindert GC) ----
let mainWindow = null;

// ============================================================
// FENSTER ERSTELLEN
// ============================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: !IS_DEV,         // Im Production direkt Vollbild
    autoHideMenuBar: true,
    icon: ICON_PATH,             // Desktop-Verknüpfungs-Icon
    title: 'Archiv des Vergessens',
    backgroundColor: '#050507',  // Verhindert weißes Aufblitzen beim Laden
    show: false,                 // Erst zeigen wenn geladen (vermeidet Flicker)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!IS_DEV) {
      setTimeout(() => startAutoUpdater(), 3000);
    }
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
    if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
    if (input.control && input.key.toLowerCase() === 'q') {
      app.quit();
    }
    if (IS_DEV && input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// AUTO-UPDATER
// ============================================================

function startAutoUpdater() {
  if (!mainWindow) return;

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update verfügbar:', info.version);
    mainWindow?.webContents.send('update:available', { version: info.version });

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '🔄 Update verfügbar',
      message: `Version ${info.version} ist verfügbar!`,
      detail: 'Das Update wird jetzt im Hintergrund heruntergeladen.\nDas Spiel läuft währenddessen normal weiter.',
      buttons: ['OK'],
      icon: ICON_PATH
    });

    autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Spiel ist aktuell.');
    mainWindow?.webContents.send('update:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    mainWindow?.setProgressBar(progress.percent / 100);
    mainWindow?.webContents.send('update:progress', {
      percent,
      bytesPerSecond: Math.round(progress.bytesPerSecond / 1024),
      transferred: Math.round(progress.transferred / 1024 / 1024),
      total: Math.round(progress.total / 1024 / 1024)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update heruntergeladen:', info.version);
    mainWindow?.setProgressBar(-1);
    mainWindow?.webContents.send('update:downloaded', { version: info.version });

    dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '✅ Update bereit',
      message: `Version ${info.version} wurde heruntergeladen.`,
      detail: 'Möchtest du das Spiel jetzt neu starten, um das Update zu installieren?\nDein Spielstand wird dabei nicht gelöscht.',
      buttons: ['Jetzt neu starten', 'Später'],
      defaultId: 0,
      cancelId: 1,
      icon: ICON_PATH
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Fehler:', err.message);
    mainWindow?.setProgressBar(-1);
    mainWindow?.webContents.send('update:error', { message: err.message });

    const isNetworkError = err.message.includes('net::') || err.message.includes('ENOTFOUND');
    if (!isNetworkError) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update-Fehler',
        message: 'Das automatische Update konnte nicht durchgeführt werden.',
        detail: err.message,
        buttons: ['OK']
      });
    }
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.warn('[AutoUpdater] Prüfung fehlgeschlagen:', err.message);
  });
}

// ============================================================
// IPC-HANDLER
// ============================================================

ipcMain.handle('updater:check', async () => {
  if (IS_DEV) return { status: 'dev-mode' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'ok', version: result?.updateInfo?.version };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
});

ipcMain.handle('app:version', () => app.getVersion());

// ============================================================
// APP-LIFECYCLE
// ============================================================

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
