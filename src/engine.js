// HemorroidaBot Engine - executa .gguf via @wllama/wllama (WebAssembly llama.cpp)
// Le o blob do Cache Storage do navegador e gera respostas 100% local.

const WLLAMA_JS_URL = '../vendor/wllama/index.js';
const WLLAMA_WASM_DEFAULT = '../vendor/wllama/wasm/wllama.wasm';
const WLLAMA_COMPAT_JS = '../vendor/wllama-compat/wllama.js';
const WLLAMA_COMPAT_WASM = '../vendor/wllama-compat/wllama.wasm';
const CACHE_NAME_DEFAULTS = 'hemorroida-models-v1';
const translate = function(key, vars, fallback) { return typeof I18n !== 'undefined' ? I18n.t(key, vars) : fallback; };

let WllamaModule = null;
let instance = null;
let currentSource = null; // { repo, file }
let initPromise = null;   // evita instancias WASM duplicadas em init concorrente
let loadInFlight = null;  // { key, promise } - cargas simultaneas do mesmo modelo
let loadChain = Promise.resolve(); // serializa cargas de modelos diferentes

async function getWllamaClass() {
  if (WllamaModule) return WllamaModule.Wllama;
  WllamaModule = await import(WLLAMA_JS_URL);
  return WllamaModule.Wllama;
}

function ensureEngine() {
  if (!instance) {
    throw new Error(translate('engine.notInitialized', null, 'Engine nao inicializado. Carregue um modelo primeiro.'));
  }
  return instance;
}

// Mesmo nome de cache do ModelManager (fonte unica; fallback p/ uso isolado).
function modelsCacheName() {
  if (typeof ModelManager !== 'undefined' && ModelManager && ModelManager.cacheName) {
    return ModelManager.cacheName;
  }
  return CACHE_NAME_DEFAULTS;
}

// Mesma URL de cache do ModelManager (normaliza trailing slash do repo).
// Sem isso, um repo digitado com "/" final e baixo por um URL e lido por outro
// ("org/repo/" vs "org/repo") e o modelo nunca aparece como cacheado.
function modelFileURL(repo, file, revision) {
  if (typeof ModelManager !== 'undefined' && ModelManager && typeof ModelManager.fileURL === 'function') {
    return ModelManager.fileURL(repo, file, revision);
  }
  var rev = revision || 'main';
  var base = String(repo).replace(/\/+$/, '');
  return 'https://huggingface.co/' + base + '/resolve/' + rev + '/' + file;
}

// Obtem blob do Cache Storage (baixado via models.js)
function getCachedBlob(repo, file, revision) {
  const url = modelFileURL(repo, file, revision);
  return caches.open(modelsCacheName()).then(function(cache) {
    return cache.match(url).then(function(resp) {
      if (!resp) throw new Error(translate('engine.notCached', null, 'Modelo nao esta em cache. Baixe primeiro.'));
      return resp.blob();
    });
  });
}

// Inicializa a engine WASM (carrega o runtime llama.cpp).
async function initWasm() {
  if (instance) return;
  if (!initPromise) {
    initPromise = (async function() {
      const Wllama = await getWllamaClass();
      if (instance) return;

      const paths = {
        default: WLLAMA_WASM_DEFAULT
      };
      instance = new Wllama(paths, {
        allowOffline: true,
        logger: {
          debug: function() {},
          log: function() {},
          warn: function() {},
          error: function() {}
        }
      });

      // Usa recursos compat locais (necessario em Chrome/Safari).
      try {
        instance.setCompat({
          worker: WLLAMA_COMPAT_JS,
          wasm: WLLAMA_COMPAT_WASM
        });
      } catch (e) {
        console.warn('Compat mode indisponivel, usando build padrao.', e);
      }
    })().catch(function(e) {
      initPromise = null; // permite tentar de novo apos falha
      throw e;
    });
  }
  return initPromise;
}

async function doLoadModelFromCache(repo, file, revision) {
  await initWasm();
  const engine = ensureEngine();
  const blob = await getCachedBlob(repo, file, revision);
  await engine.loadModel([blob], {
    n_ctx: 2048,
    n_threads: 4,
    pooling_type: 'none'
  });
  currentSource = { repo: repo, file: file };
  return { repo: repo, file: file };
}

// Carrega um modelo .gguf do cache do navegador.
// Cargas simultaneas: do mesmo modelo reusam a promise em voo (duplo clique);
// de modelos diferentes entram em fila p/ nao chamar loadModel 2x na instancia.
function loadModelFromCache(repo, file, revision) {
  const key = String(repo) + '@' + String(revision || 'main') + '/' + String(file);
  if (loadInFlight && loadInFlight.key === key) return loadInFlight.promise;
  const promise = loadChain
    .catch(function() { /* erro da carga anterior nao bloqueia a proxima */ })
    .then(function() { return doLoadModelFromCache(repo, file, revision); })
    .finally(function() {
      if (loadInFlight && loadInFlight.promise === promise) loadInFlight = null;
    });
  loadChain = promise.catch(function() {});
  loadInFlight = { key: key, promise: promise };
  return promise;
}

// Gera texto. Retorna Promise<string>. onToken recebe fragmento incremental.
async function generate(prompt, opts) {
  const engine = ensureEngine();
  opts = opts || {};
  const maxTokens = opts.maxTokens || 512;

  let full = '';
  const t0 = performance.now();
  await engine.createCompletion({
    prompt: prompt,
    n_predict: maxTokens,
    temperature: opts.temperature || 0.7,
    top_k: 40,
    top_p: 0.9,
    stream: true,
    onData: function(data) {
      if (data && data.choices && data.choices.length) {
        const delta = data.choices[0].text || '';
        full += delta;
        if (typeof opts.onToken === 'function') opts.onToken(delta);
      }
    }
  });
  if (typeof opts.onPerf === 'function') opts.onPerf(full.length, performance.now() - t0);
  return full;
}

// Chat com template do modelo + memoria. messages = [{role, content}].
// Retorna { text, perf:{ms, charsPerSec, approxTokens} }.
async function chat(messages, opts) {
  const engine = ensureEngine();
  opts = opts || {};
  const maxTokens = opts.maxTokens || 2048;

  const msgs = messages.map(function(m) {
    return { role: m.role, content: m.content };
  });
  if (typeof opts.system === 'string') {
    msgs.unshift({ role: 'system', content: opts.system });
  }

  let full = '';
  let tk = 0; // aprox: chars/4
  const t0 = performance.now();

  // createChatCompletion com stream:true nao emite dados neste build de wllama
  // (retorna vazio). Usamos stream:false e lemos o conteudo final do objeto.
  const res = await engine.createChatCompletion({
    messages: msgs,
    n_predict: maxTokens,
    temperature: opts.temperature || 0.7,
    top_k: 40,
    top_p: 0.9,
    stream: false
  });

  if (res && res.choices && res.choices.length && res.choices[0].message) {
    full = res.choices[0].message.content || '';
  } else if (typeof res === 'string') {
    full = res;
  }
  tk = full.length;
  if (full && typeof opts.onToken === 'function') opts.onToken(full);

  const ms = performance.now() - t0;
  const perf = {
    ms: ms,
    chars: full.length,
    approxTokens: Math.max(1, Math.round(tk / 4)),
    charsPerSec: ms > 0 ? (full.length / (ms / 1000)) : 0
  };
  if (typeof opts.onPerf === 'function') opts.onPerf(perf);
  return { text: full, perf: perf };
}

function isModelLoaded() {
  return !!instance && instance.isModelLoaded();
}

// Descarrega e libera memoria.
// Sempre reseta o estado (mesmo com init falho/sem modelo carregado) e trata
// exit() como melhor-esforco: uma falha nao pode deixar a UI presa num estado
// meio-descarregado com promise rejeitada sem tratamento.
async function unloadModel() {
  const inst = instance;
  instance = null;
  initPromise = null;
  loadInFlight = null;
  currentSource = null;
  if (!inst) return;
  try {
    await inst.exit();
  } catch (e) {
    console.warn('unloadModel: exit() falhou (memoria pode nao ter liberado):', e);
  }
}

export {
  initWasm,
  loadModelFromCache,
  generate,
  chat,
  isModelLoaded,
  unloadModel,
  getCachedBlob
};

// Expoe para scripts globais (app.js) e avisa que o modulo carregou.
window.HemorroidaEngine = {
  initWasm: initWasm,
  loadModelFromCache: loadModelFromCache,
  generate: generate,
  chat: chat,
  isModelLoaded: isModelLoaded,
  unloadModel: unloadModel,
  getCachedBlob: getCachedBlob
};
window.dispatchEvent(new CustomEvent('hemorroida-engine-ready'));
