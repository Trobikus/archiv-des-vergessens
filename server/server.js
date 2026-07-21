/**
 * ============================================================
 * FILE: server/server.js – Multiplayer Backend Server (WebSockets)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Echtes Echtzeit-Broadcasting von Globalen & Gilden-Chats
 * - Speicherung und Auslieferung von Globalen Bestenlisten (Leaderboard)
 * - Sicheres Speichern & Laden von Spielständen (Cloud Saves)
 * - Extrem ressourcensparend (perfekt für 1 GB RAM e2-micro VMs)
 * ============================================================
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- KONTANTEN & CONFIG ----
const PORT = process.env.PORT || 8080;
const DATA_DIR = join(__dirname, 'data');
const SAVES_DIR = join(DATA_DIR, 'saves');
const LEADERBOARD_FILE = join(DATA_DIR, 'leaderboard.json');

// ---- GLOBALE STATS & CACHE ----
const clients = new Map(); // Map: WebSocket -> { userId, username, guildId }
let leaderboardCache = [];

// ============================================================
// DATEN-VERZEICHNISSE INITIALISIEREN
// ============================================================
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(SAVES_DIR, { recursive: true });

    // Lade Bestenliste aus Datei (falls vorhanden)
    try {
      const data = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
      leaderboardCache = JSON.parse(data);
      console.log(`[Storage] ${leaderboardCache.length} Leaderboard-Einträge geladen.`);
    } catch {
      leaderboardCache = [];
      await saveLeaderboard();
      console.log('[Storage] Neues Leaderboard initialisiert.');
    }
  } catch (err) {
    console.error('[Storage] Fehler bei der Initialisierung:', err);
  }
}

async function saveLeaderboard() {
  try {
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboardCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Fehler beim Speichern des Leaderboards:', err);
  }
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

// Nachricht an einen bestimmten Client senden
function send(ws, type, payload) {
  if (ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify({ type, payload }));
  }
}

// Nachricht an ALLE verbundenen Clients senden (z.B. globaler Chat)
function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  for (const [ws] of clients) {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

// Nachricht an alle Mitglieder einer bestimmten Gilde senden
function broadcastToGuild(guildId, type, payload) {
  if (!guildId) return;
  const msg = JSON.stringify({ type, payload });
  for (const [ws, info] of clients) {
    if (info.guildId === guildId && ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

// String-Bereinigung gegen HTML-Injection
function sanitize(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
  
  // temporäre Registrierung des nackten Sockets
  clients.set(ws, { userId: null, username: 'Anonymus', guildId: null });

  ws.on('message', async (message) => {
    try {
      const { type, payload } = JSON.parse(message);
      const clientInfo = clients.get(ws);

      switch (type) {
        // ---- 1. HANDSHAKE / LOGIN ----
        case 'auth': {
          const rawUserId = sanitize(payload.userId, 50);
          const rawUsername = sanitize(payload.username, 25) || 'Unbekannter Held';
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
            // Verhindere Directory Traversal Angriffe
            const safeUserId = basename(clientInfo.userId);
            const savePath = join(SAVES_DIR, `save_${safeUserId}.json`);
            
            const fileData = {
              userId: clientInfo.userId,
              timestamp: Date.now(),
              saveData: payload.saveData,
              version: payload.version || '1.6'
            };

            await fs.writeFile(savePath, JSON.stringify(fileData, null, 2), 'utf-8');
            console.log(`[CloudSave] Spielstand für ${clientInfo.username} gespeichert.`);
            send(ws, 'cloud:save:success', { timestamp: fileData.timestamp });
          } catch (err) {
            console.error('[CloudSave] Fehler beim Speichern:', err);
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
            const safeUserId = basename(clientInfo.userId);
            const savePath = join(SAVES_DIR, `save_${safeUserId}.json`);

            const rawData = await fs.readFile(savePath, 'utf-8');
            const fileData = JSON.parse(rawData);
            send(ws, 'cloud:load:success', fileData);
            console.log(`[CloudSave] Spielstand für ${clientInfo.username} geladen.`);
          } catch (err) {
            // Datei existiert nicht ist ein normaler Fall (neuer User)
            send(ws, 'cloud:load:success', { saveData: null });
          }
          break;
        }

        // ---- 4. GLOBAL LEADERBOARD ----
        case 'leaderboard:submit': {
          if (!clientInfo.userId) return;

          const prestige = Math.max(0, parseInt(payload.prestige) || 0);
          const bosses = Math.max(0, parseInt(payload.bosses) || 0);
          const level = Math.max(1, parseInt(payload.level) || 1);

          // Suche nach bestehendem Eintrag für diesen User
          let entry = leaderboardCache.find(e => e.userId === clientInfo.userId);
          
          if (!entry) {
            entry = {
              userId: clientInfo.userId,
              username: clientInfo.username,
              prestige,
              bosses,
              level,
              timestamp: Date.now()
            };
            leaderboardCache.push(entry);
          } else {
            // Nur aktualisieren, wenn besser
            let updated = false;
            if (prestige > entry.prestige) { entry.prestige = prestige; updated = true; }
            if (bosses > entry.bosses) { entry.bosses = bosses; updated = true; }
            if (level > entry.level) { entry.level = level; updated = true; }
            
            if (updated) {
              entry.username = clientInfo.username; // Falls Name geändert wurde
              entry.timestamp = Date.now();
            }
          }

          // Sortieren nach: 1. Prestige, 2. Boss-Kills, 3. Level
          leaderboardCache.sort((a, b) => {
            if (b.prestige !== a.prestige) return b.prestige - a.prestige;
            if (b.bosses !== a.bosses) return b.bosses - a.bosses;
            return b.level - a.level;
          });

          // Begrenze Bestenliste auf Top 100
          if (leaderboardCache.length > 100) {
            leaderboardCache = leaderboardCache.slice(0, 100);
          }

          await saveLeaderboard();
          console.log(`[Leaderboard] Highscore aktualisiert für ${clientInfo.username}`);
          
          // Sende aktualisierte Top 10 an alle zurück
          broadcast('leaderboard:update', leaderboardCache.slice(0, 10));
          break;
        }

        case 'leaderboard:get': {
          // Sende die Top 10 zurück an den Anfragesteller
          send(ws, 'leaderboard:update', leaderboardCache.slice(0, 10));
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
