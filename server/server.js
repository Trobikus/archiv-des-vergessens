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

// Sicherheits- & Validierungskonstanten
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const MAX_PASSWORD_LENGTH = 128;

// ---- GLOBALE STATS & DATABASE ----
const clients = new Map(); // Map: WebSocket -> { userId, username, guildId, sessionToken }
let db;

// ============================================================
// DATEN-VERZEICHNISSE & SQLITE INITIALISIEREN
// ============================================================
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    // SQLite-Datenbank initialisieren
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL'); // Erhöht die Schreibgeschwindigkeit massiv

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

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_chats_type_timestamp ON chats(type, timestamp DESC)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_chats_type_guild_timestamp ON chats(type, guildId, timestamp DESC)`).run();

    console.log('[Storage] SQLite-Datenbank erfolgreich initialisiert.');

    // Automatische Migration von Altdaten
    await migrateOldJsonData();

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

        const runTx = db.transaction((items) => {
          for (const item of items) {
            insertStmt.run(
              item.userId,
              item.username,
              item.prestige || 0,
              item.bosses || 0,
              item.level || 1,
              item.timestamp || Date.now()
            );
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
  } catch (err) {
    console.error('[Migration] Fehler während des Migrationsprozesses:', err);
  }
}

// Hilfsfunktion: Holt die Top 10 Bestenliste aus SQLite
function getTop10() {
  try {
    return db.prepare(`
      SELECT userId, username, prestige, bosses, level, timestamp
      FROM leaderboard
      ORDER BY prestige DESC, bosses DESC, level DESC
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
function getGuildChatHistory(guildId, limit = 50) {
  if (!guildId) return [];
  try {
    return db.prepare(`
      SELECT id, player, message, timestamp, guildId
      FROM chats
      WHERE type = 'guild' AND guildId = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(guildId, limit).reverse();
  } catch (err) {
    console.error('[Chat] Fehler beim Laden des Gilden-Chatverlaufs:', err);
    return [];
  }
}

// Sendet den gespeicherten Chatverlauf (Global & Gilde) an eine Verbindung
function sendChatHistory(ws, guildId) {
  const globalHistory = getGlobalChatHistory(50);
  for (const msg of globalHistory) {
    send(ws, 'chat:globalMessage', msg);
  }
  if (guildId) {
    const guildHistory = getGuildChatHistory(guildId, 50);
    for (const msg of guildHistory) {
      send(ws, 'chat:guildMessage', msg);
    }
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

function broadcastToGuild(guildId, type, payload) {
  if (!guildId) return;
  const msg = JSON.stringify({ type, payload });
  for (const [ws, info] of clients) {
    if (info.guildId === guildId && ws.readyState === 1) {
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

// ============================================================
// SERVER ERSTELLEN
// ============================================================
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Archiv des Vergessens - Multiplayer-Server läuft!\n');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('[Net] Neuer Verbindungsversuch...');
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  clients.set(ws, { userId: null, username: 'Anonymus', guildId: null, sessionToken: null });

  ws.on('message', async (message) => {
    try {
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

        // Legacy / Guest Handshake
        case 'auth': {
          const rawUserId = sanitize(payload.userId, 50);
          const rawUsername = sanitize(payload.username, 25) || 'Gast-Hüter';
          const rawGuildId = sanitize(payload.guildId, 50) || null;

          if (!rawUserId) {
            send(ws, 'auth:error', { message: 'Ungültige User-ID.' });
            return;
          }

          clientInfo.userId = rawUserId;
          clientInfo.username = rawUsername;
          clientInfo.guildId = rawGuildId;

          console.log(`[Auth] Spieler '${rawUsername}' (${rawUserId}) eingeloggt. Gilde: ${rawGuildId || 'keine'}`);
          send(ws, 'auth:success', { userId: rawUserId, username: rawUsername });

          sendChatHistory(ws, rawGuildId);
          break;
        }

        // Real Server Registration
        case 'auth:register': {
          try {
            const cleanUsername = sanitize(payload.username, 25);
            const cleanEmail = sanitize(payload.email, 100).toLowerCase();
            const password = typeof payload.password === 'string' ? payload.password : '';

            if (!cleanUsername || cleanUsername.length < 3) {
              send(ws, 'auth:register:error', { error: 'auth.error.username_short' });
              return;
            }
            if (!cleanEmail || !cleanEmail.includes('@')) {
              send(ws, 'auth:register:error', { error: 'auth.error.email_invalid' });
              return;
            }
            if (!password || password.length < 6 || password.length > MAX_PASSWORD_LENGTH) {
              send(ws, 'auth:register:error', { error: 'auth.error.password_short' });
              return;
            }

            // Check for existing username (case-insensitive via COLLATE NOCASE)
            const existingUser = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
            if (existingUser) {
              send(ws, 'auth:register:error', { error: 'auth.error.username_taken' });
              return;
            }

            // Check for existing email (case-insensitive via COLLATE NOCASE)
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(cleanEmail);
            if (existingEmail) {
              send(ws, 'auth:register:error', { error: 'auth.error.email_taken' });
              return;
            }

            const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
            const salt = generateSalt();
            const passwordHash = hashPassword(password, salt);
            const token = generateToken();
            const now = Date.now();
            const avatar = sanitize(payload.avatar, 10) || '🛡️';

            db.prepare(`
              INSERT INTO users (id, username, email, passwordHash, salt, avatar, createdAt, lastLogin, sessionToken)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(userId, cleanUsername, cleanEmail, passwordHash, salt, avatar, now, now, token);

            clientInfo.userId = userId;
            clientInfo.username = cleanUsername;
            clientInfo.sessionToken = token;

            console.log(`[Auth] Neuer Account registriert: '${cleanUsername}' (${userId})`);

            const userObj = {
              id: userId,
              username: cleanUsername,
              email: cleanEmail,
              avatar,
              createdAt: now,
              lastLogin: now,
              isGuest: false
            };

            send(ws, 'auth:register:success', { user: userObj, token });
            send(ws, 'auth:success', { userId, username: cleanUsername });
            sendChatHistory(ws, clientInfo.guildId);
          } catch (err) {
            console.error('[Auth] Registrierungsfehler:', err);
            send(ws, 'auth:register:error', { error: 'auth.error.missing_fields' });
          }
          break;
        }

        // Real Server Login
        case 'auth:login': {
          try {
            const query = sanitize(payload.usernameOrEmail, 100).toLowerCase();
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
              SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
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
            sendChatHistory(ws, clientInfo.guildId);
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
            sendChatHistory(ws, clientInfo.guildId);
          } catch (err) {
            console.error('[Auth] Token-Verifizierungsfehler:', err);
            send(ws, 'auth:verifyToken:error', { error: 'Session token invalid or expired.' });
          }
          break;
        }

        // Guest Conversion to Account
        case 'auth:convertGuest': {
          try {
            const guestId = sanitize(payload.guestId, 50);
            const cleanUsername = sanitize(payload.username, 25);
            const cleanEmail = sanitize(payload.email, 100).toLowerCase();
            const password = typeof payload.password === 'string' ? payload.password : '';

            if (!cleanUsername || cleanUsername.length < 3) {
              send(ws, 'auth:convertGuest:error', { error: 'auth.error.username_short' });
              return;
            }
            if (!cleanEmail || !cleanEmail.includes('@')) {
              send(ws, 'auth:convertGuest:error', { error: 'auth.error.email_invalid' });
              return;
            }
            if (!password || password.length < 6 || password.length > MAX_PASSWORD_LENGTH) {
              send(ws, 'auth:convertGuest:error', { error: 'auth.error.password_short' });
              return;
            }

            // Uniqueness check via COLLATE NOCASE
            const existingUser = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
            if (existingUser) {
              send(ws, 'auth:convertGuest:error', { error: 'auth.error.username_taken' });
              return;
            }
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(cleanEmail);
            if (existingEmail) {
              send(ws, 'auth:convertGuest:error', { error: 'auth.error.email_taken' });
              return;
            }

            const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
            const salt = generateSalt();
            const passwordHash = hashPassword(password, salt);
            const token = generateToken();
            const now = Date.now();

            db.prepare(`
              INSERT INTO users (id, username, email, passwordHash, salt, avatar, createdAt, lastLogin, sessionToken)
              VALUES (?, ?, ?, ?, ?, '🛡️', ?, ?, ?)
            `).run(userId, cleanUsername, cleanEmail, passwordHash, salt, now, now, token);

            // Transfer guest save in SQLite if present
            if (guestId) {
              db.prepare('UPDATE saves SET userId = ?, username = ? WHERE userId = ?').run(userId, cleanUsername, guestId);
              db.prepare('UPDATE leaderboard SET userId = ?, username = ? WHERE userId = ?').run(userId, cleanUsername, guestId);
            }

            clientInfo.userId = userId;
            clientInfo.username = cleanUsername;
            clientInfo.sessionToken = token;

            console.log(`[Auth] Gast-Account '${guestId}' umgewandelt in '${cleanUsername}' (${userId})`);

            const userObj = {
              id: userId,
              username: cleanUsername,
              email: cleanEmail,
              avatar: '🛡️',
              createdAt: now,
              lastLogin: now,
              isGuest: false
            };

            send(ws, 'auth:convertGuest:success', { user: userObj, token });
            send(ws, 'auth:success', { userId, username: cleanUsername });
            sendChatHistory(ws, clientInfo.guildId);
          } catch (err) {
            console.error('[Auth] Fehler bei Gast-Umwandlung:', err);
            send(ws, 'auth:convertGuest:error', { error: 'auth.error.missing_fields' });
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
            db.prepare(`
              INSERT INTO chats (id, player, message, timestamp, type, guildId)
              VALUES (?, ?, ?, ?, 'global', NULL)
            `).run(msg.id, msg.player, msg.message, msg.timestamp);
            pruneChatHistory(500);
          } catch (err) {
            console.error('[Chat] Fehler beim Speichern der globalen Nachricht:', err);
          }

          console.log(`[Chat:Global] ${clientInfo.username}: ${text}`);
          broadcast('chat:globalMessage', msg);
          break;
        }

        case 'chat:guild': {
          if (!clientInfo.userId || !clientInfo.guildId) return;
          const text = sanitize(payload.message, 200);
          if (!text) return;

          const msg = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
            player: clientInfo.username,
            message: text,
            timestamp: Date.now(),
            guildId: clientInfo.guildId
          };

          try {
            db.prepare(`
              INSERT INTO chats (id, player, message, timestamp, type, guildId)
              VALUES (?, ?, ?, ?, 'guild', ?)
            `).run(msg.id, msg.player, msg.message, msg.timestamp, msg.guildId);
            pruneChatHistory(500);
          } catch (err) {
            console.error('[Chat] Fehler beim Speichern der Gilden-Nachricht:', err);
          }

          console.log(`[Chat:Guild ${clientInfo.guildId}] ${clientInfo.username}: ${text}`);
          broadcastToGuild(clientInfo.guildId, 'chat:guildMessage', msg);
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

            const stmt = db.prepare(`
              INSERT INTO saves (userId, username, saveData, version, timestamp)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(userId) DO UPDATE SET
                username = excluded.username,
                saveData = excluded.saveData,
                version = excluded.version,
                timestamp = excluded.timestamp
            `);

            stmt.run(clientInfo.userId, clientInfo.username, saveDataStr, version, timestamp);
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
            const row = db.prepare('SELECT saveData, version, timestamp FROM saves WHERE userId = ?').get(clientInfo.userId);
            
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
          if (!clientInfo.userId) return;

          try {
            const prestige = Math.max(0, parseInt(payload.prestige) || 0);
            const bosses = Math.max(0, parseInt(payload.bosses) || 0);
            const level = Math.max(1, parseInt(payload.level) || 1);
            const timestamp = Date.now();

            const stmt = db.prepare(`
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
            `);

            stmt.run(clientInfo.userId, clientInfo.username, prestige, bosses, level, timestamp);
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
