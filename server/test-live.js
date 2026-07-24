import WebSocket from 'ws';

const SERVER_URL = process.env.SERVER_URL || process.env.VITE_WS_URL || 'wss://api.archiv-des-vergessens.de';

console.log(`[Test] Connecting to live server under ${SERVER_URL}...`);
const ws = new WebSocket(SERVER_URL);

const timeout = setTimeout(() => {
  console.error('[Test] Connection timed out (10s)');
  ws.close();
  process.exit(1);
}, 10000);

ws.on('open', () => {
  clearTimeout(timeout);
  console.log('[Test] Successfully connected to live server!');
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  clearTimeout(timeout);
  console.error('[Test] Connection failed with error:', err.message);
  process.exit(1);
});
