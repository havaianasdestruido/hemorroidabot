const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modelSelect = document.getElementById('model-select');
const btnText = document.getElementById('btn-text');
const btnVoice = document.getElementById('btn-voice');

let isVoiceMode = false;
let mediaRecorder = null;
let audioChunks = [];

const API_REGISTRY = {
  // Web / Informação
  'duckduckgo':     { cat: 'web',     diff: 'easy',   url: 'https://api.duckduckgo.com/?q={q}&format=json' },
  'wikipedia':      { cat: 'web',     diff: 'easy',   url: 'https://pt.wikipedia.org/api/rest_v1/page/summary/{q}' },
  'wikidata':       { cat: 'web',     diff: 'medium', url: 'https://www.wikidata.org/w/api.php' },
  'openstreetmap':  { cat: 'web',     diff: 'hard',   url: 'https://nominatim.openstreetmap.org/search' },
  'nominatim':      { cat: 'web',     diff: 'hard',   url: 'https://nominatim.openstreetmap.org/reverse' },
  'overpass':       { cat: 'web',     diff: 'hard',   url: 'https://overpass-api.de/api/interpreter' },
  'open-meteo':     { cat: 'web',     diff: 'easy',   url: 'https://api.open-meteo.com/v1/forecast' },
  'sunrise-sunset': { cat: 'web',     diff: 'easy',   url: 'https://api.sunrise-sunset.org/json' },

  // Utilidades
  'worldtime':      { cat: 'util',    diff: 'easy',   url: 'https://worldtimeapi.org/api/timezone/{tz}' },
  'frankfurter':    { cat: 'util',    diff: 'easy',   url: 'https://api.frankfurter.app/latest' },
  'calendarific':   { cat: 'util',    diff: 'medium', url: 'https://calendarific.com/api/v2/holidays', auth: true },
  'holidays':       { cat: 'util',    diff: 'medium', url: null },

  // Conhecimento
  'open-library':   { cat: 'knowledge', diff: 'easy',   url: 'https://openlibrary.org/search.json' },
  'crossref':       { cat: 'knowledge', diff: 'medium', url: 'https://api.crossref.org/works' },
  'arxiv':          { cat: 'knowledge', diff: 'medium', url: 'https://export.arxiv.org/api/query' },
  'archive':        { cat: 'knowledge', diff: 'hard',   url: 'https://archive.org/advancedsearch.php' },
  'openalex':       { cat: 'knowledge', diff: 'medium', url: 'https://api.openalex.org/works' },

  // Games / Anime
  'pokeapi':        { cat: 'games',   diff: 'easy',   url: 'https://pokeapi.co/api/v2/' },
  'jikan':          { cat: 'games',   diff: 'easy',   url: 'https://api.jikan.moe/v4/' },
  'anilist':        { cat: 'games',   diff: 'medium', url: 'https://graphql.anilist.co', type: 'graphql' },

  // Música
  'musicbrainz':    { cat: 'music',   diff: 'medium', url: 'https://musicbrainz.org/ws/2/' },
  'listenbrainz':   { cat: 'music',   diff: 'medium', url: 'https://api.listenbrainz.org/1/' },
  'deezer':         { cat: 'music',   diff: 'hard',   url: 'https://api.deezer.com/', auth: true },
  'itunes':         { cat: 'music',   diff: 'easy',   url: 'https://itunes.apple.com/search' },
  'lyrics':         { cat: 'music',   diff: 'easy',   url: 'https://api.lyrics.ovh/v1/' },

  // Dev
  'github':         { cat: 'dev',     diff: 'medium', url: 'https://api.github.com/' },
  'npm':            { cat: 'dev',     diff: 'easy',   url: 'https://registry.npmjs.org/' },
  'pypi':           { cat: 'dev',     diff: 'easy',   url: 'https://pypi.org/pypi/' },
  'mdn':            { cat: 'dev',     diff: 'medium', url: 'https://developer.mozilla.org/api/v1/search' },
  'stackoverflow':  { cat: 'dev',     diff: 'medium', url: 'https://api.stackexchange.com/2.3/' },
  'librariesio':    { cat: 'dev',     diff: 'medium', url: 'https://libraries.io/api/', auth: true },

  // Locais (sem API externa)
  'calculator':     { cat: 'local',   diff: 'easy',   url: null },
  'unit-converter': { cat: 'local',   diff: 'easy',   url: null },
  'json-formatter': { cat: 'local',   diff: 'easy',   url: null },
  'base64':         { cat: 'local',   diff: 'easy',   url: null },
  'uuid':           { cat: 'local',   diff: 'easy',   url: null },
  'regex':          { cat: 'local',   diff: 'easy',   url: null },
  'timestamp':      { cat: 'local',   diff: 'easy',   url: null },
  'color-converter':{ cat: 'local',   diff: 'easy',   url: null },
  'text-counter':   { cat: 'local',   diff: 'easy',   url: null },
};

function addMessage(text, sender = 'bot') {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `${text}<div class="meta">${time} · ${sender === 'user' ? 'Você' : modelSelect.value}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function detectIntent(text) {
  const lower = text.toLowerCase();

  const localTools = [
    { keys: ['calcular', 'conta', 'quanto é', 'quanto dá'], tool: 'calculator' },
    { keys: ['converter', 'km para', 'kg para', 'celsius', 'fahrenheit'], tool: 'unit-converter' },
    { keys: ['json', 'formatar json', 'json formatter'], tool: 'json-formatter' },
    { keys: ['base64', 'codificar', 'decodificar'], tool: 'base64' },
    { keys: ['uuid', 'gerar id'], tool: 'uuid' },
    { keys: ['regex', 'testar regex', 'match'], tool: 'regex' },
    { keys: ['timestamp', 'epoch', 'unix', 'data atual'], tool: 'timestamp' },
    { keys: ['cor', 'hex', 'rgb', 'hsl', 'cor converter'], tool: 'color-converter' },
    { keys: ['contar', ' caracteres', 'palavras', 'word count'], tool: 'text-counter' },
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
        const result = Function(`"use strict"; return (${safe})`)();
        return `Resultado: ${result}`;
      } catch { return '❌ Expressão inválida'; }

    case 'uuid':
      return `UUID v4: ${crypto.randomUUID()}`;

    case 'timestamp': {
      const now = new Date();
      return `Unix: ${Math.floor(now.getTime()/1000)}\nISO: ${now.toISOString()}\nBR: ${now.toLocaleString('pt-BR')}`;
    }

    case 'base64':
      try {
        if (/^[A-Za-z0-9+/=]+$/.test(input.replace(/base64|codificar|decodificar/gi, '').trim())) {
          return `Decodificado: ${atob(input.replace(/base64|decodificar/gi, '').trim())}`;
        }
        return `Base64: ${btoa(input.replace(/base64|codificar/gi, '').trim())}`;
      } catch { return '❌ Erro ao processar Base64'; }

    case 'json-formatter':
      try {
        const cleaned = input.replace(/formatar|json|formatter/gi, '').trim();
        return JSON.stringify(JSON.parse(cleaned), null, 2);
      } catch { return '❌ JSON inválido'; }

    case 'text-counter': {
      const text = input.replace(/contar|caracteres|palavras|word count/gi, '').trim();
      return `Caracteres: ${text.length}\nPalavras: ${text.split(/\s+/).filter(Boolean).length}\nLinhas: ${text.split('\n').length}`;
    }

    case 'color-converter': {
      const hex = input.match(/#?[0-9a-fA-F]{6}/);
      if (!hex) return '❌ Forneça uma cor hex, ex: #ff5500';
      const h = hex[0].replace('#', '');
      const r = parseInt(h.substr(0,2),16);
      const g = parseInt(h.substr(2,2),16);
      const b = parseInt(h.substr(4,2),16);
      return `HEX: #${h}\nRGB: ${r}, ${g}, ${b}\nHSL: ${rgbToHsl(r,g,b)}`;
    }

    case 'unit-converter':
      return '🔧 Conversor de unidades: envie "100 km em milhas" por exemplo';

    case 'regex':
      return '🔧 Regex tester: envie "testar regex /padrão/ em texto"';

    default:
      return null;
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch (max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return `${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%`;
}

async function callExternalAPI(api, query) {
  const reg = API_REGISTRY[api];
  if (!reg || !reg.url) return null;

  const url = reg.url.replace('{q}', encodeURIComponent(query));

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return formatAPIResponse(api, data);
  } catch (e) {
    return `⚠️ Erro ao consultar ${api}: ${e.message}`;
  }
}

function formatAPIResponse(api, data) {
  switch (api) {
    case 'wikipedia':
      return data.extract ? `📖 ${data.title}\n\n${data.extract}` : 'Nenhum resultado encontrado';
    case 'open-meteo':
      if (data.current_weather) {
        const w = data.current_weather;
        return `🌡️ ${w.temperature}°C\n💨 Vento: ${w.windspeed} km/h\n🕐 ${w.time}`;
      }
      return JSON.stringify(data).slice(0, 500);
    case 'pokeapi':
      if (data.name) {
        const types = data.types?.map(t => t.type.name).join(', ') || 'desconhecido';
        return `🎮 ${data.name.toUpperCase()}\nTipo: ${types}\nAltura: ${(data.height/10).toFixed(1)}m\nPeso: ${(data.weight/10).toFixed(1)}kg`;
      }
      return JSON.stringify(data).slice(0, 500);
    case 'itunes':
      if (data.results?.length) {
        return data.results.slice(0,3).map(r =>
          `🎵 ${r.trackName} — ${r.artistName}\n   Álbum: ${r.collectionName}`
        ).join('\n\n');
      }
      return 'Nenhum resultado encontrado';
    case 'npm':
      if (data.name) {
        const latest = data['dist-tags']?.latest || '?';
        return `📦 ${data.name}@${latest}\n${data.description || ''}\nHomepage: ${data.homepage || data.repository?.url || 'N/A'}`;
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
    if (response) { addMessage(response); return; }
  }

  addMessage('🤔 Processando...');

  await new Promise(r => setTimeout(r, 800));

  const lastMsg = messagesEl.lastElementChild;
  lastMsg.remove();

  addMessage(`(Modelo ${modelSelect.value} offline)\n\nPara usar, integre com WebLLC, Ollama, ou modelo WASM local.\n\nSua mensagem: "${text}"`);
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

btnText.addEventListener('click', () => {
  isVoiceMode = false;
  btnText.classList.add('active');
  btnVoice.classList.remove('active');
  userInput.placeholder = 'Digite sua mensagem...';
});

btnVoice.addEventListener('click', () => {
  isVoiceMode = true;
  btnVoice.classList.add('active');
  btnText.classList.remove('active');
  userInput.placeholder = 'Clique em gravar ou digite...';
});

console.log('🧠 HemorróidaBot initialized');
console.log('APIs registradas:', Object.keys(API_REGISTRY).length);
