// Carrega arquivos JS de browser sob Node num contexto VM isolado.
// - localStorage compartilhado entre loads da mesma sessao (simula navegador)
// - atob/btoa/crypto/fetch injetados; globals custom por chamada
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PATH = path.resolve(__dirname, '..');

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  };
}

let sessionCounter = 0;
const sessions = new Map(); // sessionId -> localStorage

const BASE_GLOBALS = () => ({
  console,
  crypto,
  fetch,
  performance,
  atob, btoa,
  Uint8Array, Uint16Array, Float32Array, ArrayBuffer,
  Blob, Response,
  Math, JSON, Date, Map, Set, Error, Promise
});

// Executa arquivo JS de browser num contexto VM isolado.
// opts.session: compartilha localStorage; opts.globals: globals adicionais;
// opts.exposes: nomes de variaveis a extrair do contexto (ex ['Brain']).
function loadScriptFile(rel, opts) {
  opts = opts || {};
  const sessionId = opts.session && ('s' + opts.session);
  let localStorage = sessionId && sessions.get(sessionId);
  if (sessionId && !localStorage) {
    localStorage = makeLocalStorage();
    sessions.set(sessionId, localStorage);
  }
  localStorage = localStorage || makeLocalStorage();
  if (sessionId) sessions.set(sessionId, localStorage);

  const globals = Object.assign({}, BASE_GLOBALS(), opts.globals || {}, { localStorage });

  const code = fs.readFileSync(path.join(PATH, rel), 'utf8');
  const ctx = vm.createContext(globals);
  vm.runInContext(code, ctx, { filename: rel });

  const exposed = {};
  (opts.exposes || []).forEach((name) => {
    try { exposed[name] = vm.runInContext(name, ctx); } catch (e) { exposed[name] = null; }
  });
  return { ctx, exposed, localStorage };
}

module.exports = { loadScriptFile, PATH, makeLocalStorage };