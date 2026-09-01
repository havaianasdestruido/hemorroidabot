'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScriptFile } = require('./harness');

// ---- mock de CacheStorage (Cache API) ----
function makeCacheStore() {
  const map = new Map(); // url -> {blob: Blob, arrayBuffer}
  const cache = {
    match: (url) => Promise.resolve(map.get(String(url)) || undefined),
    put: (url, resp) => { map.set(String(url), resp); return Promise.resolve(); }
  };
  const caches = {
    open: () => Promise.resolve(cache),
    keys: () => Promise.resolve(['hemorroida-models-v1']),
    _map: map
  };
  return { caches, cache };
}

let MM;        // ModelManager
let CTX;       // contexto VM (para mockar fetch)
let store;     // mock cache map

beforeEach(() => {
  store = makeCacheStore();
  const loader = loadScriptFile('./models.js', {
    session: 'm-' + Math.random().toString(36).slice(2),
    globals: { window: { caches: store.caches }, caches: store.caches },
    exposes: ['ModelManager']
  });
  MM = loader.exposed.ModelManager;
  CTX = loader.ctx;
});

function mockFetch(ctx, fn) {
  ctx.fetch = fn;
}

test('ModelManager expoe API', () => {
  assert.ok(MM, 'ModelManager nao definido');
  for (const k of ['knownModels','findKnown','formatBytes','fileURL','isCached','download','downloadFile','listFiles','repoCachedSize']) {
    assert.ok(typeof MM[k] !== 'undefined', 'falta ' + k);
  }
});

test('formatBytes converte unidades', () => {
  assert.strictEqual(MM.formatBytes(0), '0 B');
  assert.strictEqual(MM.formatBytes(512), '512 B');
  assert.strictEqual(MM.formatBytes(1024), '1.00 KB');
  assert.strictEqual(MM.formatBytes(1024 * 1024 * 5.5), '5.50 MB');
  assert.strictEqual(MM.formatBytes(1024 ** 3), '1.00 GB');
});

test('findKnown mapea ids', () => {
  assert.strictEqual(MM.findKnown('qwen-3b').repo, 'Qwen/Qwen2.5-3B-Instruct-GGUF');
  assert.match(MM.findKnown('llama-3.2').file, /Llama-3\.2-3B/);
  assert.strictEqual(MM.findKnown('nao-existe'), null);
});

test('fileURL monta URL do HF', () => {
  assert.strictEqual(
    MM.fileURL('a/b', 'x.gguf', 'main'),
    'https://huggingface.co/a/b/resolve/main/x.gguf'
  );
  assert.match(MM.fileURL('a/b', 'x.gguf', 'rev2'), /\/rev2\/x\.gguf$/);
});

test('listFiles parseia arvore do HF', async () => {
  mockFetch(CTX, (url) => {
    assert.match(String(url), /huggingface\.co\/api\/models/);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ path: 'a.gguf' }, { path: 'b.gguf' }])
    });
  });
  const tree = await MM.listFiles('repo/x', 'main');
  assert.deepStrictEqual(tree.map(t => t.path), ['a.gguf', 'b.gguf']);
});

test('listFiles falha com HTTP error', async () => {
  mockFetch(CTX, () => Promise.resolve({ ok: false, status: 404 }));
  await assert.rejects(() => MM.listFiles('repo/x', 'main'), /Repo nao encontrado/);
});

test('download salva em cache e progresso dispara', async () => {
  const chunks = [new Uint8Array([1,2,3,4]), new Uint8Array([5,6])];
  let ri = 0;
  const fakeBody = { getReader: () => ({
    read: () => {
      if (ri < chunks.length) { const v = chunks[ri++]; return Promise.resolve({ value: v, done: false }); }
      return Promise.resolve({ value: undefined, done: true });
    }
  }) };

  mockFetch(CTX, (url) => {
    assert.match(String(url), /resolve\/main\/x\.gguf$/);
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: (k) => (k === 'Content-Length' ? '6' : '') },
      body: fakeBody
    });
  });

  const progress = [];
  const blob = await MM.download('a/b', 'x.gguf', 'main', (received, total) => progress.push([received, total]));
  assert.ok(blob instanceof Blob, 'blob valido');
  assert.strictEqual(blob.size, 6);
  assert.deepStrictEqual(progress, [[4, 6], [6, 6]]);
  assert.ok(store.caches._map.has(MM.fileURL('a/b', 'x.gguf', 'main')), 'gravou no cache');
});

test('download reusa cache quando existir', async () => {
  const url = MM.fileURL('a/b', 'x.gguf', 'main');
  store.caches._map.set(url, { blob: () => Promise.resolve(new Blob(['cached!'])) });

  let fetchCalled = false;
  mockFetch(CTX, () => { fetchCalled = true; throw new Error('nao deve chamar fetch'); });
  const blob = await MM.download('a/b', 'x.gguf', 'main');
  assert.strictEqual(blob.size, 7, 'blob do cache');
  assert.strictEqual(fetchCalled, false, 'fetch nao chamado quando cacheado');
});

test('isCached detecta presenca no cache', async () => {
  const url = MM.fileURL('a/b', 'x.gguf', 'main');
  assert.strictEqual(await MM.isCached(url), false);
  store.caches._map.set(url, { blob: () => Promise.resolve(new Blob(['x'])) });
  assert.strictEqual(await MM.isCached(url), true);
});

test('repoCachedSize soma tamanhos', async () => {
  store.caches._map.set(MM.fileURL('a/b', 'f1', 'main'), { arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) });
  store.caches._map.set(MM.fileURL('a/b', 'f2', 'main'), { arrayBuffer: () => Promise.resolve(new ArrayBuffer(5)) });
  const size = await MM.repoCachedSize('a/b', ['f1', 'f2', 'f3'], 'main');
  assert.strictEqual(size, 15);
});