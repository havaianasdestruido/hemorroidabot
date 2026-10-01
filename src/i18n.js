// HemorroidaBot i18n - traducoes sem dependencias para a interface client-side.
var I18n = (function() {
  var STORAGE_KEY = 'hemorroida-locale';
  var DEFAULT_LOCALE = 'pt-BR';
  var listeners = [];
  var translations = {
    'pt-BR': {
      'language.label': 'Idioma', 'language.pt': 'Portugues (Brasil)', 'language.en': 'English (US)',
      'app.tagline': 'MEGABRAIN local so com JS no front-end.', 'model.legend': 'Modelo',
      'download.legend': 'Baixar modelo do HuggingFace', 'download.repo': 'Repo (revisao main):', 'download.file': 'Arquivo:',
      'download.repoPlaceholder': 'autor/modelo-GGUF', 'download.filePlaceholder': 'modelo-q4_k_m.gguf',
      'download.list': 'Listar arquivos', 'download.download': 'Baixar e cachear', 'download.cache': 'Ver cache', 'download.load': 'Carregar modelo local', 'download.unload': 'Descarregar',
      'voice.legend': 'Entrada / Voz', 'voice.text': 'Texto', 'voice.voice': 'Voz', 'voice.dictate': '🎤 Ditar', 'voice.unsupported': '🎤 Voz nao suportada', 'voice.recording': '🛑 Gravando...', 'voice.tts': 'Falar resposta (TTS)',
      'performance.legend': 'Desempenho', 'performance.empty': 'Sem dados. Envie uma mensagem com um modelo carregado.', 'performance.stats': 'Tokens(aprox): %{tokens} | Tempo: %{seconds}s | Velocidade: %{speed} chars/s',
      'chat.legend': 'Chat', 'chat.clear': 'Limpar historico', 'message.legend': 'Mensagem', 'message.label': 'Digite ou dite:', 'message.placeholder': 'Sua mensagem...', 'message.send': 'Enviar',
      'tools.legend': 'Ferramentas locais', 'tools.dead': 'Habilitar APIs mortas/offline (desativado por padrao)', 'message.you': 'Voce', 'message.toolCall': 'chamada de ferramenta',
      'system.prompt': 'Voce e o HemorroidaBot, um assistente local que roda sem internet. Responda em portugues, seja claro e direto. Se o usuario pedir algo que voce nao tem dados, diga que nao sabe. Voce recebe o resultado de ferramentas marcado como [FERRAMENTA] quando aplicavel. Use esse dado na resposta.',
      'app.toolError': 'Erro na ferramenta: %{error}', 'app.toolResult': '[FERRAMENTA %{tool}]\n%{result}', 'app.toolContext': 'Com base no resultado da ferramenta: %{data}\nResponda ao usuario: %{text}', 'app.noModel': '(Nenhum modelo carregado. Baixe e clique "Carregar modelo local".)', 'app.processing': 'Processando...', 'app.inferenceError': 'Erro na inferencia: %{error}', 'app.unloaded': 'Modelo descarregado.',
      'download.enterRepo': 'Informe um repo.', 'download.listing': 'Listando arquivos de %{repo}...', 'download.files': '%{count} arquivo(s). %{gguf} GGUF.', 'download.select': 'Defina repo e arquivo.', 'download.downloading': 'Baixando %{file} (%{repo})...', 'download.progress': 'Baixando: %{received} de %{total}', 'download.complete': 'Concluido! %{size} salvo em cache.', 'download.cached': 'Modelo %{file} baixado e cacheado (%{size}).', 'download.error': 'Erro: %{error}', 'download.cacheEmpty': 'Cache vazio.', 'download.cacheList': 'Caches:\n%{items}', 'download.cacheFiles': '%{name}: %{count} arquivo(s)', 'download.loading': 'Inicializando engine WASM e carregando modelo... pode demorar.', 'download.loaded': 'Modelo carregado: %{file} (pronto).', 'download.engineReady': 'Engine WASM pronta. Modelo local carregado: %{file}', 'download.engineTimeout': 'Engine WASM nao carregou (timeout). Verifique o console.',
      'brain.emptyExpression': 'Expressao vazia', 'brain.invalidExpression': 'Expressao invalida', 'brain.decoded': 'Decodificado: %{value}', 'brain.base64': 'Base64: %{value}', 'brain.error': 'Erro', 'brain.invalidJson': 'JSON invalido', 'brain.characters': 'Caracteres: %{characters}\nPalavras: %{words}\nLinhas: %{lines}', 'brain.hexRequired': 'Forneca HEX ex: #ff5500', 'brain.unknownTool': 'Ferramenta desconhecida.', 'brain.deadTool': '[ferramenta morta/offline: habilite "APIs mortas" no painel p/ usala]', 'brain.requestError': 'Erro ao consultar %{tool}: %{error}',
      'engine.notInitialized': 'Engine nao inicializado. Carregue um modelo primeiro.', 'engine.notCached': 'Modelo nao esta em cache. Baixe primeiro.', 'engine.staleLoad': 'Carga cancelada: o modelo foi descarregado.', 'models.cacheUnsupported': 'Cache API nao suportada neste navegador.', 'models.downloadFailed': 'Falha no download: HTTP %{status}', 'models.repoNotFound': 'Repo nao encontrado: %{repo}'
    },
    'en-US': {
      'language.label': 'Language', 'language.pt': 'Portuguese (Brazil)', 'language.en': 'English (US)',
      'app.tagline': 'Local MEGABRAIN with JS only on the front end.', 'model.legend': 'Model',
      'download.legend': 'Download model from HuggingFace', 'download.repo': 'Repo (main revision):', 'download.file': 'File:',
      'download.repoPlaceholder': 'author/model-GGUF', 'download.filePlaceholder': 'model-q4_k_m.gguf',
      'download.list': 'List files', 'download.download': 'Download and cache', 'download.cache': 'View cache', 'download.load': 'Load local model', 'download.unload': 'Unload',
      'voice.legend': 'Input / Voice', 'voice.text': 'Text', 'voice.voice': 'Voice', 'voice.dictate': '🎤 Dictate', 'voice.unsupported': '🎤 Voice unsupported', 'voice.recording': '🛑 Recording...', 'voice.tts': 'Speak response (TTS)',
      'performance.legend': 'Performance', 'performance.empty': 'No data. Send a message with a loaded model.', 'performance.stats': 'Tokens (approx.): %{tokens} | Time: %{seconds}s | Speed: %{speed} chars/s',
      'chat.legend': 'Chat', 'chat.clear': 'Clear history', 'message.legend': 'Message', 'message.label': 'Type or dictate:', 'message.placeholder': 'Your message...', 'message.send': 'Send',
      'tools.legend': 'Local tools', 'tools.dead': 'Enable dead/offline APIs (disabled by default)', 'message.you': 'You', 'message.toolCall': 'tool call',
      'system.prompt': 'You are HemorroidaBot, a local assistant that runs without internet. Answer in English, be clear and direct. If the user requests data you do not have, say you do not know. When applicable, you receive tool output marked as [TOOL]. Use that data in your response.',
      'app.toolError': 'Tool error: %{error}', 'app.toolResult': '[TOOL %{tool}]\n%{result}', 'app.toolContext': 'Based on the tool result: %{data}\nAnswer the user: %{text}', 'app.noModel': '(No model loaded. Download one and click "Load local model".)', 'app.processing': 'Processing...', 'app.inferenceError': 'Inference error: %{error}', 'app.unloaded': 'Model unloaded.',
      'download.enterRepo': 'Enter a repo.', 'download.listing': 'Listing files from %{repo}...', 'download.files': '%{count} file(s). %{gguf} GGUF.', 'download.select': 'Set repo and file.', 'download.downloading': 'Downloading %{file} (%{repo})...', 'download.progress': 'Downloading: %{received} of %{total}', 'download.complete': 'Done! %{size} saved to cache.', 'download.cached': 'Model %{file} downloaded and cached (%{size}).', 'download.error': 'Error: %{error}', 'download.cacheEmpty': 'Cache is empty.', 'download.cacheList': 'Caches:\n%{items}', 'download.cacheFiles': '%{name}: %{count} file(s)', 'download.loading': 'Initializing the WASM engine and loading the model... this may take a while.', 'download.loaded': 'Model loaded: %{file} (ready).', 'download.engineReady': 'WASM engine ready. Local model loaded: %{file}', 'download.engineTimeout': 'WASM engine did not load (timeout). Check the console.',
      'brain.emptyExpression': 'Empty expression', 'brain.invalidExpression': 'Invalid expression', 'brain.decoded': 'Decoded: %{value}', 'brain.base64': 'Base64: %{value}', 'brain.error': 'Error', 'brain.invalidJson': 'Invalid JSON', 'brain.characters': 'Characters: %{characters}\nWords: %{words}\nLines: %{lines}', 'brain.hexRequired': 'Provide HEX, e.g. #ff5500', 'brain.unknownTool': 'Unknown tool.', 'brain.deadTool': '[dead/offline tool: enable "Dead APIs" in the panel to use it]', 'brain.requestError': 'Error while querying %{tool}: %{error}',
      'engine.notInitialized': 'Engine is not initialized. Load a model first.', 'engine.notCached': 'Model is not in cache. Download it first.', 'engine.staleLoad': 'Load cancelled: the model was unloaded.', 'models.cacheUnsupported': 'Cache API is not supported by this browser.', 'models.downloadFailed': 'Download failed: HTTP %{status}', 'models.repoNotFound': 'Repository not found: %{repo}'
    }
  };
  function normalize(locale) { return /^en(?:[-_]us)?$/i.test(locale || '') ? 'en-US' : 'pt-BR'; }
  function readLocale() { try { return normalize(localStorage.getItem(STORAGE_KEY) || navigator.language); } catch (e) { return DEFAULT_LOCALE; } }
  var locale = readLocale();
  function t(key, vars) {
    var value = (translations[locale] && translations[locale][key]) || translations[DEFAULT_LOCALE][key] || key;
    return String(value).replace(/%\{([^}]+)\}/g, function(_, name) { return vars && vars[name] !== undefined ? vars[name] : ''; });
  }
  function apply(root) {
    if (typeof document === 'undefined') return;
    root = root || document;
    document.documentElement.lang = locale;
    root.querySelectorAll('[data-i18n]').forEach(function(el) { el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(function(el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  }
  function setLocale(next) { locale = normalize(next); try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) {} apply(); listeners.forEach(function(listener) { listener(locale); }); return locale; }
  function onChange(listener) { listeners.push(listener); return function() { listeners = listeners.filter(function(item) { return item !== listener; }); }; }
  return { t: t, getLocale: function() { return locale; }, setLocale: setLocale, onChange: onChange, apply: apply, locales: ['pt-BR', 'en-US'] };
})();
