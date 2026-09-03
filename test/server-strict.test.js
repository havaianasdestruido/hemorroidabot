const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const PORT = 8137;
const BASE = `http://localhost:${PORT}`;
const CWD = path.join(__dirname, '..');
const TMP = path.join(__dirname, 'tmp-mime');
let child;
let stderrChunks = [];

const PACKAGE_PIN = '"name": "hemorroidabot"';
const PACKAGE_DESC = 'Esse projeto é um exemplo';
const SERVER_PIN = 'HemorroidaBot servido em';

const TRAVERSALS = [
  '/../package.json',
  '/a/../../package.json',
  '/%2e%2e%2fpackage.json',
  '/%252e%252e%252fpackage.json',
  '/..%5cpackage.json',
  '/%2e%2e%5c%2e%2e%5cpackage.json',
  '/....//package.json',
  '/.../.../package.json',
  '/%00.jpg'
];

const MALFORMED = ['/%zz', '/%', '/%2'];

function getServerMimeMap() {
  const src = fs.readFileSync(path.join(CWD, 'server.js'), 'utf8');
  const map = {};
  const re = /'(\.[a-zA-Z0-9]+)'\s*:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) map[m[1]] = m[2];
  return map;
}

const MIME = getServerMimeMap();
const MIME_FILES = {
  '.html': 'mime.html',
  '.js': 'mime.js',
  '.mjs': 'mime.mjs',
  '.css': 'mime.css',
  '.wasm': 'mime.wasm',
  '.json': 'mime.json',
  '.map': 'mime.map',
  '.md': 'mime.md',
  '.txt': 'mime.txt',
  '.png': 'mime.png',
  '.ico': 'mime.ico'
};

async function waitForServer(url, retries = 80, delayMs = 150) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
      lastErr = new Error(`status ${r.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((res) => setTimeout(res, delayMs));
  }
  throw new Error(`server not ready: ${lastErr ? lastErr.message : 'unknown'} stderr: ${stderrChunks.join('')}`);
}

function rawRequest(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: PORT,
        path: urlPath,
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          })
        );
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

before(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  for (const ext of Object.keys(MIME_FILES)) {
    fs.writeFileSync(path.join(TMP, MIME_FILES[ext]), 'MIMETEST' + ext);
  }
  fs.writeFileSync(path.join(TMP, 'data.xyz'), 'XYZTEST');
  child = spawn(process.execPath, ['server.js'], {
    cwd: CWD,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  child.stderr.on('data', (d) => stderrChunks.push(String(d)));
  await waitForServer(`${BASE}/`);
});

after(() => {
  if (child) child.kill();
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('GET / returns 200 with COOP/COEP headers', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(res.headers.get('cross-origin-embedder-policy'), 'require-corp');
});

for (const p of TRAVERSALS) {
  test(`path traversal blocked: ${p}`, async () => {
    let res;
    try {
      res = await rawRequest(p);
    } catch (err) {
      assert.fail(`server crashed or refused for ${p}: ${err.message}`);
    }
    assert.ok(
      res.status === 403 || res.status === 404,
      `${p} unexpected status ${res.status}, body: ${res.body.slice(0, 80)}`
    );
    assert.ok(!res.body.includes(PACKAGE_PIN), `${p} leaked package.json name`);
    assert.ok(!res.body.includes(PACKAGE_DESC), `${p} leaked package.json description`);
    assert.ok(!res.body.includes(SERVER_PIN), `${p} leaked server.js content`);
    assert.ok(res.body.length < 2000, `${p} returned suspiciously large body (${res.body.length})`);
  });
}

test('server survives all traversal attempts', async () => {
  const res = await fetch(`${BASE}/index.html`);
  assert.equal(res.status, 200);
});

for (const p of MALFORMED) {
  test(`malformed encoding handled without crash: ${p}`, async () => {
    let res;
    try {
      res = await rawRequest(p);
    } catch (err) {
      assert.fail(`server crashed for ${p}: ${err.message}`);
    }
    assert.equal(res.status, 400);
    assert.ok(!res.body.includes(PACKAGE_PIN));
  });
}

test('server survives malformed encodings', async () => {
  const res = await fetch(`${BASE}/index.html`);
  assert.equal(res.status, 200);
});

test('double-encoded null byte does not crash and returns 404', async () => {
  const res = await rawRequest('/%2500.jpg');
  assert.equal(res.status, 404);
  const ok = await fetch(`${BASE}/index.html`);
  assert.equal(ok.status, 200);
});

test('MIME map in server.js declares all 11 extensions', () => {
  assert.equal(Object.keys(MIME).length, 11);
  assert.equal(MIME['.wasm'], 'application/wasm');
  assert.equal(MIME['.js'], 'text/javascript; charset=utf-8');
});

for (const ext of Object.keys(MIME_FILES)) {
  test(`Content-Type for ${ext} is ${MIME[ext]}`, async () => {
    const res = await fetch(`${BASE}/test/tmp-mime/${MIME_FILES[ext]}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), MIME[ext]);
  });
}

test('unknown extension falls back to application/octet-stream', async () => {
  const res = await fetch(`${BASE}/test/tmp-mime/data.xyz`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/octet-stream');
});

test('query string on asset: /index.html?x=1', async () => {
  const res = await fetch(`${BASE}/index.html?x=1`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(body.includes('<title>HemorróidaBot</title>'));
});

test('query string on js asset: /engine.js?cb=123', async () => {
  const res = await fetch(`${BASE}/engine.js?cb=123`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/javascript; charset=utf-8');
});

test('trailing slash /vendor/ does not serve directory listing', async () => {
  const res = await fetch(`${BASE}/vendor/`);
  assert.ok(res.status === 403 || res.status === 404, `status ${res.status}`);
  const body = await res.text();
  assert.ok(!/<a href/i.test(body), 'directory listing leaked');
});

test('HEAD /index.html returns 200, empty body, COOP/COEP present', async () => {
  const res = await fetch(`${BASE}/index.html`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.equal(body.length, 0);
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(res.headers.get('cross-origin-embedder-policy'), 'require-corp');
  const cl = res.headers.get('content-length');
  const realSize = fs.statSync(path.join(CWD, 'index.html')).size;
  assert.ok(cl === null || cl === '0' || Number(cl) === realSize, `content-length ${cl}`);
});

test('case sensitivity /INDEX.HTML observed behavior', async () => {
  const res = await fetch(`${BASE}/INDEX.HTML`);
  assert.ok(res.status === 200 || res.status === 404, `status ${res.status}`);
  if (res.status === 200) {
    const body = await res.text();
    assert.ok(body.includes('<title>HemorróidaBot</title>'));
  }
});

test('very long URL path does not crash server', async () => {
  const longPath = '/' + 'x'.repeat(9000);
  let status;
  try {
    const res = await fetch(BASE + longPath, { signal: AbortSignal.timeout(15000) });
    status = res.status;
    await res.text();
  } catch (err) {
    assert.fail('long URL crashed or hung: ' + err.message);
  }
  assert.ok(status === 404 || status >= 400, `long path status ${status}`);
  const ok = await fetch(`${BASE}/index.html`);
  assert.equal(ok.status, 200);
});

test('query with plus /?a+b=c does not 500', async () => {
  const res = await fetch(`${BASE}/?a+b=c`);
  assert.equal(res.status, 200);
});

test('20 concurrent GET / all return 200', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => fetch(`${BASE}/`)));
  for (const r of results) {
    assert.equal(r.status, 200);
  }
});

test('POST / responds without hanging', async () => {
  const res = await fetch(`${BASE}/`, { method: 'POST', body: 'ping' });
  assert.equal(res.status, 200);
});