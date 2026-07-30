/**
 * ============================================================
 * FILE: server/modules/cloudsave.js - Cloud-Save-System
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Spielstände speichern
 * - Spielstände laden
 * - Validierung der Save-Daten
 * ============================================================
 */

import { getDatabase, getStatements } from './database.js';

// Maximale Größe für Spielstände (2 MB)
const MAX_SAVE_SIZE = 2_000_000;

/**
 * Speichert einen Spielstand
 * @param {string} userId - User-ID
 * @param {string} username - Username
 * @param {any} saveData - Die Spieldaten
 * @param {string} version - Spielversion
 * @returns {{success: boolean, timestamp?: number, error?: string}}
 */
export function saveGame(userId, username, saveData, version = '1.6') {
  const db = getDatabase();
  const stmts = getStatements();
  
  if (!saveData || saveData === undefined || saveData === null) {
    return { success: false, error: 'Ungültige oder leere Speicherdaten.' };
  }
  
  // Serialisieren wenn nötig
  const saveDataStr = typeof saveData === 'string' ? saveData : JSON.stringify(saveData);
  
  if (!saveDataStr) {
    return { success: false, error: 'Fehler beim Serialisieren des Spielstands.' };
  }
  
  // Größenprüfung
  if (saveDataStr.length > MAX_SAVE_SIZE) {
    return { success: false, error: 'Speicherstand zu groß.' };
  }
  
  const timestamp = Date.now();
  
  try {
    if (stmts.upsertSave) {
      stmts.upsertSave.run(userId, username, saveDataStr, version, timestamp);
    } else {
      db.prepare(`
        INSERT INTO saves (userId, username, saveData, version, timestamp)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET
          username = excluded.username,
          saveData = excluded.saveData,
          version = excluded.version,
          timestamp = excluded.timestamp
      `).run(userId, username, saveDataStr, version, timestamp);
    }
    
    console.log(`[CloudSave] Spielstand für ${username} in SQLite gespeichert.`);
    return { success: true, timestamp };
  } catch (err) {
    console.error('[CloudSave] Fehler beim Speichern in SQLite:', err);
    return { success: false, error: 'Fehler beim Schreiben des Spielstands.' };
  }
}

/**
 * Lädt einen Spielstand
 * @param {string} userId - User-ID
 * @returns {{success: boolean, data?: Object|null, error?: string}}
 */
export function loadGame(userId) {
  const db = getDatabase();
  const stmts = getStatements();
  
  try {
    const row = stmts.getSave 
      ? stmts.getSave.get(userId) 
      : db.prepare('SELECT saveData, version, timestamp FROM saves WHERE userId = ?').get(userId);
    
    if (row) {
      const fileData = {
        userId,
        timestamp: row.timestamp,
        saveData: JSON.parse(row.saveData),
        version: row.version
      };
      console.log(`[CloudSave] Spielstand aus SQLite geladen.`);
      return { success: true, data: fileData };
    } else {
      return { success: true, data: null };
    }
  } catch (err) {
    console.error('[CloudSave] Fehler beim Laden aus SQLite:', err);
    return { success: false, error: 'Fehler beim Lesen des Spielstands.' };
  }
}

/**
 * Prüft ob ein Spielstand für einen User existiert
 * @param {string} userId - User-ID
 * @returns {boolean} True wenn vorhanden
 */
export function hasSaveGame(userId) {
  const db = getDatabase();
  const stmts = getStatements();
  
  const row = stmts.getSave 
    ? stmts.getSave.get(userId) 
    : db.prepare('SELECT id FROM saves WHERE userId = ? LIMIT 1').get(userId);
    
  return !!row;
}
