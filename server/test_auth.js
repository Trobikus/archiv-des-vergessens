import WebSocket from 'ws';

async function runAuthTest() {
  console.log('Starte Authentifizierungs-Test...');
  
  const ws = new WebSocket('ws://localhost:8080', {
    origin: 'http://localhost:5173'
  });

  ws.on('open', () => {
    console.log('[Test] Verbindung hergestellt. Sende Registrierung...');
    
    ws.send(JSON.stringify({
      type: 'auth:register',
      payload: { 
        username: 'test_user_' + Date.now().toString().slice(-4), 
        email: `test_${Date.now()}@example.com`,
        password: 'securepassword123'
      }
    }));
  });

  ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('[Test] Antwort empfangen:', response.type);
    
    if (response.type === 'auth:register:success') {
      console.log('[Test] Registrierung erfolgreich! Sende Chat-Nachricht...');
      ws.send(JSON.stringify({
        type: 'chat:global',
        payload: { message: 'Hallo nach erfolgreicher Registrierung!' }
      }));
      
      setTimeout(() => ws.close(), 1000);
    }
  });

  ws.on('close', () => {
    console.log('[Test] Verbindung geschlossen.');
  });
}

runAuthTest();
