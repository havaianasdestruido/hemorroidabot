'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScriptFile } = require('./harness');

function makeCacheStore() {
  const map = new Map();
  const cache = {
    match: (url) => Promise.resolve(map.get(String(url)) || undefined),
    put: (url, resp) => { map.set(String(url), resp); return Promise.resolve(); }
  };
  const caches = {
    open: () => Promise.resolve(cache),
    keys: () => Promise.resolve(['hemorroida-models-v1']),
    _map: map
  };
  return { caches, cache, map };
}

let MM, CTX, store;

beforeEach(() => {
  store = makeCacheStore();
  const loader = loadScriptFile('./models.js', {
    session: 'mstrict-' + Math.random().toString(36).slice(2),
    globals: { window: { caches: store.caches }, caches: store.caches },
    exposes: ['ModelManager']
  });
  MM = loader.exposed.ModelManager;
  CTX = loader.ctx;
});

function mockFetch(ctx, fn) { ctx.fetch = fn; }

function readerStream(chunks, rejectsAfter) {
  let ri = 0;
  return {
    getReader: () => ({
      read: () => {
        if (rejectsAfter && ri >= rejectsAfter) {
          return Promise.reject(new Error('stream broke'));
        }
        if (ri < chunks.length) {
          return Promise.resolve({ value: chunks[ri++], done: false });
        }
        return Promise.resolve({ value: undefined, done: true });
      }
    })
  };
}

test('formatBytes: valores exatos', () => {
  assert.strictEqual(MM.formatBytes(0), '0 B');
  assert.strictEqual(MM.formatBytes(1), '1 B');
  assert.strictEqual(MM.formatBytes(999), '999 B');
  assert.strictEqual(MM.formatBytes(1023), '1023 B');
  assert.strictEqual(MM.formatBytes(1024), '1.00 KB');
  assert.strictEqual(MM.formatBytes(1536), '1.50 KB');
  assert.strictEqual(MM.formatBytes(1048576), '1.00 MB');
  assert.strictEqual(MM.formatBytes(1073741824), '1.00 GB');
  assert.strictEqual(MM.formatBytes(7.5 * 1024 * 1024 * 1024), '7.50 GB');
});

test('formatBytes: entradas degeneradas nao lancam e sao strings', () => {
  for (const v of [NaN, Infinity, -Infinity, undefined, null, -1024, -0, 1024 * 1024 * 1024 * 1024]) {
    let r;
    assert.doesNotThrow(() => { r = MM.formatBytes(v); }, String(v));
    assert.strictEqual(typeof r, 'string', String(v));
  }
  assert.strictEqual(MM.formatBytes(NaN), '0 B');
  assert.strictEqual(MM.formatBytes(undefined), '0 B');
  assert.strictEqual(MM.formatBytes(null), '0 B');
  assert.strictEqual(MM.formatBytes(-0), '0 B');
  assert.strictEqual(MM.formatBytes(-1024), '-1024 B');
  assert.strictEqual(MM.formatBytes(Infinity), 'Infinity TB');
  assert.strictEqual(MM.formatBytes(-Infinity), '-Infinity B');
  assert.strictEqual(MM.formatBytes(1024 ** 4), '1.00 TB');
});

test('fileURL: subdir, revision com slash, chars especiais preservados', () => {
  assert.strictEqual(
    MM.fileURL('org/repo', 'gguf/foo.gguf', 'main'),
    'https://huggingface.co/org/repo/resolve/main/gguf/foo.gguf'
  );
  assert.strictEqual(
    MM.fileURL('org/repo', 'x.gguf', 'rev/slash'),
    'https://huggingface.co/org/repo/resolve/rev/slash/x.gguf'
  );
  assert.strictEqual(
    MM.fileURL('org/repo', 'my file 42%.gguf', '#tag/rev'),
    'https://huggingface.co/org/repo/resolve/#tag/rev/my file 42%.gguf'
  );
  assert.strictEqual(
    MM.fileURL('org/repo', 'a%20b#c.gguf', 'rev#x'),
    'https://huggingface.co/org/repo/resolve/rev#x/a%20b#c.gguf'
  );
});

test('fileURL: repo com trailing slash nao gera barra dupla', () => {
  const plain = MM.fileURL('org/repo', 'x.gguf', 'main');
  assert.strictEqual(MM.fileURL('org/repo/', 'x.gguf', 'main'), plain);
  assert.strictEqual(MM.fileURL('org/repo///', 'x.gguf', 'main'), plain);
  assert.strictEqual(MM.fileURL('org/repo/', 'x.gguf', 'main').slice(8).indexOf('//'), -1);
});

test('findKnown: 4 modelos validos com repos HF exatos', () => {
  assert.strictEqual(MM.knownModels.length, 4);
  const expectedRepos = {
    'qwen-3b': 'Qwen/Qwen2.5-3B-Instruct-GGUF',
    'qwen-7b': 'Qwen/Qwen2.5-7B-Instruct-GGUF',
    'llama-3.2': 'bartowski/Llama-3.2-3B-Instruct-GGUF',
    'gemma-3': 'ggml-org/gemma-3-4b-it-GGUF'
  };
  const ids = MM.knownModels.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, 4, 'ids unicos');
  for (const m of MM.knownModels) {
    assert.strictEqual(typeof m.repo, 'string', 'repo string');
    assert.ok(m.repo.length > 0, 'repo nao vazio');
    assert.strictEqual(typeof m.file, 'string', 'file string');
    assert.ok(m.file.length > 0, 'file nao vazio');
    assert.match(m.file, /\.gguf$/i, 'file termina em .gguf');
    assert.strictEqual(m.repo, expectedRepos[m.id], 'repo HF exato de ' + m.id);
  }
  assert.strictEqual(MM.findKnown('nao-existe'), null);
});

test('listFiles: ok true retorna arvore', async () => {
  mockFetch(CTX, (url) => {
    assert.match(String(url), /api\/models\/org\/repo\/tree\/main$/);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ path: 'a.gguf' }, { path: 'nested/b.gguf' }]) });
  });
  const tree = await MM.listFiles('org/repo', 'main');
  assert.ok(Array.isArray(tree), 'array');
  assert.deepStrictEqual(tree.map((t) => t.path), ['a.gguf', 'nested/b.gguf']);
});

test('listFiles: 404 e 500 rejeitam /Repo nao encontrado/', async () => {
  mockFetch(CTX, () => Promise.resolve({ ok: false, status: 404 }));
  await assert.rejects(() => MM.listFiles('org/repo'), /Repo nao encontrado/);
  mockFetch(CTX, () => Promise.resolve({ ok: false, status: 500 }));
  await assert.rejects(() => MM.listFiles('org/repo'), /Repo nao encontrado/);
});

test('listFiles: fetch rejeita (rede) propaga sem pendurar', async () => {
  mockFetch(CTX, () => Promise.reject(new Error('network down')));
  await assert.rejects(() => MM.listFiles('org/repo'), /network down/);
});

test('listFiles: json() rejeita propaga', async () => {
  mockFetch(CTX, () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error('json boom')) }));
  await assert.rejects(() => MM.listFiles('org/repo'), /json boom/);
});

test('download: body vazio -> blob 0 e onProgress nunca chamado', async () => {
  mockFetch(CTX, () => Promise.resolve({
    ok: true, status: 200,
    headers: { get: () => '0' },
    body: { getReader: () => ({ read: () => Promise.resolve({ value: undefined, done: true }) }) }
  }));
  const progress = [];
  const blob = await MM.download('org/repo', 'empty.gguf', 'main', (r, t) => progress.push([r, t]));
  assert.strictEqual(blob.size, 0);
  assert.strictEqual(progress.length, 0);
});

test('download: sem Content-Length nao gera NaN e nao divide por zero', async () => {
  const chunks = [new Uint8Array([9, 9]), new Uint8Array([7])];
  mockFetch(CTX, () => Promise.resolve({
    ok: true, status: 200,
    headers: { get: () => null },
    body: readerStream(chunks)
  }));
  const progress = [];
  const blob = await MM.download('org/repo', 'data.gguf', 'main', (r, t) => progress.push([r, t]));
  assert.strictEqual(blob.size, 3);
  assert.strictEqual(progress.length, 0, 'sem progresso sem Content-Length');
});

test('download: reader.read() rejeita mid-stream -> download rejeita', async () => {
  mockFetch(CTX, () => Promise.resolve({
    ok: true, status: 200,
    headers: { get: () => '10' },
    body: readerStream([new Uint8Array([1]), new Uint8Array([2])], 1)
  }));
  await assert.rejects(() => MM.download('org/repo', 'x.gguf', 'main'), /stream broke/);
});

test('download: response.ok false -> rejeita /Falha no download/', async () => {
  mockFetch(CTX, () => Promise.resolve({ ok: false, status: 404, headers: { get: () => null }, body: null }));
  await assert.rejects(() => MM.download('org/repo', 'x.gguf', 'main'), /Falha no download/);
});

test('download: response.body null -> rejeita sem pendurar (qualquer erro)', async () => {
  mockFetch(CTX, () => Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, body: null }));
  await assert.rejects(() => MM.download('org/repo', 'x.gguf', 'main'));
});

test('download: cache.match blob() rejeita -> download rejeita (nao resolve)', async () => {
  const url = MM.fileURL('org/repo', 'x.gguf', 'main');
  store.caches._map.set(url, { blob: () => Promise.reject(new Error('readback fail')) });
  mockFetch(CTX, () => { throw new Error('fetch nao deve ser chamado'); });
  await assert.rejects(() => MM.download('org/repo', 'x.gguf', 'main'), /readback fail/);
});

test('download: cache.put rejeita -> download rejeita', async () => {
  store.cache.put = () => Promise.reject(new Error('put fail'));
  mockFetch(CTX, () => Promise.resolve({
    ok: true, status: 200,
    headers: { get: () => '0' },
    body: { getReader: () => ({ read: () => Promise.resolve({ value: undefined, done: true }) }) }
  }));
  await assert.rejects(() => MM.download('org/repo', 'x.gguf', 'main'), /put fail/);
});

test('repoCachedSize: lista vazia -> 0', async () => {
  assert.strictEqual(await MM.repoCachedSize('org/repo', [], 'main'), 0);
});

test('repoCachedSize: arquivo sem cache conta 0 sem crash', async () => {
  assert.strictEqual(await MM.repoCachedSize('org/repo', ['missing.gguf'], 'main'), 0);
  assert.strictEqual(await MM.repoCachedSize('org/repo', ['a.gguf', 'b.gguf', 'c.gguf'], 'main'), 0);
});

test('repoCachedSize: soma apenas cacheados', async () => {
  store.caches._map.set(MM.fileURL('org/repo', 'a.gguf', 'main'), { arrayBuffer: () => Promise.resolve(new ArrayBuffer(12)) });
  store.caches._map.set(MM.fileURL('org/repo', 'b.gguf', 'main'), { arrayBuffer: () => Promise.resolve(new ArrayBuffer(20)) });
  const size = await MM.repoCachedSize('org/repo', ['a.gguf', 'b.gguf', 'c.gguf'], 'main');
  assert.strictEqual(size, 32);
});

test('fileURL: 1000 iteracoes random nao lancam e prefixo correto', () => {
  const CHARS = "abcXYZ0129- _/%.#?=&<>'\"()[]{}!@$^`~;:,\n\t\\";
  const randChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];
  const randStr = (n) => { let s = ''; for (let i = 0; i < n; i++) s += randChar(); return s; };
  for (let i = 0; i < 1000; i++) {
    const repo = randStr(1 + Math.floor(Math.random() * 15));
    const file = randStr(1 + Math.floor(Math.random() * 15));
    const rev = randStr(1 + Math.floor(Math.random() * 10));
    let url;
    assert.doesNotThrow(() => { url = MM.fileURL(repo, file, rev); }, 'iter ' + i);
    assert.ok(url.startsWith('https://huggingface.co/'), url);
  }
});

test('download: cacheado nao chama fetch e isCached true', async () => {
  const url = MM.fileURL('org/repo', 'cached.gguf', 'main');
  store.caches._map.set(url, { blob: () => Promise.resolve(new Blob(['hello!'])) });
  let calls = 0;
  mockFetch(CTX, () => { calls++; throw new Error('fetch nao deve ser chamado'); });
  const blob = await MM.download('org/repo', 'cached.gguf', 'main');
  assert.strictEqual(blob.size, 6);
  assert.strictEqual(calls, 0, 'fetch nao chamado');
  assert.strictEqual(await MM.isCached(url), true);
});