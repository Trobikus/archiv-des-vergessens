/**
 * ============================================================
 * FILE: server/server.js – Multiplayer Backend Server (WebSockets)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Echtes Echtzeit-Broadcasting von Globalen & Gilden-Chats
 * - Speicherung und Auslieferung von Globalen Bestenlisten (Leaderboard)
 * - Produktionsreife Benutzer-Authentifizierung (Register, Login, Token, Guest Conversion)
 * - Sicheres Speichern & Laden von Spielständen in SQLite (Cloud Saves)
 * - Extrem ressourcensparend (perfekt für 1 GB RAM e2-micro VMs)
 * ============================================================
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- KONSTANTEN & CONFIG ----
const PORT = process.env.PORT || 8080;
const DATA_DIR = join(__dirname, 'data');
const SAVES_DIR = join(DATA_DIR, 'saves');
const LEADERBOARD_FILE = join(DATA_DIR, 'leaderboard.json');
const DB_FILE = join(DATA_DIR, 'database.db');
const MIGRATION_FLAG_FILE = join(DATA_DIR, 'migration_done.flag');

// ========== AUTO-BACKUP SYSTEM ==========
const BACKUP_DIR = join(DATA_DIR, 'backups');
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 Stunden
const MAX_BACKUPS = 7; // Behalte die letzten 7 Backups

// Sicherheits- & Validierungskonstanten
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const MAX_PASSWORD_LENGTH = 128;

// ---- GLOBALE STATS & DATABASE ----
const clients = new Map(); // Map: WebSocket -> { userId, username, sessionToken }
let db;

// ============================================================
// AUTO-BACKUP & DATENBANK-INTEGRITÄT
// ============================================================
async function createDatabaseBackup() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(BACKUP_DIR, `database_${timestamp}.db`);
    
    // SQLite Online Backup API verwenden (sicherer als einfaches File-Copy)
    db.backup(backupFile)
      .then(() => {
        console.log(`[Backup] Datenbank-Backup erstellt: ${backupFile}`);
        
        // Alte Backups aufräumen
        cleanupOldBackups();
      })
      .catch(err => {
        console.error('[Backup] Fehler beim Erstellen:', err);
      });
      
  } catch (err) {
    console.error('[Backup] Fehler:', err);
  }
}

async function cleanupOldBackups() {
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

// Integrity Check beim Server-Start
function verifyDatabaseIntegrity() {
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

// Periodisches VACUUM (optimiert Datenbank)
function scheduleVacuum() {
  const VACUUM_INTERVAL = 7 * 24 * 60 * 60 * 1000; // Wöchentlich
  
  setInterval(() => {
    try {
      console.log('[Storage] Führe VACUUM durch...');
      db.exec('VACUUM');
      console.log('[Storage] VACUUM abgeschlossen ✓');
    } catch (err) {
      console.error('[Storage] VACUUM fehlgeschlagen:', err);
    }
  }, VACUUM_INTERVAL);
}

async function attemptRecoveryFromBackup() {
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
    
    // DB neu laden
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    
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

// ============================================================
// DATEN-VERZEICHNISSE & SQLITE INITIALISIEREN
// ============================================================
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    // SQLite initialisieren
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL'); // Balance zwischen Sicherheit und Performance
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
    initPreparedStatements();

    // Integritätsprüfung
    if (!verifyDatabaseIntegrity()) {
      console.warn('[Storage] Versuche Recovery von letztem Backup...');
      await attemptRecoveryFromBackup();
    }

    // Migration
    await migrateOldJsonData();

    // Backup-Scheduler starten
    createDatabaseBackup(); // Sofortiges Backup
    setInterval(createDatabaseBackup, BACKUP_INTERVAL);

    // VACUUM-Scheduler starten
    scheduleVacuum();

  } catch (err) {
    console.error('[Storage] Fehler bei der Initialisierung:', err);
  }
}

// ============================================================
// KRYPTOGRAFIE & PASSWORD HASHING
// ============================================================
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  const safePassword = typeof password === 'string' ? password.substring(0, MAX_PASSWORD_LENGTH) : '';
  const safeSalt = typeof salt === 'string' ? salt : '';
  return crypto.pbkdf2Sync(safePassword, safeSalt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  if (typeof password !== 'string' || typeof salt !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  const computedHash = hashPassword(password, salt);
  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateToken() {
  return 'tok_' + crypto.randomBytes(24).toString('hex');
}

// ============================================================
// AUTOMATISCHE DATENMIGRATION (JSON -> SQLITE)
// ============================================================
async function migrateOldJsonData() {
  try {
    // Flag-Prüfung: Falls bereits migriert wurde, unnötige I/O-Zugriffe sofort abbrechen
    const flagExists = await fs.access(MIGRATION_FLAG_FILE).then(() => true).catch(() => false);
    if (flagExists) {
      return;
    }

    // 1. Leaderboard migrieren
    const leaderboardExists = await fs.access(LEADERBOARD_FILE).then(() => true).catch(() => false);
    if (leaderboardExists) {
      console.log('[Migration] Starte Leaderboard-Migration...');
      const rawLeaderboard = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
      const list = JSON.parse(rawLeaderboard);
      
      if (Array.isArray(list) && list.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO leaderboard (userId, username, prestige, bosses, level, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(userId) DO UPDATE SET
            username = excluded.username,
            prestige = MAX(leaderboard.prestige, excluded.prestige),
            bosses = MAX(leaderboard.bosses, excluded.bosses),
            level = MAX(leaderboard.level, excluded.level),
            timestamp = excluded.timestamp
        `);

        const checkUserStmt = db.prepare('SELECT id FROM users WHERE id = ?');
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
          const insertSaveStmt = db.prepare(`
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

// Hilfsfunktion: Holt die Top 10 Bestenliste aus SQLite (nur registrierte Benutzer)
function getTop10() {
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

// Holt den globalen Chatverlauf aus SQLite
function getGlobalChatHistory(limit = 50) {
  try {
    return db.prepare(`
      SELECT id, player, message, timestamp, type
      FROM chats
      WHERE type = 'global'
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit).reverse();
  } catch (err) {
    console.error('[Chat] Fehler beim Laden des globalen Chatverlaufs:', err);
    return [];
  }
}

// Holt den Gilden-Chatverlauf aus SQLite
// Sendet den gespeicherten Chatverlauf (Global) an eine Verbindung
function sendChatHistory(ws) {
  const globalHistory = getGlobalChatHistory(50);
  for (const msg of globalHistory) {
    send(ws, 'chat:globalMessage', msg);
  }
}

// Hält die Chat-Datenbank klein und performant
let chatMessageCounter = 0;
function pruneChatHistory(keepCount = 500) {
  chatMessageCounter++;
  if (chatMessageCounter % 25 !== 0) return; // Nur alle 25 Nachrichten ausführen
  try {
    db.prepare(`
      DELETE FROM chats
      WHERE id NOT IN (
        SELECT id FROM chats
        ORDER BY timestamp DESC
        LIMIT ?
      )
    `).run(keepCount);
  } catch (err) {
    console.error('[Chat] Fehler beim Bereinigen des Chatverlaufs:', err);
  }
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function send(ws, type, payload) {
  if (ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  for (const [ws] of clients) {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}



function sanitize(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .substring(0, maxLength);
}

// ========== NEU: Duplikat-Prüfungs-Helper ==========
const USERNAME_BLACKLIST = [
  'admin', 'administrator', 'system', 'root', 'moderator', 'mod',
  'support', 'help', 'info', 'test', 'null', 'undefined', 'user',
  'guest', 'bot', 'server', 'official', 'archive', 'vergessen'
];

function validateEmailFormat(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length >= 6 && email.length <= 254;
}

let stmts = {};

function initPreparedStatements() {
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

function checkUsernameSimilarity(newUsername, database) {
  const normalized = newUsername.toLowerCase();
  
  // Blacklist-Check
  if (USERNAME_BLACKLIST.includes(normalized)) {
    return { isDuplicate: true, reason: 'auth.error.username_blacklisted' };
  }
  
  // O(1) Wiederverwendung vorbereitetes Statement
  const existingUser = stmts.checkUsername ? stmts.checkUsername.get(normalized) : (database || db).prepare('SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1').get(normalized);
  
  if (existingUser) {
    return { isDuplicate: true, reason: 'auth.error.username_taken' };
  }
  
  return { isDuplicate: false };
}

// Rate Limiting Map (IP -> {count, resetTime})
const rateLimitMap = new Map();
const MAX_RATE_LIMIT_ENTRIES = 10000;

// Verhindert Memory-Leak: Alle 15 Minuten veraltete Einträge löschen
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) { 
      rateLimitMap.delete(ip);
    }
  }
}, 15 * 60 * 1000); // 15 Minuten Intervall
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 Minuten
const RATE_LIMIT_MAX = 5; // Max 5 Registrierungen pro IP

function checkRateLimit(ip) {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    if (!record && rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      // Evict oldest entry to prevent memory growth under flood
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) rateLimitMap.delete(oldestKey);
    }
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, record);
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

// ============================================================
// SERVER ERSTELLEN
// ============================================================
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Archiv des Vergessens - Multiplayer-Server läuft!\n');
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000', 'tauri://localhost', 'https://archiv-des-vergessens.de', 'https://api.archiv-des-vergessens.de', 'https://grimoireinteractive.duckdns.org', 'wss://grimoireinteractive.duckdns.org'];

const wss = new WebSocketServer({ 
  server: httpServer,
  maxPayload: 256 * 1024, // Limitiert die maximale Payload-Größe auf 256 KB
  verifyClient: (info, cb) => {
    const origin = info.origin || info.req.headers.origin;
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(true);
    } else {
      console.warn(`[Net] Verbindung abgelehnt von nicht autorisiertem Origin: ${origin}`);
      cb(false, 403, 'Forbidden');
    }
  }
});

wss.on('connection', (ws, req) => {
  console.log('[Net] Neuer Verbindungsversuch...');
  
  // [Sicherheit] IP-Erkennung hinter Proxy
  const forwarded = req?.headers['x-forwarded-for'];
  const clientIp = process.env.TRUST_PROXY === 'true' 
    ? ((forwarded ? forwarded.split(',')[0].trim() : null) || req?.headers['x-real-ip'] || ws._socket.remoteAddress || 'unknown')
    : (ws._socket.remoteAddress || 'unknown');

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  clients.set(ws, { userId: null, username: 'Anonymus', sessionToken: null, clientIp });

  ws.on('message', async (message, isBinary) => {
    try {
      if (isBinary) {
        // TODO: Bincode Decoder implementieren, sobald Rust-Client Bincode sendet.
        console.log('[Net] Empfing binäre Nachricht (Bincode). Wird aktuell ignoriert.');
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch {
        send(ws, 'error', { message: 'Ungültiges JSON-Format.' });
        return;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        send(ws, 'error', { message: 'Ungültiges Nachrichten-Format.' });
        return;
      }

      const { type, payload: rawPayload } = parsed;
      if (typeof type !== 'string' || !type) {
        send(ws, 'error', { message: 'Nachrichtentyp fehlt oder ist ungültig.' });
        return;
      }

      const payload = (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) ? rawPayload : {};
      const clientInfo = clients.get(ws);
      if (!clientInfo) return;

      switch (type) {
        // ---- 1. AUTHENTIFIZIERUNG & ACCOUNTS ----

        // Gast/Anonymus Auth
        case 'auth': {
          const rawUserId = typeof payload.userId === 'string' ? payload.userId : null;
          const cleanUsername = sanitize(payload.username || 'Gast', 25);
          
          if (!rawUserId) {
            send(ws, 'auth:error', { message: 'Missing userId' });
            return;
          }
          
          clientInfo.userId = rawUserId;
          clientInfo.username = cleanUsername;
          clientInfo.isGuest = true;
          
          send(ws, 'auth:success', { userId: rawUserId, username: cleanUsername });
          
          // Leaderboard initial senden
          try {
            send(ws, 'leaderboard:update', getTop10());
          } catch (err) {
            console.error('[Leaderboard] Fehler beim initialen Senden:', err);
          }
          break;
        }

        // Real Server Registration
        case 'auth:register': {
          try {
            const cleanUsername = sanitize(payload.username, 25);
            const rawEmail = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
            const password = typeof payload.password === 'string' ? payload.password : '';
            const clientIp = clientInfo.clientIp || 'unknown';
            
            // ========== VALIDIERUNG ==========
            if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 25) {
              send(ws, 'auth:register:error', { 
                error: 'auth.error.username_short',
                message: 'Username muss zwischen 3 und 25 Zeichen lang sein.'
              });
              return;
            }
            
            // Username: Nur alphanumerisch + Unterstrich
            if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
              send(ws, 'auth:register:error', {
                error: 'auth.error.username_invalid_chars',
                message: 'Username darf nur Buchstaben, Zahlen und Unterstriche enthalten.'
              });
              return;
            }
            
            // Email-Format-Validierung
            if (!validateEmailFormat(rawEmail)) {
              send(ws, 'auth:register:error', { 
                error: 'auth.error.email_invalid',
                message: 'Ungültiges E-Mail-Format.'
              });
              return;
            }
            const cleanEmail = rawEmail.substring(0, 100);
            
            if (!password || password.length < 6 || password.length > MAX_PASSWORD_LENGTH) {
              send(ws, 'auth:register:error', { 
                error: 'auth.error.password_short',
                message: 'Passwort muss zwischen 6 und 128 Zeichen lang sein.'
              });
              return;
            }
            
            // ========== RATE LIMITING ==========
            const rateCheck = checkRateLimit(clientIp);
            if (!rateCheck.allowed) {
              send(ws, 'auth:register:error', {
                error: 'auth.error.rate_limit',
                message: `Zu viele Versuche. Bitte warte ${rateCheck.retryAfter} Sekunden.`,
                retryAfter: rateCheck.retryAfter
              });
              return;
            }
            
            // ========== DUPLIKAT-PRÜFUNG ==========
            const similarityCheck = checkUsernameSimilarity(cleanUsername, db);
            if (similarityCheck.isDuplicate) {
              send(ws, 'auth:register:error', {
                error: similarityCheck.reason,
                similarTo: similarityCheck.similarTo
              });
              return;
            }
            
            // Exakter Email-Check
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
            if (existingEmail) {
              send(ws, 'auth:register:error', { error: 'auth.error.email_taken' });
              return;
            }
            
            // ========== REGISTRIERUNG MIT TRANSACTION ==========
            const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
            const salt = generateSalt();
            const passwordHash = hashPassword(password, salt);
            const token = generateToken();
            const now = Date.now();
            const avatar = sanitize(payload.avatar, 10) || '🛡️';
            
            const registerTransaction = db.transaction(() => {
              // User einfügen
              db.prepare(`
                INSERT INTO users (id, username, email, passwordHash, salt, avatar, createdAt, lastLogin, sessionToken)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(userId, cleanUsername, cleanEmail, passwordHash, salt, avatar, now, now, token);
              
              // Leeren Save-Eintrag vorbereiten (für sofortige Cloud-Sync-Bereitschaft)
              db.prepare(`
                INSERT OR IGNORE INTO saves (userId, username, saveData, version, timestamp)
                VALUES (?, ?, ?, ?, ?)
              `).run(userId, cleanUsername, JSON.stringify({}), '1.0', now);
              
              return { userId, token };
            });
            
            const result = registerTransaction();
            
            clientInfo.userId = result.userId;
            clientInfo.username = cleanUsername;
            clientInfo.sessionToken = result.token;
            clientInfo.isGuest = false;
            
            console.log(`[Auth] Neuer Account registriert: '${cleanUsername}' (${result.userId})`);
            
            const userObj = {
              id: result.userId,
              username: cleanUsername,
              email: cleanEmail,
              avatar,
              createdAt: now,
              lastLogin: now,
              isGuest: false
            };
            
            send(ws, 'auth:register:success', { user: userObj, token: result.token });
            send(ws, 'auth:success', { userId: result.userId, username: cleanUsername });
            sendChatHistory(ws);
            
          } catch (err) {
            console.error('[Auth] Registrierungsfehler:', err);
            send(ws, 'auth:register:error', { 
              error: 'auth.error.server_error',
              message: 'Server-Fehler bei der Registrierung.'
            });
          }
          break;
        }

        // Real Server Login
        case 'auth:login': {
          try {
            const query = sanitize(payload.usernameOrEmail, 100);
            const password = typeof payload.password === 'string' ? payload.password : '';

            if (!query || !password) {
              send(ws, 'auth:login:error', { error: 'auth.error.missing_fields' });
              return;
            }

            if (password.length > MAX_PASSWORD_LENGTH) {
              send(ws, 'auth:login:error', { error: 'auth.error.wrong_password' });
              return;
            }

            const user = db.prepare(`
              SELECT * FROM users WHERE username = ? OR email = ?
            `).get(query, query);

            if (!user) {
              send(ws, 'auth:login:error', { error: 'auth.error.user_not_found' });
              return;
            }

            if (!verifyPassword(password, user.salt, user.passwordHash)) {
              send(ws, 'auth:login:error', { error: 'auth.error.wrong_password' });
              return;
            }

            const newToken = generateToken();
            const now = Date.now();

            db.prepare('UPDATE users SET lastLogin = ?, sessionToken = ? WHERE id = ?').run(now, newToken, user.id);

            clientInfo.userId = user.id;
            clientInfo.username = user.username;
            clientInfo.sessionToken = newToken;
            clientInfo.isGuest = false;

            console.log(`[Auth] Erfolgreicher Login: '${user.username}' (${user.id})`);

            const userObj = {
              id: user.id,
              username: user.username,
              email: user.email,
              avatar: user.avatar || '🛡️',
              createdAt: user.createdAt,
              lastLogin: now,
              isGuest: false
            };

            send(ws, 'auth:login:success', { user: userObj, token: newToken });
            send(ws, 'auth:success', { userId: user.id, username: user.username });
            sendChatHistory(ws);
          } catch (err) {
            console.error('[Auth] Login-Fehler:', err);
            send(ws, 'auth:login:error', { error: 'auth.error.missing_fields' });
          }
          break;
        }

        // Token Verification on Reconnect
        case 'auth:verifyToken': {
          try {
            const userId = sanitize(payload.userId, 50);
            const token = typeof payload.token === 'string' ? payload.token : '';

            if (!userId || !token) {
              send(ws, 'auth:verifyToken:error', { error: 'Missing session credentials.' });
              return;
            }

            const user = db.prepare('SELECT * FROM users WHERE id = ? AND sessionToken = ?').get(userId, token);

            if (!user) {
              send(ws, 'auth:verifyToken:error', { error: 'Session token invalid or expired.' });
              return;
            }

            clientInfo.userId = user.id;
            clientInfo.username = user.username;
            clientInfo.sessionToken = token;
            clientInfo.isGuest = false;

            console.log(`[Auth] Session verifiziert für '${user.username}' (${user.id})`);

            const userObj = {
              id: user.id,
              username: user.username,
              email: user.email,
              avatar: user.avatar || '🛡️',
              createdAt: user.createdAt,
              lastLogin: user.lastLogin,
              isGuest: false
            };

            send(ws, 'auth:verifyToken:success', { user: userObj, token });
            send(ws, 'auth:success', { userId: user.id, username: user.username });
            sendChatHistory(ws);
          } catch (err) {
            console.error('[Auth] Token-Verifizierungsfehler:', err);
            send(ws, 'auth:verifyToken:error', { error: 'Session token invalid or expired.' });
          }
          break;
        }

        case 'auth:convertGuest': {
          try {
            const guestId = sanitize(payload.guestId, 50);
            const cleanUsername = sanitize(payload.username, 25);
            const cleanEmail = sanitize(payload.email, 100).toLowerCase();
            const password = payload.password || '';
            const clientIp = clientInfo.clientIp || 'unknown';
            
            // ========== VALIDIERUNG ==========
            if (!guestId || !guestId.startsWith('guest_')) {
              send(ws, 'auth:convertGuest:error', { 
                error: 'auth.error.invalid_guest',
                message: 'Ungültige Gast-ID.'
              });
              return;
            }
            
            if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 25) {
              send(ws, 'auth:convertGuest:error', { 
                error: 'auth.error.username_short',
                message: 'Username muss zwischen 3 und 25 Zeichen lang sein.'
              });
              return;
            }
            
            if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
              send(ws, 'auth:convertGuest:error', {
                error: 'auth.error.username_invalid_chars',
                message: 'Username darf nur Buchstaben, Zahlen und Unterstriche enthalten.'
              });
              return;
            }
            
            if (!validateEmailFormat(cleanEmail)) {
              send(ws, 'auth:convertGuest:error', { 
                error: 'auth.error.email_invalid',
                message: 'Ungültiges E-Mail-Format.'
              });
              return;
            }
            
            if (!password || password.length < 6 || password.length > 128) {
              send(ws, 'auth:convertGuest:error', { 
                error: 'auth.error.password_short',
                message: 'Passwort muss zwischen 6 und 128 Zeichen lang sein.'
              });
              return;
            }
            
            // ========== RATE LIMITING ==========
            const rateCheck = checkRateLimit(clientIp);
            if (!rateCheck.allowed) {
              send(ws, 'auth:convertGuest:error', {
                error: 'auth.error.rate_limit',
                message: `Zu viele Versuche. Bitte warte ${rateCheck.retryAfter} Sekunden.`,
                retryAfter: rateCheck.retryAfter
              });
              return;
            }
            
            // ========== DUPLIKAT-PRÜFUNG ==========
            const similarityCheck = checkUsernameSimilarity(cleanUsername, db);
            if (similarityCheck.isDuplicate) {
              send(ws, 'auth:convertGuest:error', {
                error: similarityCheck.reason,
                similarTo: similarityCheck.similarTo
              });
              return;
            }
            
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
            if (existingEmail) {
              send(ws, 'auth:convertGuest:error', { error: 'auth.error.email_taken' });
              return;
            }
            
            // ========== GAST-DATEN VALIDIERUNG ==========
            const guestSave = db.prepare('SELECT * FROM saves WHERE userId = ?').get(guestId);
            const guestLeaderboard = db.prepare('SELECT * FROM leaderboard WHERE userId = ?').get(guestId);
            
            if (!guestSave && !guestLeaderboard) {
              console.warn(`[Auth] Gast ${guestId} hat keine gespeicherten Daten.`);
            }
            
            // ========== KONVERTIERUNG MIT TRANSACTION ==========
            const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
            const salt = generateSalt();
            const passwordHash = hashPassword(password, salt);
            const token = generateToken();
            const now = Date.now();
            const avatar = sanitize(payload.avatar, 10) || '🛡️';
            
            const convertTransaction = db.transaction(() => {
              // Neuen User erstellen
              db.prepare(`
                INSERT INTO users (id, username, email, passwordHash, salt, avatar, createdAt, lastLogin, sessionToken)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(userId, cleanUsername, cleanEmail, passwordHash, salt, avatar, now, now, token);
              
              // Gast-Save übertragen (falls vorhanden)
              if (guestSave) {
                db.prepare(`
                  UPDATE saves 
                  SET userId = ?, username = ?, version = ?, timestamp = ?
                  WHERE userId = ?
                `).run(userId, cleanUsername, guestSave.version || '1.0', now, guestId);
                
                console.log(`[Auth] Gast-Save von ${guestId} zu ${userId} migriert`);
              } else {
                // Leeren Save erstellen falls keiner existiert
                db.prepare(`
                  INSERT OR IGNORE INTO saves (userId, username, saveData, version, timestamp)
                  VALUES (?, ?, ?, ?, ?)
                `).run(userId, cleanUsername, JSON.stringify({}), '1.0', now);
              }
              
              // Leaderboard übertragen (falls vorhanden)
              if (guestLeaderboard) {
                db.prepare(`
                  UPDATE leaderboard 
                  SET userId = ?, username = ?
                  WHERE userId = ?
                `).run(userId, cleanUsername, guestId);
                
                console.log(`[Auth] Leaderboard-Eintrag von ${guestId} zu ${userId} migriert`);
              }
              
              return { userId, token, saveMigrated: !!guestSave, leaderboardMigrated: !!guestLeaderboard };
            });
            
            const result = convertTransaction();
            
            clientInfo.userId = result.userId;
            clientInfo.username = cleanUsername;
            clientInfo.sessionToken = result.token;
            clientInfo.isGuest = false;
            
            console.log(`[Auth] Gast-Account '${guestId}' umgewandelt in '${cleanUsername}' (${result.userId})`);
            console.log(`[Auth] Save migriert: ${result.saveMigrated}, Leaderboard migriert: ${result.leaderboardMigrated}`);
            
            const userObj = {
              id: result.userId,
              username: cleanUsername,
              email: cleanEmail,
              avatar,
              createdAt: now,
              lastLogin: now,
              isGuest: false
            };
            
            send(ws, 'auth:convertGuest:success', { 
              user: userObj, 
              token: result.token,
              migrated: {
                save: result.saveMigrated,
                leaderboard: result.leaderboardMigrated
              }
            });
            send(ws, 'auth:success', { userId: result.userId, username: cleanUsername });
            
          } catch (err) {
            console.error('[Auth] Fehler bei Gast-Umwandlung:', err);
            send(ws, 'auth:convertGuest:error', { 
              error: 'auth.error.server_error',
              message: 'Server-Fehler bei der Gast-Konvertierung.'
            });
          }
          break;
        }

        // ---- 2. ECHTZEIT-CHAT ----
        case 'chat:global': {
          if (!clientInfo.userId) return;
          const text = sanitize(payload.message, 200);
          if (!text) return;

          const msg = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
            player: clientInfo.username,
            message: text,
            timestamp: Date.now(),
            type: 'global'
          };

          try {
            if (stmts.insertChat) {
              stmts.insertChat.run(msg.id, msg.player, msg.message, msg.timestamp, 'global', null);
            } else {
              db.prepare(`
                INSERT INTO chats (id, player, message, timestamp, type, guildId)
                VALUES (?, ?, ?, ?, 'global', NULL)
              `).run(msg.id, msg.player, msg.message, msg.timestamp);
            }
            pruneChatHistory(500);
          } catch (err) {
            console.error('[Chat] Fehler beim Speichern der globalen Nachricht:', err);
          }

          console.log(`[Chat:Global] ${clientInfo.username}: ${text}`);
          broadcast('chat:globalMessage', msg);
          break;
        }

        case 'chat:guild': {
          if (!clientInfo.userId) return;
          const rawGuildId = typeof payload?.guildId === 'string' ? payload.guildId : '';
          const cleanGuildId = sanitize(rawGuildId, 64);
          if (!cleanGuildId) return;

          const rawText = typeof payload?.message === 'string' ? payload.message : '';
          const text = sanitize(rawText, 200);
          if (!text) return;

          const msg = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
            player: clientInfo.username,
            message: text,
            timestamp: Date.now(),
            type: 'guild',
            guildId: cleanGuildId
          };

          try {
            if (stmts.insertChat) {
              stmts.insertChat.run(msg.id, msg.player, msg.message, msg.timestamp, 'guild', msg.guildId);
            } else {
              db.prepare(`
                INSERT INTO chats (id, player, message, timestamp, type, guildId)
                VALUES (?, ?, ?, ?, 'guild', ?)
              `).run(msg.id, msg.player, msg.message, msg.timestamp, msg.guildId);
            }
            pruneChatHistory(500);
          } catch (err) {
            console.error('[Chat] Fehler beim Speichern der Gilden-Nachricht:', err);
          }

          console.log(`[Chat:Guild:${cleanGuildId}] ${clientInfo.username}: ${text}`);
          broadcast('chat:guildMessage', msg);
          break;
        }

        case 'chat:getHistory': {
          try {
            const rawGuildId = typeof payload?.guildId === 'string' ? payload.guildId : null;
            const guildId = rawGuildId ? sanitize(rawGuildId, 64) : null;
            let rows;
            if (guildId && stmts.getGuildChatHistory) {
              rows = stmts.getGuildChatHistory.all(guildId, 50);
            } else if (stmts.getGlobalChatHistory) {
              rows = stmts.getGlobalChatHistory.all(50);
            } else {
              rows = db.prepare('SELECT id, player, message, timestamp, type FROM chats WHERE type = "global" ORDER BY timestamp DESC LIMIT 50').all();
            }
            send(ws, 'chat:history', rows.reverse());
          } catch (err) {
            console.error('[Chat] Fehler beim Laden des Chat-Verlaufs:', err);
            send(ws, 'chat:history', []);
          }
          break;
        }

        // ---- 3. CLOUD-SAVES ----
        case 'cloud:save': {
          if (!clientInfo.userId) {
            send(ws, 'cloud:save:error', { error: 'Nicht authentifiziert.' });
            return;
          }

          try {
            const timestamp = Date.now();
            const saveDataStr = typeof payload.saveData === 'string' 
              ? payload.saveData 
              : JSON.stringify(payload.saveData);
            const version = payload.version || '1.6';

            // [Sicherheit] Payload Limit für Spielstände (250 KB)
            if (saveDataStr.length > 250_000) {
              send(ws, 'cloud:save:error', { error: 'Speicherstand zu groß.' });
              return;
            }

            if (stmts.upsertSave) {
              stmts.upsertSave.run(clientInfo.userId, clientInfo.username, saveDataStr, version, timestamp);
            } else {
              db.prepare(`
                INSERT INTO saves (userId, username, saveData, version, timestamp)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(userId) DO UPDATE SET
                  username = excluded.username,
                  saveData = excluded.saveData,
                  version = excluded.version,
                  timestamp = excluded.timestamp
              `).run(clientInfo.userId, clientInfo.username, saveDataStr, version, timestamp);
            }

            console.log(`[CloudSave] Spielstand für ${clientInfo.username} in SQLite gespeichert.`);
            send(ws, 'cloud:save:success', { timestamp });
          } catch (err) {
            console.error('[CloudSave] Fehler beim Speichern in SQLite:', err);
            send(ws, 'cloud:save:error', { error: 'Fehler beim Schreiben des Spielstands.' });
          }
          break;
        }

        case 'cloud:load': {
          if (!clientInfo.userId) {
            send(ws, 'cloud:load:error', { error: 'Nicht authentifiziert.' });
            return;
          }

          try {
            const row = stmts.getSave ? stmts.getSave.get(clientInfo.userId) : db.prepare('SELECT saveData, version, timestamp FROM saves WHERE userId = ?').get(clientInfo.userId);
            
            if (row) {
              const fileData = {
                userId: clientInfo.userId,
                timestamp: row.timestamp,
                saveData: JSON.parse(row.saveData),
                version: row.version
              };
              send(ws, 'cloud:load:success', fileData);
              console.log(`[CloudSave] Spielstand für ${clientInfo.username} aus SQLite geladen.`);
            } else {
              send(ws, 'cloud:load:success', { saveData: null });
            }
          } catch (err) {
            console.error('[CloudSave] Fehler beim Laden aus SQLite:', err);
            send(ws, 'cloud:load:success', { saveData: null });
          }
          break;
        }

        // ---- 4. GLOBAL LEADERBOARD ----
        case 'leaderboard:submit': {
          if (!clientInfo.userId || clientInfo.isGuest) return;

          // Nur registrierte Benutzer zulassen
          const isRegisteredUser = stmts.getUserById ? stmts.getUserById.get(clientInfo.userId) : db.prepare('SELECT id FROM users WHERE id = ?').get(clientInfo.userId);
          if (!isRegisteredUser) {
            console.warn(`[Leaderboard] Übertragung abgelehnt: '${clientInfo.username}' (${clientInfo.userId}) ist kein registrierter Benutzer.`);
            return;
          }

          try {
            const MAX_PRESTIGE = 99999; 
            const MAX_BOSSES = 999999;
            const MAX_LEVEL = 100000;

            const prestige = Math.min(MAX_PRESTIGE, Math.max(0, parseInt(payload.prestige) || 0));
            const bosses = Math.min(MAX_BOSSES, Math.max(0, parseInt(payload.bosses) || 0));
            const level = Math.min(MAX_LEVEL, Math.max(1, parseInt(payload.level) || 1));
            const timestamp = Date.now();

            // [Sicherheit] Leaderboard-Validierung auf plausible Werte & Sprünge
            const existing = stmts.getLeaderboardUser ? stmts.getLeaderboardUser.get(clientInfo.userId) : db.prepare('SELECT prestige, bosses, level FROM leaderboard WHERE userId = ?').get(clientInfo.userId);
            if (existing) {
              if (prestige > existing.prestige + 50 || bosses > existing.bosses + 200 || level > existing.level + 1000) {
                console.warn(`[Security] Plausibilitätsprüfung fehlgeschlagen für Benutzer ${clientInfo.userId}: Prestige ${prestige} (vorher ${existing.prestige}), Bosses ${bosses} (vorher ${existing.bosses}), Level ${level} (vorher ${existing.level})`);
                return;
              }
            } else {
              if (prestige > 50 || bosses > 200 || level > 1000) {
                const saveRow = stmts.getSave ? stmts.getSave.get(clientInfo.userId) : db.prepare('SELECT saveData FROM saves WHERE userId = ?').get(clientInfo.userId);
                if (!saveRow) {
                  console.warn(`[Security] Erstübertragung ohne Speicherstand verweigert für Benutzer ${clientInfo.userId}`);
                  return;
                }
              }
            }

            if (stmts.upsertLeaderboard) {
              stmts.upsertLeaderboard.run(clientInfo.userId, clientInfo.username, prestige, bosses, level, timestamp);
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
              `).run(clientInfo.userId, clientInfo.username, prestige, bosses, level, timestamp);
            }

            console.log(`[Leaderboard] Highscore in SQLite aktualisiert für ${clientInfo.username}`);
            
            broadcast('leaderboard:update', getTop10());
          } catch (err) {
            console.error('[Leaderboard] Fehler beim Aktualisieren des Highscores:', err);
          }
          break;
        }

        case 'leaderboard:get': {
          send(ws, 'leaderboard:update', getTop10());
          break;
        }

        default:
          console.warn(`[Net] Unbekannter Nachrichtentyp empfangen: ${type}`);
      }
    } catch (err) {
      console.error('[Net] Fehler beim Verarbeiten der Nachricht:', err.message);
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      console.log(`[Net] Verbindung getrennt: ${clientInfo.username} (${clientInfo.userId || 'unbekannt'})`);
    }
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[Net] Socket-Fehler:', err.message);
  });
});

// Heartbeat-Intervall: Prüft alle 30 Sekunden alle Verbindungen
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[Heartbeat] Verbindung inaktiv. Trenne Geister-Client...');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Graceful Shutdown Logik
function gracefulShutdown() {
  console.log('[System] Fahre Server herunter...');
  clearInterval(heartbeatInterval);
  
  // Alle Clients sauber benachrichtigen und trennen
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.close(1000, 'Server fährt herunter');
    }
  });

  httpServer.close(() => {
    console.log('[System] HTTP-Server beendet.');
    if (db) {
      db.close();
      console.log('[Storage] SQLite-Datenbank geschlossen.');
    }
    process.exit(0);
  });

  // Fallback, falls Schließen zu lange dauert
  setTimeout(() => {
    console.error('[System] Zwangsweiser Shutdown nach Timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Starten!
initStorage().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  🎮 ARCHIV DES VERGESSENS - MULTIPLAYER BACKEND       `);
    console.log(`  ---------------------------------------------------  `);
    console.log(`  - Server läuft auf Port: ${PORT}                    `);
    console.log(`  - Protokoll: ws://0.0.0.0:${PORT}                  `);
    console.log(`=======================================================`);
  });
});
