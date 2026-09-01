const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const PORT = 8123;
const BASE = `http://localhost:${PORT}`;
let child;

function waitForServer(url, retries = 60, delayMs = 200) {
  return new Promise((resolve, reject) => {
    const attempt = async (n) => {
      try {
        const r = await fetch(url);
        if (r.ok) return resolve(r);
        throw new Error(`status ${r.status}`);
      } catch (err) {
        if (n <= 0) return reject(new Error(`server not ready after ${retries} retries: ${err.message}`));
        setTimeout(() => attempt(n - 1), delayMs);
      }
    };
    attempt(retries);
  });
}

before(async () => {
  child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    cwd: __dirname + '/..',
  });
  child.on('error', (err) => { throw err; });
  await waitForServer(`${BASE}/`);
});

after(() => {
  if (child) child.kill();
});

test('GET / returns 200 and contains <title>HemorróidaBot</title>', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(body.includes('<title>HemorróidaBot</title>'));
});

test('GET /index.html returns 200 and Content-Type starts with text/html', async () => {
  const res = await fetch(`${BASE}/index.html`);
  assert.equal(res.status, 200);
  const ct = res.headers.get('content-type');
  assert.ok(ct.startsWith('text/html'), `Expected text/html, got ${ct}`);
});

test('GET /brain.js returns 200 and Content-Type is text/javascript', async () => {
  const res = await fetch(`${BASE}/brain.js`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/javascript; charset=utf-8');
});

test('GET /engine.js returns 200', async () => {
  const res = await fetch(`${BASE}/engine.js`);
  assert.equal(res.status, 200);
});

test('GET /models.js returns 200', async () => {
  const res = await fetch(`${BASE}/models.js`);
  assert.equal(res.status, 200);
});

test('GET /app.js returns 200', async () => {
  const res = await fetch(`${BASE}/app.js`);
  assert.equal(res.status, 200);
});

test('GET /vendor/wllama-compat/wllama.wasm returns 200 with application/wasm', async () => {
  const res = await fetch(`${BASE}/vendor/wllama-compat/wllama.wasm`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/wasm');
});

test('200 responses include COOP and COEP headers', async () => {
  const res = await fetch(`${BASE}/index.html`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(res.headers.get('cross-origin-embedder-policy'), 'require-corp');
});

test('GET /nonexistent-file-xyz returns 404', async () => {
  const res = await fetch(`${BASE}/nonexistent-file-xyz`);
  assert.equal(res.status, 404);
});

test('Path traversal attempt is blocked (403 or 404, no package.json leak)', async () => {
  const res = await fetch(`${BASE}/..%2f..%2fpackage.json`);
  assert.ok(
    res.status === 403 || res.status === 404,
    `Expected 403 or 404 for traversal, got ${res.status}`
  );
  const body = await res.text();
  assert.ok(
    !body.includes('hemorroidabot'),
    'Response must not contain package description'
  );
});
