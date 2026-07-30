/**
 * ============================================================
 * FILE: server/modules/leaderboard.js - Leaderboard-System
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Top 10 Bestenliste abrufen
 * - Highscores speichern mit Plausibilitätsprüfung
 * - Leaderboard-Updates broadcasten
 * ============================================================
 */

import { getDatabase, getStatements } from './database.js';
import { broadcast } from './utils.js';

// Maximale Werte für Plausibilitätsprüfung
const MAX_PRESTIGE = 99999;
const MAX_BOSSES = 999999;
const MAX_LEVEL = 100000;

/**
 * Ruft die Top 10 der Bestenliste ab
 * @returns {Array} Top 10 Spieler
 */
export function getTop10() {
  const db = getDatabase();
  const stmts = getStatements();
  
  try {
    if (stmts.getLeaderboardTop) {
      return stmts.getLeaderboardTop.all(10);
    }
    return db.prepare(`
      SELECT l.userId, l.username, l.prestige, l.bosses, l.level, l.timestamp
      FROM leaderboard l
      INNER JOIN users u ON l.userId = u.id
      ORDER BY l.prestige DESC, l.bosses DESC, l.level DESC
      LIMIT 10
    `).all();
  } catch (err) {
    console.error('[Database] Fehler beim Abrufen der Top 10:', err);
    return [];
  }
}

/**
 * Speichert einen Highscore mit Plausibilitätsprüfung
 * @param {string} userId - User-ID
 * @param {string} username - Username
 * @param {number} prestige - Prestige-Wert
 * @param {number} bosses - Besiegte Bosse
 * @param {number} level - Spieler-Level
 * @returns {boolean} True wenn erfolgreich gespeichert
 */
export function submitHighscore(userId, username, prestige, bosses, level) {
  const db = getDatabase();
  const stmts = getStatements();
  
  // Werte begrenzen
  const safePrestige = Math.min(MAX_PRESTIGE, Math.max(0, parseInt(prestige) || 0));
  const safeBosses = Math.min(MAX_BOSSES, Math.max(0, parseInt(bosses) || 0));
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, parseInt(level) || 1));
  const timestamp = Date.now();
  
  // Plausibilitätsprüfung
  const existing = stmts.getLeaderboardUser 
    ? stmts.getLeaderboardUser.get(userId) 
    : db.prepare('SELECT prestige, bosses, level FROM leaderboard WHERE userId = ?').get(userId);
    
  if (existing) {
    // Prüfung auf unrealistische Sprünge
    if (safePrestige > existing.prestige + 50 || 
        safeBosses > existing.bosses + 200 || 
        safeLevel > existing.level + 1000) {
      console.warn(
        `[Security] Plausibilitätsprüfung fehlgeschlagen für Benutzer ${userId}: ` +
        `Prestige ${safePrestige} (vorher ${existing.prestige}), ` +
        `Bosses ${safeBosses} (vorher ${existing.bosses}), ` +
        `Level ${safeLevel} (vorher ${existing.level})`
      );
      return false;
    }
  } else {
    // Erstübertragung ohne Spielstand prüfen
    if (safePrestige > 50 || safeBosses > 200 || safeLevel > 1000) {
      const saveRow = stmts.getSave 
        ? stmts.getSave.get(userId) 
        : db.prepare('SELECT saveData FROM saves WHERE userId = ?').get(userId);
        
      if (!saveRow) {
        console.warn(`[Security] Erstübertragung ohne Speicherstand verweigert für Benutzer ${userId}`);
        return false;
      }
    }
  }
  
  // Eintrag speichern/updaten
  try {
    if (stmts.upsertLeaderboard) {
      stmts.upsertLeaderboard.run(userId, username, safePrestige, safeBosses, safeLevel, timestamp);
    } else {
      db.prepare(`
        INSERT INTO leaderboard (userId, username, prestige, bosses, level, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET
          username = excluded.username,
          prestige = MAX(leaderboard.prestige, excluded.prestige),
          bosses = MAX(leaderboard.bosses, excluded.bosses),
          level = MAX(leaderboard.level, excluded.level),
          timestamp = CASE 
            WHEN excluded.prestige > leaderboard.prestige 
                 OR excluded.bosses > leaderboard.bosses 
                 OR excluded.level > leaderboard.level 
            THEN excluded.timestamp 
            ELSE leaderboard.timestamp 
          END
      `).run(userId, username, safePrestige, safeBosses, safeLevel, timestamp);
    }
    
    console.log(`[Leaderboard] Highscore in SQLite aktualisiert für ${username}`);
    return true;
  } catch (err) {
    console.error('[Leaderboard] Fehler beim Aktualisieren des Highscores:', err);
    return false;
  }
}

/**
 * Broadcastet ein Leaderboard-Update an alle Clients
 * @param {Map} clients - WebSocket-Client-Map
 */
export function broadcastLeaderboardUpdate(clients) {
  const top10 = getTop10();
  broadcast(clients, 'leaderboard:update', top10);
}

/**
 * Prüft ob ein User registriert ist (für Leaderboard-Zulassung)
 * @param {string} userId - User-ID
 * @returns {boolean} True wenn registriert
 */
export function isRegisteredUser(userId) {
  const db = getDatabase();
  const stmts = getStatements();
  
  const user = stmts.getUserById 
    ? stmts.getUserById.get(userId) 
    : db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    
  return !!user;
}
