import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

let dataDir;
let port;
let serverProcess;
const externalServerUrl = process.env.SERVER_URL;
const inboxes = new WeakMap();

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(externalServerUrl || `ws://127.0.0.1:${port}`);
    ws.once('open', () => {
      const inbox = { messages: [], waiters: [] };
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        const waiter = inbox.waiters.shift();
        if (waiter) waiter(message);
        else inbox.messages.push(message);
      });
      inboxes.set(ws, inbox);
      resolve(ws);
    });
    ws.once('error', reject);
  });
}

function nextMessage(ws) {
  const inbox = inboxes.get(ws);
  if (inbox.messages.length) return Promise.resolve(inbox.messages.shift());
  return new Promise((resolve) => inbox.waiters.push(resolve));
}

async function sendAndReceive(ws, type, payload, expectedType) {
  ws.send(JSON.stringify({ type, payload }));
  while (true) {
    const response = await nextMessage(ws);
    if (!expectedType || response.type === expectedType) return response;
  }
}

before(async () => {
  if (externalServerUrl) return;
  dataDir = await mkdtemp(join(tmpdir(), 'archiv-server-test-'));
  port = await getAvailablePort();
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', import.meta.url).pathname,
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timed out.')), 10_000);
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Server läuft auf Port:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProcess.once('error', reject);
    serverProcess.stderr.on('data', (data) => {
      if (data.toString().includes('Fehler bei der Initialisierung')) {
        clearTimeout(timeout);
        reject(new Error(data.toString()));
      }
    });
  });
});

after(async () => {
  if (externalServerUrl) return;
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
    await once(serverProcess, 'exit');
  }
  await rm(dataDir, { recursive: true, force: true });
});

test('rejects cloud access from a guest impersonating a registered user', async () => {
  const victim = await connect();
  const username = `victim_${Date.now()}`;
  const registration = await sendAndReceive(victim, 'auth:register', {
    username,
    email: `${username}@example.com`,
    password: 'securepassword123'
  }, 'auth:register:success');
  assert.equal(registration.type, 'auth:register:success');

  const attacker = await connect();
  await sendAndReceive(attacker, 'auth', { userId: registration.payload.user.id, username: 'Attacker' }, 'auth:success');
  const saveResponse = await sendAndReceive(attacker, 'cloud:save', { saveData: { compromised: true } }, 'cloud:save:error');
  assert.equal(saveResponse.type, 'cloud:save:error');

  const loadResponse = await sendAndReceive(attacker, 'cloud:load', {}, 'cloud:load:error');
  assert.equal(loadResponse.type, 'cloud:load:error');

  victim.close();
  attacker.close();
});

test('permits cloud access for the active registered session', async () => {
  const ws = await connect();
  const username = `member_${Date.now()}`;
  const registration = await sendAndReceive(ws, 'auth:register', {
    username,
    email: `${username}@example.com`,
    password: 'securepassword123'
  }, 'auth:register:success');
  assert.equal(registration.type, 'auth:register:success');

  const saveResponse = await sendAndReceive(ws, 'cloud:save', { saveData: { verified: true } }, 'cloud:save:success');
  assert.equal(saveResponse.type, 'cloud:save:success');

  const loadResponse = await sendAndReceive(ws, 'cloud:load', {}, 'cloud:load:success');
  assert.equal(loadResponse.type, 'cloud:load:success');
  assert.deepEqual(loadResponse.payload.saveData, { verified: true });

  ws.close();
});

test('rejects a connection after its session was superseded by a later login', async () => {
  const firstSession = await connect();
  const username = `rotation_${Date.now()}`;
  const password = 'securepassword123';
  const registration = await sendAndReceive(firstSession, 'auth:register', {
    username,
    email: `${username}@example.com`,
    password
  }, 'auth:register:success');
  assert.equal(registration.type, 'auth:register:success');

  const secondSession = await connect();
  const login = await sendAndReceive(secondSession, 'auth:login', {
    usernameOrEmail: username,
    password
  }, 'auth:login:success');
  assert.equal(login.type, 'auth:login:success');

  const staleSaveResponse = await sendAndReceive(
    firstSession,
    'cloud:save',
    { saveData: { stale: true } },
    'cloud:save:error'
  );
  assert.equal(staleSaveResponse.type, 'cloud:save:error');

  firstSession.close();
  secondSession.close();
});
