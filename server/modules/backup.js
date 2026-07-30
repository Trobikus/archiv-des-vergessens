/**
 * ============================================================
 * FILE: server/modules/backup.js - Auto-Backup & Recovery System
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Automatische Datenbank-Backups
 * - Backup-Rotation (alte Backups löschen)
 * - Recovery von Backups bei Korruption
 * - VACUUM-Scheduler für Datenbank-Optimierung
 * ============================================================
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { getDatabase, verifyDatabaseIntegrity } from './database.js';

// ---- KONSTANTEN ----
const DATA_DIR = process.env.DATA_DIR || './data';
const BACKUP_DIR = join(DATA_DIR, 'backups');
const DB_FILE = join(DATA_DIR, 'database.db');
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 Stunden
const MAX_BACKUPS = 7; // Behalte die letzten 7 Backups
const VACUUM_INTERVAL = 7 * 24 * 60 * 60 * 1000; // Wöchentlich

let backupIntervalId = null;
let vacuumIntervalId = null;

/**
 * Erstellt ein automatisches Datenbank-Backup
 */
export async function createDatabaseBackup() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(BACKUP_DIR, `database_${timestamp}.db`);
    
    const db = getDatabase();
    if (!db) {
      console.error('[Backup] Keine Datenbank verfügbar.');
      return;
    }
    
    // SQLite Online Backup API verwenden (sicherer als einfaches File-Copy)
    db.backup(backupFile)
      .then(() => {
        console.log(`[Backup] Datenbank-Backup erstellt: ${backupFile}`);
        cleanupOldBackups();
      })
      .catch(err => {
        console.error('[Backup] Fehler beim Erstellen:', err);
      });
      
  } catch (err) {
    console.error('[Backup] Fehler:', err);
  }
}

/**
 * Löscht alte Backups um Speicherplatz zu sparen
 */
export async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const dbBackups = files
      .filter(f => f.startsWith('database_') && f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (dbBackups.length > MAX_BACKUPS) {
      const filesToDelete = dbBackups.slice(MAX_BACKUPS);
      for (const file of filesToDelete) {
        await fs.unlink(join(BACKUP_DIR, file));
        console.log(`[Backup] Altes Backup gelöscht: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Backup] Fehler beim Aufräumen:', err);
  }
}

/**
 * Versucht die Datenbank von einem Backup wiederherzustellen
 * @returns {Promise<boolean>} True wenn Recovery erfolgreich war
 */
export async function attemptRecoveryFromBackup() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = files
      .filter(f => f.startsWith('database_') && f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      console.error('[Recovery] Keine Backups verfügbar!');
      return false;
    }
    
    const latestBackup = join(BACKUP_DIR, backups[0]);
    console.log(`[Recovery] Versuche Wiederherstellung von: ${latestBackup}`);
    
    // Backup kopieren
    await fs.copyFile(latestBackup, DB_FILE);
    
    if (verifyDatabaseIntegrity()) {
      console.log('[Recovery] Wiederherstellung erfolgreich ✓');
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('[Recovery] Fehler:', err);
    return false;
  }
}

/**
 * Startet den Backup-Scheduler (tägliches Backup)
 */
export function startBackupScheduler() {
  // Sofortiges Backup beim Start
  createDatabaseBackup();
  
  // Intervall für regelmäßige Backups
  backupIntervalId = setInterval(createDatabaseBackup, BACKUP_INTERVAL);
  console.log('[Backup] Scheduler gestartet (tägliches Backup).');
}

/**
 * Startet den VACUUM-Scheduler (wöchentliche Optimierung)
 */
export function startVacuumScheduler() {
  vacuumIntervalId = setInterval(() => {
    const db = getDatabase();
    if (!db) return;
    
    try {
      console.log('[Storage] Führe VACUUM durch...');
      db.exec('VACUUM');
      console.log('[Storage] VACUUM abgeschlossen ✓');
    } catch (err) {
      console.error('[Storage] VACUUM fehlgeschlagen:', err);
    }
  }, VACUUM_INTERVAL);
  
  console.log('[Storage] VACUUM-Scheduler gestartet (wöchentlich).');
}

/**
 * Stoppt alle Scheduler
 */
export function stopSchedulers() {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
  }
  if (vacuumIntervalId) {
    clearInterval(vacuumIntervalId);
    vacuumIntervalId = null;
  }
  console.log('[Backup] Scheduler gestoppt.');
}
