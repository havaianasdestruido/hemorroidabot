const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');

const API_REGISTRY = {
  'duckduckgo':     { cat: 'web',       diff: 'easy',   url: 'https://api.duckduckgo.com/?q={q}&format=json' },
  'wikipedia':      { cat: 'web',       diff: 'easy',   url: 'https://pt.wikipedia.org/api/rest_v1/page/summary/{q}' },
  'wikidata':       { cat: 'web',       diff: 'medium', url: 'https://www.wikidata.org/w/api.php' },
  'openstreetmap':  { cat: 'web',       diff: 'hard',   url: 'https://nominatim.openstreetmap.org/search' },
  'nominatim':      { cat: 'web',       diff: 'hard',   url: 'https://nominatim.openstreetmap.org/reverse' },
  'overpass':       { cat: 'web',       diff: 'hard',   url: 'https://overpass-api.de/api/interpreter' },
  'open-meteo':     { cat: 'web',       diff: 'easy',   url: 'https://api.open-meteo.com/v1/forecast' },
  'sunrise-sunset': { cat: 'web',       diff: 'easy',   url: 'https://api.sunrise-sunset.org/json' },

  'worldtime':      { cat: 'util',      diff: 'easy',   url: 'https://worldtimeapi.org/api/timezone/{tz}' },
  'frankfurter':    { cat: 'util',      diff: 'easy',   url: 'https://api.frankfurter.app/latest' },
  'calendarific':   { cat: 'util',      diff: 'medium', url: 'https://calendarific.com/api/v2/holidays', auth: true },
  'holidays':       { cat: 'util',      diff: 'medium', url: null },

  'open-library':   { cat: 'knowledge', diff: 'easy',   url: 'https://openlibrary.org/search.json' },
  'crossref':       { cat: 'knowledge', diff: 'medium', url: 'https://api.crossref.org/works' },
  'arxiv':          { cat: 'knowledge', diff: 'medium', url: 'https://export.arxiv.org/api/query' },
  'archive':        { cat: 'knowledge', diff: 'hard',   url: 'https://archive.org/advancedsearch.php' },
  'openalex':       { cat: 'knowledge', diff: 'medium', url: 'https://api.openalex.org/works' },

  'pokeapi':        { cat: 'games',     diff: 'easy',   url: 'https://pokeapi.co/api/v2/' },
  'jikan':          { cat: 'games',     diff: 'easy',   url: 'https://api.jikan.moe/v4/' },
  'anilist':        { cat: 'games',     diff: 'medium', url: 'https://graphql.anilist.co', type: 'graphql' },

  'musicbrainz':    { cat: 'music',     diff: 'medium', url: 'https://musicbrainz.org/ws/2/' },
  'listenbrainz':   { cat: 'music',     diff: 'medium', url: 'https://api.listenbrainz.org/1/' },
  'deezer':         { cat: 'music',     diff: 'hard',   url: 'https://api.deezer.com/', auth: true },
  'itunes':         { cat: 'music',     diff: 'easy',   url: 'https://itunes.apple.com/search' },
  'lyrics':         { cat: 'music',     diff: 'easy',   url: 'https://api.lyrics.ovh/v1/' },

  'github':         { cat: 'dev',       diff: 'medium', url: 'https://api.github.com/' },
  'npm':            { cat: 'dev',       diff: 'easy',   url: 'https://registry.npmjs.org/' },
  'pypi':           { cat: 'dev',       diff: 'easy',   url: 'https://pypi.org/pypi/' },
  'mdn':            { cat: 'dev',       diff: 'medium', url: 'https://developer.mozilla.org/api/v1/search' },
  'stackoverflow':  { cat: 'dev',       diff: 'medium', url: 'https://api.stackexchange.com/2.3/' },
  'librariesio':    { cat: 'dev',       diff: 'medium', url: 'https://libraries.io/api/', auth: true },

  'calculator':     { cat: 'local',     diff: 'easy',   url: null },
  'unit-converter': { cat: 'local',     diff: 'easy',   url: null },
  'json-formatter': { cat: 'local',     diff: 'easy',   url: null },
  'base64':         { cat: 'local',     diff: 'easy',   url: null },
  'uuid':           { cat: 'local',     diff: 'easy',   url: null },
  'regex':          { cat: 'local',     diff: 'easy',   url: null },
  'timestamp':      { cat: 'local',     diff: 'easy',   url: null },
  'color-converter':{ cat: 'local',     diff: 'easy',   url: null },
  'text-counter':   { cat: 'local',     diff: 'easy',   url: null },
};

function addMessage(text, sender) {
  const div = document.createElement('div');
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const who = sender === 'user' ? 'Voce' : modelSelect.value;
  const pre = document.createElement('pre');
  pre.textContent = '[' + time + '] ' + who + ': ' + text;
  div.appendChild(pre);
  messagesEl.appendChild(div);
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  const localTools = [
    { keys: ['calcular', 'conta', 'quanto e', 'quanto da'], tool: 'calculator' },
    { keys: ['converter', 'km para', 'kg para', 'celsius', 'fahrenheit'], tool: 'unit-converter' },
    { keys: ['json', 'formatar json', 'json formatter'], tool: 'json-formatter' },
    { keys: ['base64', 'codificar', 'decodificar'], tool: 'base64' },
    { keys: ['uuid', 'gerar id'], tool: 'uuid' },
    { keys: ['regex', 'testar regex', 'match'], tool: 'regex' },
    { keys: ['timestamp', 'epoch', 'unix', 'data atual'], tool: 'timestamp' },
    { keys: ['cor', 'hex', 'rgb', 'hsl', 'cor converter'], tool: 'color-converter' },
    { keys: ['contar', 'caracteres', 'palavras', 'word count'], tool: 'text-counter' },
  ];
  for (const { keys, tool } of localTools) {
    if (keys.some(k => lower.includes(k))) return tool;
  }
  return null;
}

function handleLocalTool(tool, input) {
  switch (tool) {
    case 'calculator':
      try {
        const safe = input.replace(/[^0-9+\-*/().%]/g, '');
        return 'Resultado: ' + Function('"use strict"; return (' + safe + ')')();
      } catch { return 'Expressao invalida'; }

    case 'uuid':
      return 'UUID: ' + crypto.randomUUID();

    case 'timestamp': {
      const now = new Date();
      return 'Unix: ' + Math.floor(now.getTime()/1000) + '\nISO: ' + now.toISOString() + '\nBR: ' + now.toLocaleString('pt-BR');
    }

    case 'base64':
      try {
        const clean = input.replace(/base64|codificar|decodificar/gi, '').trim();
        if (/^[A-Za-z0-9+/=]+$/.test(clean)) return 'Decodificado: ' + atob(clean);
        return 'Base64: ' + btoa(clean);
      } catch { return 'Erro ao processar Base64'; }

    case 'json-formatter':
      try {
        const cleaned = input.replace(/formatar|json|formatter/gi, '').trim();
        return JSON.stringify(JSON.parse(cleaned), null, 2);
      } catch { return 'JSON invalido'; }

    case 'text-counter': {
      const text = input.replace(/contar|caracteres|palavras|word count/gi, '').trim();
      return 'Caracteres: ' + text.length + '\nPalavras: ' + text.split(/\s+/).filter(Boolean).length + '\nLinhas: ' + text.split('\n').length;
    }

    case 'color-converter': {
      const hex = input.match(/#?[0-9a-fA-F]{6}/);
      if (!hex) return 'Forneca uma cor hex, ex: #ff5500';
      const h = hex[0].replace('#', '');
      const r = parseInt(h.substr(0,2),16);
      const g = parseInt(h.substr(2,2),16);
      const b = parseInt(h.substr(4,2),16);
      return 'HEX: #' + h + '\nRGB: ' + r + ', ' + g + ', ' + b;
    }

    case 'unit-converter':
      return 'Conversor: envie "100 km em milhas" por exemplo';

    case 'regex':
      return 'Regex tester: envie "testar regex /padrao/ em texto"';

    default:
      return null;
  }
}

async function callExternalAPI(api, query) {
  const reg = API_REGISTRY[api];
  if (!reg || !reg.url) return null;
  const url = reg.url.replace('{q}', encodeURIComponent(query));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return formatAPIResponse(api, data);
  } catch (e) {
    return 'Erro ao consultar ' + api + ': ' + e.message;
  }
}

function formatAPIResponse(api, data) {
  switch (api) {
    case 'wikipedia':
      return data.extract ? data.title + '\n\n' + data.extract : 'Nenhum resultado';
    case 'open-meteo':
      if (data.current_weather) {
        var w = data.current_weather;
        return w.temperature + 'C  Vento: ' + w.windspeed + ' km/h  Hora: ' + w.time;
      }
      return JSON.stringify(data).slice(0, 500);
    case 'pokeapi':
      if (data.name) {
        var types = (data.types || []).map(function(t) { return t.type.name; }).join(', ') || '?';
        return data.name.toUpperCase() + '\nTipo: ' + types + '\nAltura: ' + (data.height/10).toFixed(1) + 'm\nPeso: ' + (data.weight/10).toFixed(1) + 'kg';
      }
      return JSON.stringify(data).slice(0, 500);
    case 'itunes':
      if (data.results && data.results.length) {
        return data.results.slice(0,3).map(function(r) {
          return r.trackName + ' - ' + r.artistName + '\n   Album: ' + r.collectionName;
        }).join('\n\n');
      }
      return 'Nenhum resultado';
    case 'npm':
      if (data.name) {
        var latest = (data['dist-tags'] || {}).latest || '?';
        return data.name + '@' + latest + '\n' + (data.description || '') + '\nHomepage: ' + (data.homepage || (data.repository || {}).url || 'N/A');
      }
      return JSON.stringify(data).slice(0, 500);
    default:
      return JSON.stringify(data, null, 2).slice(0, 1000);
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  userInput.value = '';

  const localTool = detectIntent(text);
  if (localTool) {
    const response = handleLocalTool(localTool, text);
    if (response) { addMessage(response, 'bot'); return; }
  }

  addMessage('Processando...', 'bot');

  // Se a engine WASM esta carregada, gera resposta local de verdade.
  if (window.HemorroidaEngine && window.HemorroidaEngine.isModelLoaded()) {
    messagesEl.removeChild(messagesEl.lastElementChild);
    const engine = window.HemorroidaEngine;
    try {
      const reply = await engine.generate(text, {
        maxTokens: 512,
        temperature: 0.7,
        onToken: function() {}
      });
      addMessage(reply, 'bot');
    } catch (e) {
      addMessage('Erro na inferencia: ' + e.message, 'bot');
    }
    return;
  }

  await new Promise(function(r) { setTimeout(r, 800); });

  messagesEl.removeChild(messagesEl.lastElementChild);

  addMessage('(Modelo ' + modelSelect.value + ' offline)\n\nIntegre com Ollama/llama.cpp/WebLLM para usar.\n\nSua mensagem: "' + text + '"', 'bot');
}

userInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// --- Integracao com ModelManager (models.js) ---
(function setupModelDownloadUI() {
  if (typeof ModelManager === 'undefined') return;

  var repoInput = document.getElementById('repo-input');
  var fileInput = document.getElementById('file-input');
  var listBtn = document.getElementById('list-btn');
  var dlBtn = document.getElementById('dl-btn');
  var cacheBtn = document.getElementById('cache-btn');
  var statusEl = document.getElementById('dl-status');
  var progressEl = document.getElementById('dl-progress');
  var fileListEl = document.getElementById('file-list');

  var currentRepo = null;
  var currentFiles = [];

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function currentSelection() {
    var known = ModelManager.findKnown(modelSelect.value);
    if (known) {
      return { repo: known.repo, file: known.file };
    }
    return {
      repo: repoInput.value.trim() || currentRepo,
      file: fileInput.value.trim() || currentFiles[0] || ''
    };
  }

  listBtn.onclick = function() {
    var repo = repoInput.value.trim();
    if (!repo) {
      var known = ModelManager.findKnown(modelSelect.value);
      if (known) repo = known.repo;
    }
    if (!repo) { setStatus('Informe um repo.'); return; }
    fileListEl.innerHTML = '';
    setStatus('Listando arquivos de ' + repo + '...');
    ModelManager.listFiles(repo).then(function(tree) {
      currentRepo = repo;
      currentFiles = tree.map(function(t) { return t.path; });
      fileListEl.innerHTML = currentFiles.join('\n');
      setStatus(currentFiles.length + ' arquivo(s) encontrado(s).');
    }).catch(function(e) {
      setStatus('Erro: ' + e.message);
    });
  };

  dlBtn.onclick = function() {
    var sel = currentSelection();
    if (!sel.repo || !sel.file) { setStatus('Defina repo e arquivo.'); return; }
    progressEl.style.display = 'inline';
    progressEl.value = 0;
    setStatus('Baixando ' + sel.file + ' (' + sel.repo + ')...');
    ModelManager.download(sel.repo, sel.file, 'main', function(received, total) {
      progressEl.value = (received / total) * 100;
      setStatus('Baixando: ' + ModelManager.formatBytes(received) + ' de ' + ModelManager.formatBytes(total));
    }).then(function(blob) {
      progressEl.value = 100;
      setStatus('Concluido! ' + ModelManager.formatBytes(blob.size) + ' salvo em cache.');
      addMessage('Modelo ' + sel.file + ' baixado e armazenado no cache do navegador (' + ModelManager.formatBytes(blob.size) + ').', 'bot');
    }).catch(function(e) {
      setStatus('Erro: ' + e.message);
    });
  };

  cacheBtn.onclick = function() {
    caches.keys().then(function(keys) {
      if (!keys.length) { setStatus('Cache vazio.'); return; }
      Promise.all(keys.map(function(name) {
        return caches.open(name).then(function(c) {
          return c.keys().then(function(reqs) {
            return reqs.length;
          });
        });
      })).then(function(counts) {
        var lines = keys.map(function(k, i) { return k + ': ' + counts[i] + ' item(s)'; });
        setStatus('Caches:\n' + lines.join('\n'));
      });
    });
  };

  var loadEngineBtn = document.getElementById('load-engine-btn');
  if (loadEngineBtn) {
    loadEngineBtn.onclick = function() {
      var sel = currentSelection();
      if (!sel.repo || !sel.file) { setStatus('Defina repo e arquivo.'); return; }
      setStatus('Inicializando engine WASM e carregando modelo...');
      var waitForEngine = function() {
        if (window.HemorroidaEngine) {
          doLoad(sel);
        } else {
          setTimeout(waitForEngine, 100);
        }
      };
      function doLoad(sel) {
        window.HemorroidaEngine.loadModelFromCache(sel.repo, sel.file, 'main')
          .then(function(info) {
            setStatus('Modelo carregado: ' + info.file + ' (pronto para uso).');
            addMessage('Engine WASM pronta. Modelo local carregado: ' + info.file, 'bot');
          })
          .catch(function(e) {
            setStatus('Erro: ' + e.message);
          });
      }
      waitForEngine();
    };
  }

  modelSelect.addEventListener('change', function() {
    var known = ModelManager.findKnown(modelSelect.value);
    if (known) {
      repoInput.value = known.repo;
      fileInput.value = known.file;
    }
  });
})();

console.log('HemorroidaBot initialized');
console.log('APIs registradas: ' + Object.keys(API_REGISTRY).length);

(function renderTools() {
  const grid = document.getElementById('tools-grid');
  Object.keys(API_REGISTRY).forEach(function(key) {
    const reg = API_REGISTRY[key];
    if (reg.cat === 'local') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = key;
      btn.onclick = function() {
        addMessage(key, 'user');
        const resp = handleLocalTool(key, key);
        addMessage(resp, 'bot');
      };
      grid.appendChild(btn);
    }
  });
})();
