/**
 * ============================================================
 * FILE: server/modules/auth.js - Authentifizierungs-Logik
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Username/Email Validierung
 * - Rate Limiting
 * - Duplikat-Prüfungen
 * - Passwort-Validierung
 * ============================================================
 */

import { getDatabase, getStatements } from './database.js';
import { hashPassword, generateToken, generateSalt } from './crypto.js';
import { sanitize } from './utils.js';

// ---- KONSTANTEN ----
const USERNAME_BLACKLIST = [
  'admin', 'administrator', 'system', 'root', 'moderator', 'mod',
  'support', 'help', 'info', 'test', 'null', 'undefined', 'user',
  'guest', 'bot', 'server', 'official', 'archive', 'vergessen'
];

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 Minuten
const RATE_LIMIT_MAX = 5; // Max 5 Registrierungen pro IP
const MAX_RATE_LIMIT_ENTRIES = 10000;

// Rate Limiting Map (IP -> {count, resetTime})
const rateLimitMap = new Map();

// Verhindert Memory-Leak: Alle 15 Minuten veraltete Einträge löschen
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) { 
      rateLimitMap.delete(ip);
    }
  }
}, 15 * 60 * 1000); // 15 Minuten Intervall

/**
 * Validiert das E-Mail-Format
 * @param {string} email - Die zu prüfende E-Mail
 * @returns {boolean} True wenn Format gültig ist
 */
export function validateEmailFormat(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length >= 6 && email.length <= 254;
}

/**
 * Prüft auf Username-Duplikate und Blacklist-Einträge
 * @param {string} newUsername - Der zu prüfende Username
 * @param {Database} database - Optionale Datenbank-Instanz
 * @returns {{isDuplicate: boolean, reason?: string, similarTo?: string}}
 */
export function checkUsernameSimilarity(newUsername, database = null) {
  const normalized = newUsername.toLowerCase();
  
  // Blacklist-Check
  if (USERNAME_BLACKLIST.includes(normalized)) {
    return { isDuplicate: true, reason: 'auth.error.username_blacklisted' };
  }
  
  const db = database || getDatabase();
  const stmts = getStatements();
  
  // O(1) Wiederverwendung vorbereitetes Statement
  const existingUser = stmts.checkUsername 
    ? stmts.checkUsername.get(normalized) 
    : db.prepare('SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1').get(normalized);
  
  if (existingUser) {
    return { isDuplicate: true, reason: 'auth.error.username_taken' };
  }
  
  return { isDuplicate: false };
}

/**
 * Prüft Rate Limiting für eine IP-Adresse
 * @param {string} ip - Die IP-Adresse
 * @returns {{allowed: boolean, retryAfter?: number}}
 */
export function checkRateLimit(ip) {
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

/**
 * Erstellt einen neuen Benutzer-Account
 * @param {Object} params - Registrierungs-Parameter
 * @returns {Promise<{userId: string, token: string, user: Object}>}
 */
export async function createUser({ username, email, password, avatar }) {
  const db = getDatabase();
  const stmts = getStatements();
  
  const cleanUsername = sanitize(username, 25);
  const cleanEmail = email.trim().toLowerCase().substring(0, 100);
  const safeAvatar = sanitize(avatar, 10) || '🛡️';
  
  const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const token = generateToken();
  const now = Date.now();
  
  const registerTransaction = db.transaction(() => {
    // User einfügen
    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, salt, avatar, createdAt, lastLogin, sessionToken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, cleanUsername, cleanEmail, passwordHash, salt, safeAvatar, now, now, token);
    
    // Leeren Save-Eintrag vorbereiten
    db.prepare(`
      INSERT OR IGNORE INTO saves (userId, username, saveData, version, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, cleanUsername, JSON.stringify({}), '1.0', now);
    
    return { userId, token };
  });
  
  const result = registerTransaction();
  
  const userObj = {
    id: result.userId,
    username: cleanUsername,
    email: cleanEmail,
    avatar: safeAvatar,
    createdAt: now,
    lastLogin: now,
    isGuest: false
  };
  
  return { userId: result.userId, token: result.token, user: userObj };
}

/**
 * Führt einen Login durch
 * @param {string} usernameOrEmail - Username oder E-Mail
 * @param {string} password - Das Passwort
 * @returns {Promise<{user: Object, token: string}|null>}
 */
export async function loginUser(usernameOrEmail, password) {
  const db = getDatabase();
  const stmts = getStatements();
  
  const query = sanitize(usernameOrEmail, 100);
  
  if (!query || !password) {
    return null;
  }
  
  const user = db.prepare(`
    SELECT * FROM users WHERE username = ? OR email = ?
  `).get(query, query);
  
  if (!user) {
    return null;
  }
  
  // Import hier um Zirkelabhängigkeit zu vermeiden
  const { verifyPassword } = await import('./crypto.js');
  
  if (!verifyPassword(password, user.salt, user.passwordHash)) {
    return null;
  }
  
  const newToken = generateToken();
  const now = Date.now();
  
  db.prepare('UPDATE users SET lastLogin = ?, sessionToken = ? WHERE id = ?').run(now, newToken, user.id);
  
  const userObj = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || '🛡️',
    createdAt: user.createdAt,
    lastLogin: now,
    isGuest: false
  };
  
  return { user: userObj, token: newToken };
}

/**
 * Verifiziert einen Session-Token
 * @param {string} userId - Die User-ID
 * @param {string} token - Der Session-Token
 * @returns {Promise<{user: Object, token: string}|null>}
 */
export async function verifyToken(userId, token) {
  const db = getDatabase();
  
  if (!userId || !token) {
    return null;
  }
  
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND sessionToken = ?').get(userId, token);
  
  if (!user) {
    return null;
  }
  
  const userObj = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || '🛡️',
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    isGuest: false
  };
  
  return { user: userObj, token };
}

/**
 * Wandelt einen Gast-Account in einen regulären Account um
 * @param {Object} params - Konvertierungs-Parameter
 * @returns {Promise<Object>}
 */
export async function convertGuestToUser({ guestId, username, email, password, avatar }) {
  const db = getDatabase();
  
  const cleanUsername = sanitize(username, 25);
  const cleanEmail = email.trim().toLowerCase().substring(0, 100);
  const safeAvatar = sanitize(avatar, 10) || '🛡️';
  
  // Gast-Daten validieren
  const guestSave = db.prepare('SELECT * FROM saves WHERE userId = ?').get(guestId);
  const guestLeaderboard = db.prepare('SELECT * FROM leaderboard WHERE userId = ?').get(guestId);
  
  if (!guestSave && !guestLeaderboard) {
    console.warn(`[Auth] Gast ${guestId} hat keine gespeicherten Daten.`);
  }
  
  // Konvertierung mit Transaction
  const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const token = generateToken();
  const now = Date.now();
  
  const convertTransaction = db.transaction(() => {
    // Neuen User erstellen
    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, salt, avatar, createdAt, lastLogin, sessionToken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, cleanUsername, cleanEmail, passwordHash, salt, safeAvatar, now, now, token);
    
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
    
    return { 
      userId, 
      token, 
      saveMigrated: !!guestSave, 
      leaderboardMigrated: !!guestLeaderboard 
    };
  });
  
  const result = convertTransaction();
  
  const userObj = {
    id: result.userId,
    username: cleanUsername,
    email: cleanEmail,
    avatar: safeAvatar,
    createdAt: now,
    lastLogin: now,
    isGuest: false
  };
  
  return { 
    user: userObj, 
    token: result.token,
    migrated: {
      save: result.saveMigrated,
      leaderboard: result.leaderboardMigrated
    }
  };
}
