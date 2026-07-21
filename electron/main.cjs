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

// ---- Globale Fenster-Referenzen (verhindert GC) ----
let mainWindow = null;
let launcherWindow = null;
let forceQuit = false;

// ============================================================
// FENSTER ERSTELLEN
// ============================================================

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 1000,
    height: 400,
    resizable: false,
    maximizable: false,
    frame: false,
    transparent: true,
    icon: ICON_PATH,
    title: 'Archiv des Vergessens - Launcher',
    backgroundColor: '#00000000', // Transparent
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  launcherWindow.once('ready-to-show', () => {
    launcherWindow.show();
    // In Production starten wir den AutoUpdater nach dem Öffnen des Launchers
    if (!IS_DEV) {
      setTimeout(() => startAutoUpdater(), 1500);
    }
  });

  if (IS_DEV) {
    // In Dev laden wir launcher.html direkt aus dem public-Ordner als Datei.
    // Das verhindert ERR_CONNECTION_REFUSED-Fehler, falls der Vite-Server nicht läuft.
    launcherWindow.loadFile(path.join(__dirname, '..', 'public', 'launcher.html'));
  } else {
    launcherWindow.loadFile(path.join(__dirname, '..', 'dist', 'launcher.html'));
  }

  launcherWindow.on('closed', () => {
    launcherWindow = null;
  });
}

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
  });

  if (IS_DEV) {
    // In Dev versuchen wir den Vite-Dev-Server zu laden
    // Falls dieser nicht läuft (ERR_CONNECTION_REFUSED), laden wir als Ausweichlösung
    // die fertig gebaute index.html aus dem dist-Ordner.
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      console.warn('[Dev-Fallback] Vite-Server nicht aktiv. Lade dist/index.html...');
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).catch(err => {
        console.error('Konnte auch dist/index.html nicht laden. Hast du das Projekt gebaut? (npm run build)', err.message);
      });
    });
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

  mainWindow.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault();
      mainWindow.webContents.send('app:quit-requested');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// AUTO-UPDATER
// ============================================================

function startAutoUpdater() {
  autoUpdater.autoDownload = false; // Verhindert den automatischen Download im Hintergrund!
  
  // Da die App unter Windows oft unsigniert ist, schlägt die automatische Signaturprüfung fehl.
  // Wir überschreiben die Prüfung, damit das Update trotzdem erfolgreich installiert werden kann.
  autoUpdater.verifyUpdateCodeSignature = (publisherName, path) => {
    console.log('[AutoUpdater] Code-Signaturprüfung für unsignierte App übersprungen.');
    return Promise.resolve(null);
  };

  // Helfer, um Events an das aktive Fenster (Launcher oder Hauptspiel) zu senden
  function sendToActiveWindow(channel, data) {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.webContents.send(channel, data);
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }

  // Event-Listener zurücksetzen, um Dopplungen bei mehrfachem Aufruf zu vermeiden
  autoUpdater.removeAllListeners('update-available');
  autoUpdater.removeAllListeners('update-not-available');
  autoUpdater.removeAllListeners('download-progress');
  autoUpdater.removeAllListeners('update-downloaded');
  autoUpdater.removeAllListeners('error');

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update verfügbar:', info.version);
    sendToActiveWindow('update:available', { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Spiel ist aktuell.');
    sendToActiveWindow('update:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.setProgressBar(progress.percent / 100);
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
    
    sendToActiveWindow('update:progress', {
      percent,
      bytesPerSecond: Math.round(progress.bytesPerSecond / 1024),
      transferred: Math.round(progress.transferred / 1024 / 1024),
      total: Math.round(progress.total / 1024 / 1024)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update heruntergeladen:', info.version);
    
    if (launcherWindow && !launcherWindow.isDestroyed()) launcherWindow.setProgressBar(-1);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(-1);
    
    sendToActiveWindow('update:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Fehler:', err.message);
    
    if (launcherWindow && !launcherWindow.isDestroyed()) launcherWindow.setProgressBar(-1);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(-1);
    
    sendToActiveWindow('update:error', { message: err.message });
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.warn('[AutoUpdater] Prüfung fehlgeschlagen:', err.message);
  });
}

// ============================================================
// IPC-HANDLER & COMMANDS
// ============================================================

// --- Launcher Steuerung ---
ipcMain.on('launcher:launch-game', () => {
  console.log('[Launcher] Starte Hauptspiel...');
  createWindow();
  if (launcherWindow) {
    launcherWindow.close();
    launcherWindow = null;
  }
});

ipcMain.on('launcher:minimize', () => {
  launcherWindow?.minimize();
});

ipcMain.on('launcher:close', () => {
  app.quit();
});

ipcMain.on('app:quit-ready', () => {
  forceQuit = true;
  app.quit();
});

// --- Auto-Updater ---
ipcMain.on('updater:start-download', () => {
  console.log('[AutoUpdater] Download per User-Aktion gestartet');
  autoUpdater.downloadUpdate().catch(err => {
    console.error('[AutoUpdater] Download-Start fehlgeschlagen:', err.message);
  });
});

ipcMain.on('updater:quit-and-install', () => {
  console.log('[AutoUpdater] Neustart und Installation gestartet');
  
  forceQuit = true;
  app.removeAllListeners('window-all-closed');
  
  // Alle offenen Fenster zerstören, um eventuelle Dateisperren (File Locks) aufzuheben
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  });

  // setImmediate stellt sicher, dass alle Close-Operationen abgeschlossen sind
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
});

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

// Gibt den Pfad zu den extraResources zurück (background.png etc.)
// In Production: resources/ neben app.asar
// In Dev: Projekt-Root
ipcMain.handle('app:resources-path', () => {
  return IS_DEV
    ? path.join(__dirname, '..')
    : process.resourcesPath;
});

// ============================================================
// APP-LIFECYCLE
// ============================================================

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (launcherWindow) {
      if (launcherWindow.isMinimized()) launcherWindow.restore();
      launcherWindow.focus();
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createLauncherWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        if (!mainWindow && !launcherWindow) {
          createLauncherWindow();
        }
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
