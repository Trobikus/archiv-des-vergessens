import WebSocket from 'ws';

async function runTest() {
  console.log('Starte WebSocket-Verbindungstest...');
  
  // 1. Verbindungsaufbau
  const ws = new WebSocket('ws://localhost:8080', {
    origin: 'http://localhost:5173' // Mock authorized origin
  });

  ws.on('open', () => {
    console.log('[Test] Verbindung hergestellt.');
    
    // 2. Nachricht senden (z.B. Chat-Nachricht ohne Auth)
    // Server expects { type, payload }
    ws.send(JSON.stringify({
      type: 'chat:global',
      payload: { message: 'Hallo vom Test-Skript!' }
    }));
    console.log('[Test] JSON-Nachricht gesendet.');

    // 3. Binäre Nachricht senden (simuliertes Bincode)
    const binaryData = Buffer.from([0x01, 0x02, 0x03]);
    ws.send(binaryData);
    console.log('[Test] Binäre Nachricht gesendet.');
    
    // Warte kurz und trenne dann die Verbindung
    setTimeout(() => {
      console.log('[Test] Trenne Verbindung.');
      ws.close();
    }, 1000);
  });

  ws.on('message', (data) => {
    console.log('[Test] Antwort empfangen:', data.toString());
  });

  ws.on('close', () => {
    console.log('[Test] Verbindung sauber geschlossen.');
  });
  
  ws.on('error', (err) => {
    console.error('[Test] Fehler:', err);
  });
}

runTest();
