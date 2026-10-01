'use strict';
// Testes de cache da engine WASM (engine.js): a leitura do Cache Storage tem
// que usar a MESMA chave de escrita do ModelManager (models.js). Sem a
// normalizacao, repo digitado com trailing slash gerava uma URL de cache
// diferente da usada no download e o modelo "nao aparecia" no cache.
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.js'), 'utf8');

function makeCacheStore() {
  const map = new Map();
  const opened = [];
  const cache = {
    match: (url) => Promise.resolve(map.get(String(url)) || undefined),
    put: (url, resp) => { map.set(String(url), resp); return Promise.resolve(); }
  };
  const caches = {
    open: (name) => { opened.push(name); return Promise.resolve(cache); },
    keys: () => Promise.resolve(['hemorroida-models-v1']),
    _map: map,
    _opened: opened
  };
  return { caches, map, opened };
}

let store;
let Engine; // modulo engine.js importado como ESM

before(async () => {
  store = makeCacheStore();

  // Globals usados na avaliacao do modulo (top-level: window/CustomEvent;
  // runtime: caches/ModelManager).
  global.window = {
    dispatchEvent: () => {},
    addEventListener: () => {}
  };
  if (typeof global.CustomEvent === 'undefined') {
    global.CustomEvent = class CustomEvent {
      constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; }
    };
  }
  globalThis.caches = store.caches;

  // engine.js e ESM porem o package e "commonjs": importa via data URL p/ o
  // Node parsear como modulo (o navegador carrega com <script type="module">).
  const url = 'data:text/javascript;base64,' + Buffer.from(engineSrc, 'utf8').toString('base64');
  Engine = await import(url);
});

test('modulo expoe window.HemorroidaEngine com a superficie esperada', () => {
  const surface = Object.keys(window.HemorroidaEngine).sort();
  assert.deepStrictEqual(surface, [
    'chat',
    'generate',
    'getCachedBlob',
    'initWasm',
    'isModelLoaded',
    'loadModelFromCache',
    'unloadModel'
  ].sort());
});

test('getCachedBlob acha modelo baixado por repo com trailing slash', async () => {
  // Regressao: models.js normaliza "org/repo/" para "org/repo" na hora de
  // gravar; engine.js construia a URL na mao ("org/repo//resolve/...") e
  // nunca encontrava a entrada (cache miss eterno apos download).
  delete global.ModelManager; // garante que o caminho SEM ModelManager ja normaliza
  const repo = 'org/repo/';
  const file = 'modelo.gguf';
  const normalizedUrl = 'https://huggingface.co/org/repo/resolve/main/' + file;
  store.map.set(normalizedUrl, { blob: () => Promise.resolve(new Blob(['gguf-bytes'])) });

  const blob = await Engine.getCachedBlob(repo, file, 'main');
  assert.strictEqual(blob.size, 10);
});

test('getCachedBlob usa ModelManager.fileURL e cacheName quando disponivel', async () => {
  const { loadScriptFile } = require('./harness');
  const MM = loadScriptFile('./models.js', {
    session: 'ecache',
    globals: { window: { caches: store.caches }, caches: store.caches },
    exposes: ['ModelManager']
  }).exposed.ModelManager;

  global.ModelManager = MM;
  try {
    // cacheName compartilhado: engine nao pode abrir outro cache que o do download
    store.opened.length = 0;
    const repo = 'org/com-barra/';
    const file = 'x.gguf';
    store.map.set(MM.fileURL(repo, file, 'main'), { blob: () => Promise.resolve(new Blob(['ok'])) });

    const blob = await Engine.getCachedBlob(repo, file, 'main');
    assert.strictEqual(blob.size, 2);
    assert.deepStrictEqual(store.opened, [MM.cacheName], 'engine deve abrir o cache do ModelManager');
  } finally {
    delete global.ModelManager;
  }
});

test('getCachedBlob rejeita com aviso claro quando nao esta em cache', async () => {
  delete global.ModelManager;
  await assert.rejects(
    () => Engine.getCachedBlob('org/ausente', 'nada.gguf', 'main'),
    /Modelo nao esta em cache/
  );
});

test('unloadModel sem instancia carregada resolve sem lancar', async () => {
  await assert.doesNotReject(() => Engine.unloadModel());
});
