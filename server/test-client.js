/**
 * ============================================================
 * FILE: server/test-client.js – Lokaler Test-Client für WebSockets
 * ============================================================
 * 
 * ZWECK:
 * - Testet lokal, ob der Server startet, Verbindungen annimmt
 * - Prüft Authentifizierung, Chat-Broadcasting und Leaderboard-Daten.
 * ============================================================
 */

import WebSocket from 'ws';

const SERVER_URL = 'ws://localhost:8080';

console.log(`[Test] Verbinde mit Server unter ${SERVER_URL}...`);
const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
  console.log('[Test] Verbindung hergestellt! Sende Authentifizierung (auth)...');
  
  // 1. Handshake / Auth
  ws.send(JSON.stringify({
    type: 'auth',
    payload: {
      userId: 'test_user_123',
      username: 'Mnemoguard',
      guildId: 'test_gilde_abc'
    }
  }));
});

ws.on('message', (data) => {
  const { type, payload } = JSON.parse(data);
  console.log(`[Empfangen] Typ: '${type}'`, payload);

  if (type === 'auth:success') {
    console.log('[Test] Auth erfolgreich! Sende Test-Chatnachricht...');
    
    // 2. Chat senden
    ws.send(JSON.stringify({
      type: 'chat:global',
      payload: {
        message: 'Hallo Welt! Dies ist ein automatischer WebSocket-Test.'
      }
    }));

    // 3. Score senden
    setTimeout(() => {
      console.log('[Test] Sende Highscore an die Bestenliste...');
      ws.send(JSON.stringify({
        type: 'leaderboard:submit',
        payload: {
          prestige: 5,
          bosses: 42,
          level: 80
        }
      }));
    }, 1000);

    // 4. Verbindung nach Test trennen
    setTimeout(() => {
      console.log('[Test] Beende Verbindung. Test erfolgreich abgeschlossen.');
      ws.close();
    }, 3000);
  }
});

ws.on('close', () => {
  console.log('[Test] Verbindung geschlossen.');
});

ws.on('error', (err) => {
  console.error('[Test] Fehler:', err.message);
  console.log('\n--> Stelle sicher, dass der Server lokal läuft! Starte ihn mit "node server.js" im server-Ordner.');
});
