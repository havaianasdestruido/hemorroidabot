const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
const micBtn = document.getElementById('mic-btn');
const ttsChk = document.getElementById('tts-chk');
const clearBtn = document.getElementById('clear-btn');
const unloadBtn = document.getElementById('unload-btn');
const perfEl = document.getElementById('perf');
const languageSelect = document.getElementById('language-select');
const t = function(key, vars) { return I18n.t(key, vars); };

let voiceMode = false;
let coords = null;
let perfIsDefault = true;

// ============ Utils de DOM ============
function addMessage(text, sender, opts) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + (sender || 'bot');
  const time = new Date().toLocaleTimeString(I18n.getLocale(), { hour: '2-digit', minute: '2-digit' });
  const who = sender === 'user' ? t('message.you') : modelSelect.value;
  if (opts && opts.chain && opts.chain.length) {
    const chain = document.createElement('div');
    chain.className = 'toolchain';
    opts.chain.forEach(function(step) {
      const row = document.createElement('div');
      row.className = 'toolchain-step';
      const img = document.createElement('img');
      img.src = 'favicons/' + step.icon;
      img.alt = '';
      img.className = 'toolchain-icon';
      const label = document.createElement('span');
      label.className = 'toolchain-label';
      label.textContent = step.label;
      row.appendChild(img);
      row.appendChild(label);
      chain.appendChild(row);
    });
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.textContent = '[' + time + '] ' + who + ' (' + t('message.toolCall') + ')';
    div.appendChild(meta);
    div.appendChild(chain);
  } else {
    const pre = document.createElement('pre');
    pre.textContent = '[' + time + '] ' + who + ': ' + text;
    div.appendChild(pre);
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// ============ Sistema / Memoria ============
function systemPrompt() {
  return t('system.prompt');
}

function addPerf(perf) {
  perfIsDefault = false;
  Brain.recordPerf(perf);
  const sps = perf.charsPerSec ? perf.charsPerSec.toFixed(1) : '?';
  perfEl.textContent = t('performance.stats', { tokens: perf.approxTokens, seconds: (perf.ms / 1000).toFixed(1), speed: sps });
}

function speak(text) {
  if (!ttsChk || !ttsChk.checked) return;
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
  utter.lang = I18n.getLocale();
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
    catch (e) { result = t('app.toolError', { error: e.message }); }
    const out = t('app.toolResult', { tool: local, result: result });
    addMessage(out, 'bot');
    Brain.addMessage('user', text);
    Brain.addMessage('assistant', out);
    speak(result);
    return; // nao passa pelo modelo
  }

  const external = Brain.intentExternal(text);
  if (external) {
    const chain = Brain.chainFor(external, text, { coords: coords });
    const chainMsg = addMessage('', 'bot', { chain: chain });
    const data = await Brain.runExternal(external, text, { coords: coords });
    Brain.addMessage('user', text);
    Brain.addMessage('assistant', data);
    if (!window.HemorroidaEngine || !window.HemorroidaEngine.isModelLoaded()) {
      addMessage(data, 'bot');
      speak(data);
      return;
    }
    const msgs = Brain.recentMemory(12);
    msgs.push({ role: 'user', content: t('app.toolContext', { data: data, text: text }) });
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
    addMessage(t('app.noModel'), 'bot');
    return;
  }
  const statusDiv = addMessage(t('app.processing'), 'bot');
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
    addMessage(t('app.inferenceError', { error: e.message }), 'bot');
  }
}

function timeNow() {
  return new Date().toLocaleTimeString(I18n.getLocale(), { hour: '2-digit', minute: '2-digit' });
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
  if (!SR) { micBtn.disabled = true; micBtn.textContent = t('voice.unsupported'); return; }
  micBtn.disabled = false;
  let rec = null;
  micBtn.onclick = function() {
    if (rec && rec.running) { rec.stop(); return; }
    rec = new SR();
    rec.lang = I18n.getLocale();
    rec.continuous = false;
    rec.interimResults = false;
    rec.running = true;
    micBtn.classList.add('rec');
    micBtn.textContent = t('voice.recording');
    rec.onresult = function(ev) {
      const txt = ev.results[0][0].transcript;
      userInput.value = txt;
      sendMessage();
    };
    rec.onend = function() {
      rec.running = false;
      micBtn.classList.remove('rec');
      micBtn.textContent = t('voice.dictate');
    };
    rec.onerror = function() { micBtn.classList.remove('rec'); micBtn.textContent = t('voice.dictate'); };
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
      perfIsDefault = false;
      perfEl.textContent = t('app.unloaded');
    }).catch(function(e) {
      // sem catch, uma rejeicao de exit() ficaria como promise nao tratada
      perfEl.textContent = t('download.error', { error: e.message });
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

  // Primeiro .gguf da listagem atual (fallback de arquivo: nunca pegar
  // README/.gitattributes como "modelo").
  function firstGgufFile() {
    for (var i = 0; i < currentFiles.length; i++) {
      if (/\.gguf$/i.test(currentFiles[i])) return currentFiles[i];
    }
    return '';
  }

  // Selecao atual: campos manuais digitados tem prioridade; o modelo conhecido
  // do select e o fallback. Antes o select vencia sempre e, como todo <option>
  // e um modelo conhecido, repo/file digitados eram SEMPRE ignorados (impossivel
  // baixar um modelo custom so pela UI).
  function currentSelection() {
    var known = ModelManager.findKnown(modelSelect.value);
    var repo = repoInput.value.trim() || currentRepo || (known ? known.repo : '');
    var file = fileInput.value.trim() || firstGgufFile() || (known ? known.file : '');
    return { repo: repo, file: file };
  }

  function syncInputsFromSelect() {
    var known = ModelManager.findKnown(modelSelect.value);
    if (known) { repoInput.value = known.repo; fileInput.value = known.file; }
  }

  listBtn.onclick = function() {
    var repo = repoInput.value.trim();
    if (!repo) { var known = ModelManager.findKnown(modelSelect.value); if (known) repo = known.repo; }
    if (!repo) { setStatus(t('download.enterRepo')); return; }
    fileListEl.textContent = '';
    setStatus(t('download.listing', { repo: repo }));
    ModelManager.listFiles(repo).then(function(tree) {
      currentRepo = repo;
      currentFiles = tree.map(function(item) { return item.path; });
      const gguf = currentFiles.filter(function(f) { return /\.gguf$/i.test(f); });
      // textContent (nao innerHTML): nomes de arquivo vem de repo remoto.
      fileListEl.textContent = 'GGUF:\n' + gguf.join('\n') + '\n\nTodos (' + tree.length + '):\n' + currentFiles.join('\n');
      setStatus(t('download.files', { count: currentFiles.length, gguf: gguf.length }));
    }).catch(function(e) { setStatus(t('download.error', { error: e.message })); });
  };

  dlBtn.onclick = function() {
    var sel = currentSelection();
    if (!sel.repo || !sel.file) { setStatus(t('download.select')); return; }
    progressEl.style.display = 'inline';
    progressEl.value = 0;
    setStatus(t('download.downloading', { file: sel.file, repo: sel.repo }));
    ModelManager.download(sel.repo, sel.file, 'main', function(received, total) {
      progressEl.value = (received / total) * 100;
      setStatus(t('download.progress', { received: ModelManager.formatBytes(received), total: ModelManager.formatBytes(total) }));
    }).then(function(blob) {
      progressEl.value = 100;
      setStatus(t('download.complete', { size: ModelManager.formatBytes(blob.size) }));
      addMessage(t('download.cached', { file: sel.file, size: ModelManager.formatBytes(blob.size) }), 'bot');
    }).catch(function(e) {
      progressEl.style.display = 'none';
      setStatus(t('download.error', { error: e.message }));
    });
  };

  cacheBtn.onclick = function() {
    if (!('caches' in window)) { setStatus(t('models.cacheUnsupported')); return; }
    caches.keys().then(function(keys) {
      if (!keys.length) { setStatus(t('download.cacheEmpty')); return; }
      return Promise.all(keys.map(function(name) {
        return caches.open(name).then(function(c) {
          return c.keys().then(function(reqs) { return t('download.cacheFiles', { name: name, count: reqs.length }); });
        });
      })).then(function(lines) { setStatus(t('download.cacheList', { items: lines.join('\n') })); });
    }).catch(function(e) { setStatus(t('download.error', { error: e.message })); });
  };

  if (loadEngineBtn) {
    // Timeout p/ esperar o modulo da engine WASM: sem ele, falha de carga do
    // modulo deixa o botao girando pra sempre sem feedback.
    var ENGINE_WAIT_MS = 30000;
    loadEngineBtn.onclick = function() {
      var sel = currentSelection();
      if (!sel.repo || !sel.file) { setStatus(t('download.select')); return; }
      setStatus(t('download.loading'));
      var waited = 0;
      var waitForEngine = function() {
        if (window.HemorroidaEngine) {
          window.HemorroidaEngine.loadModelFromCache(sel.repo, sel.file, 'main')
            .then(function(info) {
              setStatus(t('download.loaded', { file: info.file }));
              addMessage(t('download.engineReady', { file: info.file }), 'bot');
            })
            .catch(function(e) { setStatus(t('download.error', { error: e.message })); });
          return;
        }
        waited += 100;
        if (waited >= ENGINE_WAIT_MS) { setStatus(t('download.engineTimeout')); return; }
        setTimeout(waitForEngine, 100);
      };
      waitForEngine();
    };
  }

  modelSelect.addEventListener('change', syncInputsFromSelect);
  syncInputsFromSelect(); // preenche repo/file do modelo selecionado no boot
})();

// ============ Render tools ============
(function renderTools() {
  const grid = document.getElementById('tools-grid');

  function canShow(key) {
    const t = Brain.EXTERNAL_TOOLS[key];
    return !(t && t.dead && !Brain.isDeadToolsEnabled());
  }

  function rebuild() {
    grid.innerHTML = '';
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
    Object.keys(Brain.EXTERNAL_TOOLS).forEach(function(key) {
      if (!canShow(key)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'api: ' + key;
      btn.onclick = function() {
        const text = Brain.externalExampleFor(key);
        addMessage(text, 'user');
        Brain.runExternal(key, text, { coords: coords }).then(function(resp) {
          addMessage('[FERRAMENTA ' + key + ']\n' + resp, 'bot');
        });
      };
      grid.appendChild(btn);
    });
  }

  const toggle = document.getElementById('dead-api-toggle');
  if (toggle) {
    toggle.checked = Brain.isDeadToolsEnabled();
    toggle.addEventListener('change', function() {
      Brain.setDeadToolsEnabled(toggle.checked);
      rebuild();
    });
  }
  rebuild();
})();

// ============ Idioma ============
if (languageSelect) {
  languageSelect.value = I18n.getLocale();
  languageSelect.addEventListener('change', function() { I18n.setLocale(languageSelect.value); });
}
I18n.onChange(function(locale) {
  if (languageSelect) languageSelect.value = locale;
  if (!micBtn.classList.contains('rec')) micBtn.textContent = micBtn.disabled ? t('voice.unsupported') : t('voice.dictate');
  if (perfIsDefault) perfEl.textContent = t('performance.empty');
});
I18n.apply();

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
