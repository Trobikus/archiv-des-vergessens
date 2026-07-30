/**
 * ============================================================
 * FILE: server/modules/migration.js - Daten-Migration (JSON -> SQLite)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Migration alter JSON-Daten nach SQLite
 * - Leaderboard-Migration
 * - Spielstand-Migration
 * - Flag-Management für abgeschlossene Migrationen
 * ============================================================
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { getDatabase, getStatements } from './database.js';

// ---- KONSTANTEN ----
const DATA_DIR = process.env.DATA_DIR || './data';
const SAVES_DIR = join(DATA_DIR, 'saves');
const LEADERBOARD_FILE = join(DATA_DIR, 'leaderboard.json');
const MIGRATION_FLAG_FILE = join(DATA_DIR, 'migration_done.flag');

/**
 * Führt die automatische Migration von alten JSON-Daten durch
 */
export async function migrateOldJsonData() {
  try {
    // Flag-Prüfung: Falls bereits migriert wurde, unnötige I/O-Zugriffe sofort abbrechen
    const flagExists = await fs.access(MIGRATION_FLAG_FILE).then(() => true).catch(() => false);
    if (flagExists) {
      console.log('[Migration] Migration wurde bereits durchgeführt. Überspringe...');
      return;
    }

    const db = getDatabase();
    const stmts = getStatements();
    
    // 1. Leaderboard migrieren
    const leaderboardExists = await fs.access(LEADERBOARD_FILE).then(() => true).catch(() => false);
    if (leaderboardExists) {
      console.log('[Migration] Starte Leaderboard-Migration...');
      const rawLeaderboard = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
      const list = JSON.parse(rawLeaderboard);
      
      if (Array.isArray(list) && list.length > 0) {
        const insertStmt = stmts.upsertLeaderboard || db.prepare(`
          INSERT INTO leaderboard (userId, username, prestige, bosses, level, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(userId) DO UPDATE SET
            username = excluded.username,
            prestige = MAX(leaderboard.prestige, excluded.prestige),
            bosses = MAX(leaderboard.bosses, excluded.bosses),
            level = MAX(leaderboard.level, excluded.level),
            timestamp = excluded.timestamp
        `);

        const checkUserStmt = stmts.getUserById || db.prepare('SELECT id FROM users WHERE id = ?');
        const runTx = db.transaction((items) => {
          for (const item of items) {
            if (checkUserStmt.get(item.userId)) {
              insertStmt.run(
                item.userId,
                item.username,
                item.prestige || 0,
                item.bosses || 0,
                item.level || 1,
                item.timestamp || Date.now()
              );
            }
          }
        });
        runTx(list);
        console.log(`[Migration] ${list.length} Bestenlisten-Einträge erfolgreich migriert.`);
      }
      
      await fs.rename(LEADERBOARD_FILE, `${LEADERBOARD_FILE}.bak`);
      console.log(`[Migration] Alte Leaderboard-Datei umbenannt in ${basename(LEADERBOARD_FILE)}.bak`);
    }

    // 2. Spielstände migrieren
    const savesDirExists = await fs.access(SAVES_DIR).then(() => true).catch(() => false);
    if (savesDirExists) {
      const files = await fs.readdir(SAVES_DIR);
      const jsonFiles = files.filter(f => f.startsWith('save_') && f.endsWith('.json'));

      if (jsonFiles.length > 0) {
        console.log(`[Migration] Starte Migration von ${jsonFiles.length} Spielständen...`);
        const savesData = [];
        
        for (const file of jsonFiles) {
          try {
            const rawData = await fs.readFile(join(SAVES_DIR, file), 'utf-8');
            const parsed = JSON.parse(rawData);
            
            savesData.push({
              userId: parsed.userId || file.substring(5, file.length - 5),
              username: parsed.username || 'Spieler',
              saveData: typeof parsed.saveData === 'string' ? parsed.saveData : JSON.stringify(parsed.saveData),
              version: parsed.version || '1.6',
              timestamp: parsed.timestamp || Date.now()
            });
          } catch (err) {
            console.error(`[Migration] Fehler beim Lesen der Datei ${file}:`, err);
          }
        }

        if (savesData.length > 0) {
          const insertSaveStmt = stmts.upsertSave || db.prepare(`
            INSERT INTO saves (userId, username, saveData, version, timestamp)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(userId) DO UPDATE SET
              username = excluded.username,
              saveData = excluded.saveData,
              version = excluded.version,
              timestamp = excluded.timestamp
          `);

          const runSavesTx = db.transaction((items) => {
            for (const item of items) {
              insertSaveStmt.run(
                item.userId,
                item.username,
                item.saveData,
                item.version,
                item.timestamp
              );
            }
          });
          runSavesTx(savesData);
          console.log(`[Migration] ${savesData.length} Spielstände erfolgreich migriert.`);
        }
      }

      await fs.rename(SAVES_DIR, `${SAVES_DIR}.bak`);
      console.log(`[Migration] Alter saves-Ordner umbenannt in ${basename(SAVES_DIR)}.bak`);
    }

    // Flag-Datei erstellen, um zukünftige I/O-Prüfungen beim Serverstart zu vermeiden
    await fs.writeFile(MIGRATION_FLAG_FILE, new Date().toISOString(), 'utf-8');
    console.log('[Migration] Migration abgeschlossen und migration_done.flag erstellt.');
  } catch (err) {
    console.error('[Migration] Fehler während des Migrationsprozesses:', err);
  }
}
