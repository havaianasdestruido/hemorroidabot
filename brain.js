// HemorroidaBot Brain - MEGABRAIN
// Registro de ferramentas (locais + APIs externas), memoria da conversa e
// roteamento de intencoes por heuristica (ideal para modelos pequenos).

const Brain = (function() {

  // ---- Memoria da conversa ----
  const HISTORY_KEY = 'hemorroida-history';
  let memory = [];            // [{ role, content }]
  let perfLogs = [];          // ultimos desempenhos

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      memory = raw ? JSON.parse(raw) : [];
    } catch (e) { memory = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(memory)); }
    catch (e) { /* cache cheio etc */ }
  }
  function getMemory() { return memory; }
  function clearMemory() {
    memory = [];
    saveHistory();
  }
  function addMessage(role, content) {
    memory.push({ role: role, content: content });
    // limita contexto
    if (memory.length > 40) memory = memory.slice(-40);
    saveHistory();
  }
  function recentMemory(maxTurns) {
    const n = (maxTurns || 12) * 2;
    return memory.slice(-n);
  }

  // ---- Ferramentas locais (calculo, js) ----
  const LOCAL_TOOLS = {
    'calculator': {
      desc: 'calculadora (expressao matematica)',
      handle: function(input) {
        const safe = input.replace(/[^0-9+\-*/().%.\s]/g, '').trim();
        if (!safe) return 'Expressao vazia';
        try { return '' + Function('"use strict"; return (' + safe + ')')(); }
        catch (e) { return 'Expressao invalida'; }
      }
    },
    'uuid': {
      desc: 'gera UUID v4',
      handle: function() { return crypto.randomUUID(); }
    },
    'timestamp': {
      desc: 'data/hora atual e unix',
      handle: function() {
        const n = new Date();
        return 'Unix: ' + Math.floor(n.getTime()/1000) + '\nISO: ' + n.toISOString() + '\nBR: ' + n.toLocaleString('pt-BR');
      }
    },
    'base64': {
      desc: 'codifica/decodifica base64',
      handle: function(input) {
        const clean = input.replace(/base64|codificar|decodificar/gi, '').trim();
        if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length % 4 === 0) {
          try { return 'Decodificado: ' + atob(clean); } catch (e) {}
        }
        try { return 'Base64: ' + btoa(clean); } catch (e) { return 'Erro'; }
      }
    },
    'json-formatter': {
      desc: 'formata JSON',
      handle: function(input) {
        const clean = input.replace(/formatar|json|formatter/gi, '').trim();
        try { return JSON.stringify(JSON.parse(clean), null, 2); }
        catch (e) { return 'JSON invalido'; }
      }
    },
    'text-counter': {
      desc: 'conta caracteres/palavras/linhas',
      handle: function(input) {
        const t = input.replace(/contar|caracteres|palavras|word count/gi, '').trim();
        return 'Caracteres: ' + t.length + '\nPalavras: ' + t.split(/\s+/).filter(Boolean).length + '\nLinhas: ' + t.split('\n').length;
      }
    },
    'color-converter': {
      desc: 'converte cor HEX em RGB/HSL',
      handle: function(input) {
        const hex = input.match(/#?[0-9a-fA-F]{6}/);
        if (!hex) return 'Forneca HEX ex: #ff5500';
        const h = hex[0].replace('#', '');
        const r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
        return 'HEX #' + h.toUpperCase() + '\nRGB: ' + r + ', ' + g + ', ' + b;
      }
    }
  };

  // ---- Ferramentas de API externa (assincronas) ----
  const EXTERNAL_TOOLS = {
    'wikipedia': {
      desc: 'resumo Wikipedia',
      match: /(wikipedia|wiki|o que e|quem foi|quem e|significa)/i,
      build: function(query) {
        const q = query.replace(/wikipedia|wiki|o que e|quem foi|quem e|significa/gi, '').trim() || query;
        return 'https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(q);
      },
      parse: function(data) {
        if (data && data.extract) return data.title + '\n\n' + data.extract.split('\n').slice(0, 3).join('\n');
        return 'Nenhum resultado na Wikipedia.';
      }
    },
    'open-meteo': {
      desc: 'clima atual (precisa de lat/lon)',
      match: /(clima|tempo|temperatura|previsao)/i,
      build: function(query, state) {
        const c = state.coords || { lat: 0, lon: 0 };
        return 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&current_weather=true';
      },
      parse: function(data) {
        if (data && data.current_weather) {
          const w = data.current_weather;
          return w.temperature + '°C, vento ' + w.windspeed + ' km/h (' + w.time + ')';
        }
        return 'Sem dados de clima.';
      }
    },
    'pokemon': {
      desc: 'info de Pokemon',
      match: /(poke|pokemon|pikachu|charizard)/i,
      build: function(query) {
        const m = query.match(/pokemon\s+(\w+)|pikachu|charizard/i);
        const name = (m && m[1]) ? m[1].toLowerCase() : 'pikachu';
        return 'https://pokeapi.co/api/v2/pokemon/' + encodeURIComponent(name);
      },
      parse: function(data) {
        if (!data || !data.name) return 'Pokemon nao encontrado.';
        const types = (data.types || []).map(function(t) { return t.type.name; }).join(', ');
        return data.name.charAt(0).toUpperCase() + data.name.slice(1) +
          '\nTipo: ' + types +
          '\nAltura: ' + (data.height/10).toFixed(1) + 'm' +
          '\nPeso: ' + (data.weight/10).toFixed(1) + 'kg';
      }
    },
    'itunes': {
      desc: 'busca musica no iTunes',
      match: /(musica|album|banda|artista|cancao|song|track)/i,
      build: function(query) {
        const q = query.replace(/musica|album|banda|artista|cancao|song|track|buscar/gi, '').trim() || query;
        return 'https://itunes.apple.com/search?term=' + encodeURIComponent(q) + '&limit=3&media=music';
      },
      parse: function(data) {
        if (!data || !data.results || !data.results.length) return 'Nenhuma musica encontrada.';
        return data.results.map(function(r) {
          return r.trackName + ' - ' + r.artistName + ' (' + r.collectionName + ')';
        }).join('\n');
      }
    },
    'npm': {
      desc: 'info de pacote npm',
      match: /(npm|pacote|package|biblioteca)/i,
      build: function(query) {
        const m = query.match(/npm\s+([\w@./-]+)/i);
        const name = (m && m[1]) ? m[1] : 'lodash';
        return 'https://registry.npmjs.org/' + encodeURIComponent(name);
      },
      parse: function(data) {
        if (!data || !data.name) return 'Pacote npm nao encontrado.';
        const latest = (data['dist-tags'] || {}).latest || '?';
        return data.name + '@' + latest + '\n' + (data.description || '') + '\n' + (data.homepage || '');
      }
    }
  };

  // Intencoes locais por palavra-chave
  function intentLocal(text) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const map = [
      [/calcular|conta|quanto e|quanto da|soma|multipl/, 'calculator'],
      [/uuid|gerar id/, 'uuid'],
      [/timestamp|unix|epoch|que horas|data atual/, 'timestamp'],
      [/base64|codificar|decodificar/, 'base64'],
      [/formatar json|json formatter|pretty json|formata json|formata esse json/, 'json-formatter'],
      [/contar|caracteres|palavras/, 'text-counter'],
      [/cor|hex|rgb|hsl/, 'color-converter']
    ];
    for (const [re, tool] of map) {
      if (re.test(lower)) return tool;
    }
    return null;
  }

  // Intencao de API externa por palavra-chave
  function intentExternal(text) {
    for (const key in EXTERNAL_TOOLS) {
      if (EXTERNAL_TOOLS[key].match.test(text)) return key;
    }
    return null;
  }

  // Executa ferramenta local
  function runLocal(tool, text) {
    if (!LOCAL_TOOLS[tool]) return null;
    return LOCAL_TOOLS[tool].handle(text);
  }

  function exampleFor(tool) {
    const ex = {
      'calculator': '2 + 3 * 4',
      'uuid': 'gerar uuid',
      'timestamp': 'que horas e',
      'base64': 'codificar abc123',
      'json-formatter': 'formatar json',
      'text-counter': 'contar palavras',
      'color-converter': '#ff5500'
    };
    return ex[tool] || tool;
  }

  // Executa API externa (reuso de fetch + parse) - retorna Promise<string>
  function runExternal(tool, text, state) {
    const t = EXTERNAL_TOOLS[tool];
    if (!t) return Promise.resolve('Ferramenta desconhecida.');
    const url = t.build(text, state || {});
    return fetch(url, { mode: 'cors' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(t.parse)
      .catch(function(e) { return 'Erro ao consultar ' + tool + ': ' + e.message; });
  }

  // ---- Monitor de desempenho ----
  function recordPerf(perf) {
    perfLogs.push(perf);
    if (perfLogs.length > 20) perfLogs = perfLogs.slice(-20);
  }
  function getPerf() { return perfLogs; }

  return {
    loadHistory: loadHistory,
    getMemory: getMemory,
    clearMemory: clearMemory,
    addMessage: addMessage,
    recentMemory: recentMemory,
    intentLocal: intentLocal,
    intentExternal: intentExternal,
    runLocal: runLocal,
    exampleFor: exampleFor,
    runExternal: runExternal,
    LOCAL_TOOLS: LOCAL_TOOLS,
    EXTERNAL_TOOLS: EXTERNAL_TOOLS,
    recordPerf: recordPerf,
    getPerf: getPerf
  };
})();
