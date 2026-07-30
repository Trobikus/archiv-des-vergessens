/**
 * ============================================================
 * FILE: server/modules/chat.js - Chat-System
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Globaler Chat
 * - Gilden-Chat
 * - Chat-Verlauf speichern und laden
 * - Chat-Bereinigung (Pruning)
 * ============================================================
 */

import { getDatabase, getStatements } from './database.js';
import { sanitize, generateId } from './utils.js';
import { broadcast, send } from './utils.js';

// Counter für Pruning-Häufigkeit
let chatMessageCounter = 0;

/**
 * Speichert eine globale Chat-Nachricht
 * @param {string} player - Spielername
 * @param {string} message - Nachrichtentext
 * @returns {Object} Die gespeicherte Nachricht
 */
export function saveGlobalMessage(player, message) {
  const db = getDatabase();
  const stmts = getStatements();
  
  const text = sanitize(message, 200);
  if (!text) return null;
  
  const msg = {
    id: generateId(),
    player,
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
    return msg;
  } catch (err) {
    console.error('[Chat] Fehler beim Speichern der globalen Nachricht:', err);
    return null;
  }
}

/**
 * Speichert eine Gilden-Chat-Nachricht
 * @param {string} player - Spielername
 * @param {string} message - Nachrichtentext
 * @param {string} guildId - Gilden-ID
 * @returns {Object|null} Die gespeicherte Nachricht oder null
 */
export function saveGuildMessage(player, message, guildId) {
  const db = getDatabase();
  const stmts = getStatements();
  
  const cleanGuildId = sanitize(guildId, 64);
  if (!cleanGuildId) return null;
  
  const text = sanitize(message, 200);
  if (!text) return null;
  
  const msg = {
    id: generateId(),
    player,
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
    return msg;
  } catch (err) {
    console.error('[Chat] Fehler beim Speichern der Gilden-Nachricht:', err);
    return null;
  }
}

/**
 * Bereinigt den Chat-Verlauf um Performanz zu erhalten
 * @param {number} keepCount - Anzahl der zu behaltenden Nachrichten
 */
export function pruneChatHistory(keepCount = 500) {
  chatMessageCounter++;
  if (chatMessageCounter % 25 !== 0) return; // Nur alle 25 Nachrichten ausführen
  
  const db = getDatabase();
  const stmts = getStatements();
  
  try {
    if (stmts.pruneChats) {
      stmts.pruneChats.run(keepCount);
    } else {
      db.prepare(`
        DELETE FROM chats
        WHERE id NOT IN (
          SELECT id FROM chats
          ORDER BY timestamp DESC
          LIMIT ?
        )
      `).run(keepCount);
    }
  } catch (err) {
    console.error('[Chat] Fehler beim Bereinigen des Chatverlaufs:', err);
  }
}

/**
 * Lädt den globalen Chat-Verlauf
 * @param {number} limit - Maximale Anzahl an Nachrichten
 * @returns {Array} Chat-Verlauf
 */
export function getGlobalChatHistory(limit = 50) {
  const db = getDatabase();
  const stmts = getStatements();
  
  try {
    if (stmts.getGlobalChatHistory) {
      return stmts.getGlobalChatHistory.all(limit).reverse();
    }
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

/**
 * Lädt den Gilden-Chat-Verlauf
 * @param {string} guildId - Gilden-ID
 * @param {number} limit - Maximale Anzahl an Nachrichten
 * @returns {Array} Chat-Verlauf
 */
export function getGuildChatHistory(guildId, limit = 50) {
  const db = getDatabase();
  const stmts = getStatements();
  
  try {
    if (stmts.getGuildChatHistory) {
      return stmts.getGuildChatHistory.all(guildId, limit).reverse();
    }
    return db.prepare(`
      SELECT id, player, message, timestamp, type, guildId
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

/**
 * Sendet den Chat-Verlauf an einen Client
 * @param {WebSocket} ws - WebSocket-Verbindung
 * @param {string|null} guildId - Optionale Gilden-ID
 */
export function sendChatHistory(ws, guildId = null) {
  const db = getDatabase();
  const stmts = getStatements();
  
  try {
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
}

/**
 * Broadcastet eine Chat-Nachricht an alle Clients
 * @param {Map} clients - WebSocket-Client-Map
 * @param {string} messageType - Typ der Nachricht ('global' oder 'guild')
 * @param {Object} msg - Die Nachricht
 */
export function broadcastChatMessage(clients, messageType, msg) {
  console.log(`[Chat:${messageType === 'global' ? 'Global' : `Guild:${msg.guildId}`}] ${msg.player}: ${msg.message}`);
  broadcast(clients, `chat:${messageType}Message`, msg);
}
