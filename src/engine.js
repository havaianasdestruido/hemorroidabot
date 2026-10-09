// HemorroidaBot Engine - executa .gguf via @wllama/wllama (WebAssembly llama.cpp)
// Le o blob do Cache Storage do navegador e gera respostas 100% local.

// URLs dos recursos wllama, RESOLVIDAS EM RELACAO A ESTE MODULO (import.meta.url).
// Nao use paths relativos crus aqui: o wllama resolve os paths do pathConfig e
// do setCompat() contra document.baseURI (URL da PAGINA). Em hospedagem com
// subpath (ex: GitHub Pages em user.github.io/hemorroidabot/) um "../vendor/..."
// subiria um nivel demais e pediria "<origem>/vendor/..." fora do site, recebendo
// a pagina 404 em HTML. O WASM entao falha com "expected magic word 00 61 73 6d".
// URL absoluta (module-relative) e imune ao base da pagina e funciona em qualquer
// subpath. Obs: o import() dinamico abaixo ja resolvia contra o modulo; a mudanca
// e necessaria so para o que o wllama resolve contra a pagina.
// Fallback: se o modulo for carregado sem base resolvivel (data:/blob:, usado
// pelo harness de testes em Node), mantem o path relativo cru (comportamento
// antigo) em vez de explodir no top-level do modulo.
function moduleAssetURL(relativePath) {
  try {
    return new URL(relativePath, import.meta.url).href;
  } catch (e) {
    return relativePath;
  }
}

const WLLAMA_JS_URL = moduleAssetURL('../vendor/wllama/index.js');
const WLLAMA_WASM_DEFAULT = moduleAssetURL('../vendor/wllama/wasm/wllama.wasm');
const WLLAMA_COMPAT_JS = moduleAssetURL('../vendor/wllama-compat/wllama.js');
const WLLAMA_COMPAT_WASM = moduleAssetURL('../vendor/wllama-compat/wllama.wasm');

// Recursos expostos para testes (test/engine-paths.test.js).
const ENGINE_ASSETS = {
  wllamaJs: WLLAMA_JS_URL,
  wllamaWasm: WLLAMA_WASM_DEFAULT,
  compatJs: WLLAMA_COMPAT_JS,
  compatWasm: WLLAMA_COMPAT_WASM
};
const CACHE_NAME_DEFAULTS = 'hemorroida-models-v1';
const translate = function(key, vars, fallback) { return typeof I18n !== 'undefined' ? I18n.t(key, vars) : fallback; };

let WllamaModule = null;
let instance = null;
let currentSource = null; // { repo, file }
let generation = 0;       // invalidado por unloadModel: pedidos antigos ficam obsoletos
let initPromise = null;   // evita instancias WASM duplicadas em init concorrente
let loadInFlight = null;  // { key, generation, promise } - cargas simultaneas
let loadChain = Promise.resolve(); // fila: cargas e descargas em ordem de chegada

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

// Pedido obsoleto (descarga aconteceu depois da captura da generation).
function staleLoadError() {
  return new Error(translate('engine.staleLoad', null, 'Carga cancelada: o modelo foi descarregado.'));
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
// gen = generation capturada pelo chamador: trabalho obsoleto (descarga no
// meio) rejeita antes de atribuir instance.
async function initWasm(gen) {
  if (instance) return;
  const initGen = (gen === undefined) ? generation : gen;
  if (!initPromise) {
    let initP = null;
    initP = (async function() {
      const Wllama = await getWllamaClass();
      if (instance) return;
      if (initGen !== generation) throw staleLoadError();

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
      if (initPromise === initP) initPromise = null; // permite tentar de novo apos falha
      throw e;
    });
    initPromise = initP;
  }
  return initPromise;
}

async function doLoadModelFromCache(repo, file, revision, gen) {
  await initWasm(gen);
  if (gen !== generation) throw staleLoadError(); // nao comeca a carregar obsoleto
  const engine = ensureEngine();
  const blob = await getCachedBlob(repo, file, revision);
  if (gen !== generation) throw staleLoadError(); // rejeita antes do loadModel
  await engine.loadModel([blob], {
    n_ctx: 2048,
    n_threads: 4,
    pooling_type: 'none'
  });
  // descarga no meio da carga: nao publica currentSource (a descarga limpa)
  if (gen === generation) currentSource = { repo: repo, file: file };
  return { repo: repo, file: file };
}

// Carrega um modelo .gguf do cache do navegador.
// - generation capturada no momento do pedido e levada p/ a fila: pedidos
//   anteriores a uma descarga rejeitam antes de init/load (nao ressuscitam
//   a engine);
// - mesmo modelo em voo reusa a promise (duplo clique); modelos diferentes
//   entram em fila; cargas pedidas durante uma descarga esperam ela terminar.
function loadModelFromCache(repo, file, revision) {
  const key = String(repo) + '@' + String(revision || 'main') + '/' + String(file);
  const gen = generation;
  if (loadInFlight && loadInFlight.key === key && loadInFlight.generation === gen) {
    return loadInFlight.promise;
  }
  const promise = loadChain
    .catch(function() { /* erro anterior nao bloqueia a proxima carga */ })
    .then(function() {
      if (gen !== generation) return Promise.reject(staleLoadError());
      return doLoadModelFromCache(repo, file, revision, gen);
    })
    .finally(function() {
      if (loadInFlight && loadInFlight.promise === promise) loadInFlight = null;
    });
  loadChain = promise.catch(function() {});
  loadInFlight = { key: key, generation: gen, promise: promise };
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
// Coordenado com as cargas via loadChain + generation:
// - espera init e cargas existentes terminarem antes de chamar exit();
// - pedidos de carga feitos ANTES desta descarga ficam obsoletos e rejeitam
//   antes de init/load (nao recriam instancia nem publicam currentSource);
// - pedidos feitos DEPOIS esperam esta descarga terminarem (entram na fila).
function unloadModel() {
  generation += 1;
  const prev = loadChain;
  const work = prev.catch(function() { /* erro anterior nao bloqueia a descarga */ }).then(async function() {
    const inst = instance;
    instance = null;
    initPromise = null;
    currentSource = null;
    if (!inst) return;
    try {
      await inst.exit();
    } catch (e) {
      console.warn('unloadModel: exit() falhou (memoria pode nao ter liberado):', e);
    }
  });
  loadChain = work.catch(function() {});
  return work;
}

export {
  initWasm,
  loadModelFromCache,
  generate,
  chat,
  isModelLoaded,
  unloadModel,
  getCachedBlob,
  ENGINE_ASSETS
};

// Expoe para scripts globais (app.js) e avisa que o modulo carregou.
window.HemorroidaEngine = {
  initWasm: initWasm,
  loadModelFromCache: loadModelFromCache,
  generate: generate,
  chat: chat,
  isModelLoaded: isModelLoaded,
  unloadModel: unloadModel,
  getCachedBlob: getCachedBlob,
  ENGINE_ASSETS: ENGINE_ASSETS
};
window.dispatchEvent(new CustomEvent('hemorroida-engine-ready'));
