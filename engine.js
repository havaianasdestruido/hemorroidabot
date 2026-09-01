// HemorroidaBot Engine - executa .gguf via @wllama/wllama (WebAssembly llama.cpp)
// Le o blob do Cache Storage do navegador e gera respostas 100% local.

const WLLAMA_JS_URL = 'vendor/wllama/index.js';
const WLLAMA_WASM_DEFAULT = 'vendor/wllama/wasm/wllama.wasm';
const WLLAMA_COMPAT_JS = 'vendor/wllama-compat/wllama.js';
const WLLAMA_COMPAT_WASM = 'vendor/wllama-compat/wllama.wasm';
const CACHE_NAME_DEFAULTS = 'hemorroida-models-v1';

let WllamaModule = null;
let instance = null;
let currentSource = null; // { repo, file }

async function getWllamaClass() {
  if (WllamaModule) return WllamaModule.Wllama;
  WllamaModule = await import(WLLAMA_JS_URL);
  return WllamaModule.Wllama;
}

function ensureEngine() {
  if (!instance) {
    throw new Error('Engine nao inicializado. Carregue um modelo primeiro.');
  }
  return instance;
}

// Obtem blob do Cache Storage (baixado via models.js)
function getCachedBlob(repo, file, revision) {
  revision = revision || 'main';
  const url = 'https://huggingface.co/' + repo + '/resolve/' + revision + '/' + file;
  return caches.open(CACHE_NAME_DEFAULTS).then(function(cache) {
    return cache.match(url).then(function(resp) {
      if (!resp) throw new Error('Modelo nao esta em cache. Baixe primeiro.');
      return resp.blob();
    });
  });
}

// Inicializa a engine WASM (carrega o runtime llama.cpp).
async function initWasm() {
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
}

// Carrega um modelo .gguf do cache do navegador.
async function loadModelFromCache(repo, file, revision) {
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

// Gera texto. Retorna Promise<string>. onToken recebe fragmento incremental.
async function generate(prompt, opts) {
  const engine = ensureEngine();
  opts = opts || {};
  const maxTokens = opts.maxTokens || 512;

  let full = '';
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
  return full;
}

function isModelLoaded() {
  return !!instance && instance.isModelLoaded();
}

// Descarrega e libera memoria.
async function unloadModel() {
  if (instance && instance.isModelLoaded()) {
    await instance.exit();
    instance = null;
    currentSource = null;
  }
}

export {
  initWasm,
  loadModelFromCache,
  generate,
  isModelLoaded,
  unloadModel,
  getCachedBlob
};

// Expoe para scripts globais (app.js) e avisa que o modulo carregou.
window.HemorroidaEngine = {
  initWasm: initWasm,
  loadModelFromCache: loadModelFromCache,
  generate: generate,
  isModelLoaded: isModelLoaded,
  unloadModel: unloadModel,
  getCachedBlob: getCachedBlob
};
window.dispatchEvent(new CustomEvent('hemorroida-engine-ready'));
