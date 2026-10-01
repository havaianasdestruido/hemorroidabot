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

// ---- Coordenacao carga x descarga (generation + loadChain) ----

test('carga pedida antes da descarga rejeita como obsoleta (sem init)', async () => {
  // A generation e capturada no momento do pedido; a descarga a invalida.
  // O stale check roda ANTES do initWasm (que tentaria importar o wllama).
  const loadP = Engine.loadModelFromCache('org/repo', 'a.gguf', 'main');
  const unloadP = Engine.unloadModel();
  await assert.rejects(loadP, /Carga cancelada/);
  await assert.doesNotReject(() => unloadP);
});

test('descarga espera a carga existente antes de concluir', async () => {
  // unloadModel encadeia no loadChain: a carga precisa SETTLE antes de a
  // descarga concluir (aqui a carga rejeita rapido, sem chegar na init).
  const events = [];
  const loadP = Engine.loadModelFromCache('org/repo', 'b.gguf', 'main')
    .catch(function(e) { events.push('load'); throw e; });
  const unloadP = Engine.unloadModel().then(function() { events.push('unload'); });
  await assert.rejects(loadP);
  await assert.doesNotReject(() => unloadP);
  assert.deepStrictEqual(events, ['load', 'unload'], 'descarga so conclui depois da carga');
  assert.strictEqual(Engine.isModelLoaded(), false, 'estado limpo apos a descarga');
});

test('carga pedida depois da descarga nao e obsoleta (entra na fila)', async () => {
  await assert.doesNotReject(() => Engine.unloadModel());
  let err = null;
  try {
    await Engine.loadModelFromCache('org/repo', 'c.gguf', 'main');
  } catch (e) { err = e; }
  assert.ok(err, 'carga deve chegar na init (que falha na importacao neste ambiente)');
  assert.ok(!/Carga cancelada/.test(err.message), 'nao deve rejeitar como obsoleta: ' + err.message);
});

test('coalescing de carga considera a generation (mesmo modelo pos-descarga)', async () => {
  const p1 = Engine.loadModelFromCache('org/repo', 'd.gguf', 'main');
  const p2 = Engine.loadModelFromCache('org/repo', 'd.gguf', 'main');
  assert.strictEqual(p1, p2, 'mesma generation + mesmo modelo = mesma promise');
  const unloadP = Engine.unloadModel();
  const p3 = Engine.loadModelFromCache('org/repo', 'd.gguf', 'main');
  assert.notStrictEqual(p3, p1, 'generation nova nao reusa a promise obsoleta');
  await assert.rejects(p1, /Carga cancelada/);
  await assert.rejects(p3); // roda apos a descarga e falha na init (ambiente)
  await assert.doesNotReject(() => unloadP);
});
