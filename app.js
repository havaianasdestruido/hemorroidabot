const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
const micBtn = document.getElementById('mic-btn');
const ttsChk = document.getElementById('tts-chk');
const clearBtn = document.getElementById('clear-btn');
const unloadBtn = document.getElementById('unload-btn');
const perfEl = document.getElementById('perf');

let voiceMode = false;
let coords = null;

// ============ Utils de DOM ============
function addMessage(text, sender) {
  const div = document.createElement('div');
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const who = sender === 'user' ? 'Voce' : modelSelect.value;
  const pre = document.createElement('pre');
  pre.textContent = '[' + time + '] ' + who + ': ' + text;
  div.appendChild(pre);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// ============ Sistema / Memoria ============
function systemPrompt() {
  let p = 'Voce e o HemorroidaBot, um assistente local que roda sem internet. ';
  p += 'Responda em portugues, seja claro e direto. Se o usuario pedir algo que ';
  p += 'voce nao tem dados, diga que nao sabe. Voce recebe o resultado de ferramentas ';
  p += 'marcado como [FERRAMENTA] quando aplicavel. Use esse dado na resposta.';
  return p;
}

function addPerf(perf) {
  Brain.recordPerf(perf);
  const sps = perf.charsPerSec ? perf.charsPerSec.toFixed(1) : '?';
  perfEl.textContent = 'Tokens(aprox): ' + perf.approxTokens +
    ' | Tempo: ' + (perf.ms / 1000).toFixed(1) + 's' +
    ' | Velocidade: ' + sps + ' chars/s';
}

function speak(text) {
  if (!ttsChk || !ttsChk.checked) return;
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
  utter.lang = 'pt-BR';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ============ Logica principal do chat ============
// Orquestra: tools locais -> tools externas -> modelo local (com memoria)
async function handleMessage(text) {
  const local = Brain.intentLocal(text);
  if (local) {
    let result;
    try { result = Brain.runLocal(local, text); }
    catch (e) { result = 'Erro na ferramenta: ' + e.message; }
    const out = '[FERRAMENTA ' + local + ']\n' + result;
    addMessage(out, 'bot');
    Brain.addMessage('user', text);
    Brain.addMessage('assistant', out);
    speak(result);
    return; // nao passa pelo modelo
  }

  const external = Brain.intentExternal(text);
  if (external) {
    // sem modelo: mostra o dado bruto da API
    if (!window.HemorroidaEngine || !window.HemorroidaEngine.isModelLoaded()) {
      const data = await Brain.runExternal(external, text, { coords: coords });
      const out = '[FERRAMENTA ' + external + ']\n' + data;
      addMessage(out, 'bot');
      Brain.addMessage('user', text);
      Brain.addMessage('assistant', out);
      speak(data);
      return;
    }
    // com modelo: injeta o dado da API na memoria e deixa ele responder
    const data = await Brain.runExternal(external, text, { coords: coords });
    addMessage('[FERRAMENTA ' + external + ']\n' + data, 'system');
    Brain.addMessage('user', text);
    Brain.addMessage('assistant', '[FERRAMENTA ' + external + ']\n' + data);
    const msgs = Brain.recentMemory(12);
    msgs.push({ role: 'user', content: 'Resuma/responda ao usuario usando a ferramenta acima: ' + text });
    msgs.unshift({ role: 'system', content: systemPrompt() });
    await engineRespond(msgs);
    return;
  }

  // Modelo local com memoria
  Brain.addMessage('user', text);
  const msgs = Brain.recentMemory(12);
  msgs.unshift({ role: 'system', content: systemPrompt() });
  await engineRespond(msgs);
}

async function engineRespond(msgs) {
  const engine = window.HemorroidaEngine;
  if (!engine || !engine.isModelLoaded()) {
    addMessage('(Nenhum modelo carregado. Baixe e clique "Carregar modelo local".)', 'bot');
    return;
  }
  const statusDiv = addMessage('Processando...', 'bot');
  try {
    const botDiv = addMessage('', 'bot');
    const pre = botDiv.querySelector('pre');
    let acc = '';
    const res = await engine.chat(msgs, {
      maxTokens: 900,
      temperature: 0.7,
      onToken: function(dt) {
        acc += dt;
        pre.textContent = '[' + timeNow() + '] ' + modelSelect.value + ': ' + acc;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
    statusDiv.remove();
    pre.textContent = '[' + timeNow() + '] ' + modelSelect.value + ': ' + res.text;
    Brain.addMessage('assistant', res.text);
    addPerf(res.perf);
    speak(res.text);
  } catch (e) {
    statusDiv.remove();
    addMessage('Erro na inferencia: ' + e.message, 'bot');
  }
}

function timeNow() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============ Enviar ============
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  userInput.value = '';
  await handleMessage(text);
}

// ============ Voz ============
function setupVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.disabled = true; micBtn.textContent = '🎤 Voz nao suportada'; return; }
  micBtn.disabled = false;
  let rec = null;
  micBtn.onclick = function() {
    if (rec && rec.running) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.running = true;
    micBtn.classList.add('rec');
    micBtn.textContent = '🛑 Gravando...';
    rec.onresult = function(ev) {
      const txt = ev.results[0][0].transcript;
      userInput.value = txt;
      sendMessage();
    };
    rec.onend = function() {
      rec.running = false;
      micBtn.classList.remove('rec');
      micBtn.textContent = '🎤 Ditar';
    };
    rec.onerror = function() { micBtn.classList.remove('rec'); micBtn.textContent = '🎤 Ditar'; };
    rec.start();
  };
}

function getLocation() {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    coords = { lat: pos.coords.latitude.toFixed(2), lon: pos.coords.longitude.toFixed(2) };
  }, function() { /* sem permissao, clima usa 0,0 */ });
}

// ============ Roteadores ============
userInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

clearBtn.onclick = function() {
  Brain.clearMemory();
  messagesEl.innerHTML = '';
};

unloadBtn.onclick = function() {
  if (window.HemorroidaEngine) {
    window.HemorroidaEngine.unloadModel().then(function() {
      perfEl.textContent = 'Modelo descarregado.';
    });
  }
};

// ============ ModelManager UI ============
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
  var loadEngineBtn = document.getElementById('load-engine-btn');

  var currentRepo = null;
  var currentFiles = [];

  function setStatus(text) { statusEl.textContent = text; }

  function currentSelection() {
    var known = ModelManager.findKnown(modelSelect.value);
    if (known) return { repo: known.repo, file: known.file };
    return {
      repo: repoInput.value.trim() || currentRepo,
      file: fileInput.value.trim() || currentFiles[0] || ''
    };
  }

  listBtn.onclick = function() {
    var repo = repoInput.value.trim();
    if (!repo) { var known = ModelManager.findKnown(modelSelect.value); if (known) repo = known.repo; }
    if (!repo) { setStatus('Informe um repo.'); return; }
    fileListEl.innerHTML = '';
    setStatus('Listando arquivos de ' + repo + '...');
    ModelManager.listFiles(repo).then(function(tree) {
      currentRepo = repo;
      currentFiles = tree.map(function(t) { return t.path; });
      const gguf = currentFiles.filter(function(f) { return /\.gguf$/i.test(f); });
      fileListEl.innerHTML = 'GGUF:\n' + gguf.join('\n') + '\n\nTodos (' + tree.length + '):\n' + currentFiles.join('\n');
      setStatus(currentFiles.length + ' arquivo(s). ' + gguf.length + ' GGUF.');
    }).catch(function(e) { setStatus('Erro: ' + e.message); });
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
      addMessage('Modelo ' + sel.file + ' baixado e cacheado (' + ModelManager.formatBytes(blob.size) + ').', 'bot');
    }).catch(function(e) { setStatus('Erro: ' + e.message); });
  };

  cacheBtn.onclick = function() {
    caches.keys().then(function(keys) {
      if (!keys.length) { setStatus('Cache vazio.'); return; }
      Promise.all(keys.map(function(name) {
        return caches.open(name).then(function(c) {
          return c.keys().then(function(reqs) { return name + ': ' + reqs.length + ' arquivo(s)'; });
        });
      })).then(function(lines) { setStatus('Caches:\n' + lines.join('\n')); });
    });
  };

  if (loadEngineBtn) {
    loadEngineBtn.onclick = function() {
      var sel = currentSelection();
      if (!sel.repo || !sel.file) { setStatus('Defina repo e arquivo.'); return; }
      setStatus('Inicializando engine WASM e carregando modelo... pode demorar.');
      var waitForEngine = function() {
        if (window.HemorroidaEngine) {
          window.HemorroidaEngine.loadModelFromCache(sel.repo, sel.file, 'main')
            .then(function(info) {
              setStatus('Modelo carregado: ' + info.file + ' (pronto).');
              addMessage('Engine WASM pronta. Modelo local carregado: ' + info.file, 'bot');
            })
            .catch(function(e) { setStatus('Erro: ' + e.message); });
        } else {
          setTimeout(waitForEngine, 100);
        }
      };
      waitForEngine();
    };
  }

  modelSelect.addEventListener('change', function() {
    var known = ModelManager.findKnown(modelSelect.value);
    if (known) { repoInput.value = known.repo; fileInput.value = known.file; }
  });
})();

// ============ Render tools ============
(function renderTools() {
  const grid = document.getElementById('tools-grid');
  Object.keys(Brain.LOCAL_TOOLS).forEach(function(key) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = key;
    btn.onclick = function() {
      const text = Brain.exampleFor(key);
      addMessage(text, 'user');
      const resp = Brain.runLocal(key, text);
      addMessage('[FERRAMENTA ' + key + ']\n' + resp, 'bot');
    };
    grid.appendChild(btn);
  });
})();

// ============ Boot ============
Brain.loadHistory();
setupVoice();
getLocation();

// replica historico salvo na tela
(function renderHistory() {
  Brain.getMemory().forEach(function(m) {
    addMessage(m.content, m.role === 'user' ? 'user' : 'bot');
  });
})();

console.log('HemorroidaBot initialized');

// mantem referencia p/ compatibilidade
window.sendMessage = sendMessage;
