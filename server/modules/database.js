/**
 * ============================================================
 * FILE: server/modules/database.js - Datenbank-Initialisierung & Management
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - SQLite Initialisierung und Konfiguration
 * - Tabellen-Erstellung
 * - Prepared Statements kompilieren
 * - Datenbank-Integritätsprüfungen
 * ============================================================
 */

import Database from 'better-sqlite3';
import { join } from 'path';

// ---- KONSTANTEN ----
const DB_FILE = join(process.env.DATA_DIR || './data', 'database.db');

let db = null;
let stmts = {};

/**
 * Initialisiert die SQLite-Datenbank mit allen Tabellen
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    // SQLite initialisieren
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    // Tabellen anlegen
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE COLLATE NOCASE NOT NULL,
        email TEXT UNIQUE COLLATE NOCASE NOT NULL,
        passwordHash TEXT NOT NULL,
        salt TEXT NOT NULL,
        avatar TEXT,
        createdAt INTEGER,
        lastLogin INTEGER,
        sessionToken TEXT
      )
    `).run();

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(username COLLATE NOCASE)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(email COLLATE NOCASE)`).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS saves (
        userId TEXT PRIMARY KEY,
        username TEXT,
        saveData TEXT,
        version TEXT,
        timestamp INTEGER
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        userId TEXT PRIMARY KEY,
        username TEXT,
        prestige INTEGER,
        bosses INTEGER,
        level INTEGER,
        timestamp INTEGER
      )
    `).run();

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(prestige DESC, bosses DESC, level DESC)`).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        player TEXT,
        message TEXT,
        timestamp INTEGER,
        type TEXT,
        guildId TEXT
      )
    `).run();

    try {
      db.prepare(`ALTER TABLE chats ADD COLUMN guildId TEXT`).run();
    } catch (_) {}

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_chats_type_timestamp ON chats(type, timestamp DESC)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_chats_guild_timestamp ON chats(type, guildId, timestamp DESC)`).run();

    console.log('[Storage] SQLite-Datenbank erfolgreich initialisiert.');
    
    // Prepared Statements kompilieren
    initPreparedStatements();
    
    return db;
  } catch (err) {
    console.error('[Storage] Fehler bei der Initialisierung:', err);
    throw err;
  }
}

/**
 * Kompiliert alle Prepared Statements für performante Datenbankzugriffe
 */
export function initPreparedStatements() {
  if (!db) return;
  try {
    stmts = {
      checkUsername: db.prepare('SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1'),
      checkEmail: db.prepare('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1'),
      insertUser: db.prepare('INSERT INTO users (id, username, email, passwordHash, salt, createdAt, lastLogin) VALUES (?, ?, ?, ?, ?, ?, ?)'),
      getUserByUsername: db.prepare('SELECT * FROM users WHERE LOWER(username) = ?'),
      getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
      updateLastLogin: db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?'),
      updateSessionToken: db.prepare('UPDATE users SET sessionToken = ? WHERE id = ?'),
      getSave: db.prepare('SELECT saveData, version, timestamp FROM saves WHERE userId = ?'),
      upsertSave: db.prepare(`
        INSERT INTO saves (userId, username, saveData, version, timestamp)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET
          username = excluded.username,
          saveData = excluded.saveData,
          version = excluded.version,
          timestamp = excluded.timestamp
      `),
      getLeaderboardUser: db.prepare('SELECT prestige, bosses, level FROM leaderboard WHERE userId = ?'),
      getLeaderboardTop: db.prepare('SELECT l.userId, l.username, l.prestige, l.bosses, l.level, l.timestamp FROM leaderboard l INNER JOIN users u ON l.userId = u.id ORDER BY l.prestige DESC, l.bosses DESC, l.level DESC LIMIT ?'),
      upsertLeaderboard: db.prepare(`
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
      `),
      insertChat: db.prepare('INSERT INTO chats (id, player, message, timestamp, type, guildId) VALUES (?, ?, ?, ?, ?, ?)'),
      getGlobalChatHistory: db.prepare("SELECT id, player, message, timestamp, type FROM chats WHERE type = 'global' ORDER BY timestamp DESC LIMIT ?"),
      getGuildChatHistory: db.prepare("SELECT id, player, message, timestamp, type, guildId FROM chats WHERE type = 'guild' AND guildId = ? ORDER BY timestamp DESC LIMIT ?"),
      pruneChats: db.prepare('DELETE FROM chats WHERE id NOT IN (SELECT id FROM chats ORDER BY timestamp DESC LIMIT ?)')
    };
    console.log('[Storage] Prepared Statements erfolgreich kompiliert.');
  } catch (err) {
    console.error('[Storage] Fehler beim Erstellen der Prepared Statements:', err);
  }
}

/**
 * Überprüft die Integrität der Datenbank
 * @returns {boolean} True wenn Datenbank integre ist
 */
export function verifyDatabaseIntegrity() {
  try {
    const result = db.pragma('integrity_check');
    if (result[0]?.integrity_check === 'ok') {
      console.log('[Storage] Datenbank-Integrität OK ✓');
      return true;
    } else {
      console.error('[Storage] Datenbank korrupt!', result);
      return false;
    }
  } catch (err) {
    console.error('[Storage] Integritätsprüfung fehlgeschlagen:', err);
    return false;
  }
}

/**
 * Gibt die Datenbank-Instanz zurück
 * @returns {Database|null}
 */
export function getDatabase() {
  return db;
}

/**
 * Gibt alle Prepared Statements zurück
 * @returns {Object}
 */
export function getStatements() {
  return stmts;
}

/**
 * Schließt die Datenbankverbindung
 */
export function closeDatabase() {
  if (db) {
    db.close();
    console.log('[Storage] SQLite-Datenbank geschlossen.');
    db = null;
    stmts = {};
  }
}
