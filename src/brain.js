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
  const COUNTRY_MAP = {
    brasil: 'brazil',
    brazil: 'brazil',
    alemanha: 'germany',
    germany: 'germany',
    frança: 'france',
    france: 'france',
    eua: 'united states',
    'estados unidos': 'united states',
    'united states': 'united states',
    inglaterra: 'united kingdom',
    'reino unido': 'united kingdom',
    'united kingdom': 'united kingdom',
    japão: 'japan',
    japan: 'japan',
    itália: 'italy',
    italy: 'italy',
    espanha: 'spain',
    spain: 'spain',
    portugal: 'portugal',
    canada: 'canada',
    australia: 'australia',
    argentina: 'argentina',
    méxico: 'mexico',
    mexico: 'mexico'
  };
  const EXTERNAL_TOOLS = {
    'wikipedia': {
      favicon: 'wikipedia.png',
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
      favicon: 'open-meteo.png',
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
      favicon: 'pokemon.png',
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
      favicon: 'itunes.png',
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
      favicon: 'npm.png',
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
    },
    'dog-ceo': {
      favicon: 'dog-ceo.png',
      desc: 'imagem/foto aleatoria de cachorro (dog.ceo)',
  match: /(cachorro|dog|doguinho|c[aã]o|foto de.*(c[aã]o|dog)|imagem de.*(c[aã]o|dog))/i,
  build: function(query) { return 'https://dog.ceo/api/breeds/image/random'; },
  parse: function(data) {
    try {
      if (data && data.status === 'success' && data.message) {
        return 'Cachorro: ' + data.message;
      }
      return 'Nao foi possivel obter imagem de cachorro.';
    } catch (e) {
      return 'Nao foi possivel obter imagem de cachorro.';
    }
  }
},
    'catfact': {
      favicon: 'catfact.png',
      desc: 'curiosidade/fato sobre gatos (catfact)',
  match: /(gato|cat|gatinho|bichano|felino|fato.*gato|curiosidade.*gato)/i,
  build: function(query) { return 'https://catfact.ninja/fact'; },
  parse: function(data) {
    try {
      if (data && data.fact) return data.fact;
      return 'Nao foi possivel obter fato sobre gatos.';
    } catch (e) {
      return 'Nao foi possivel obter fato sobre gatos.';
    }
  }
},
    'restcountries': {
      favicon: 'restcountries.png',
      desc: 'info de pais (restcountries)',
  match: /(pais|country|capital|populac..o.*(pais|country)|bandeira.*(pais|country)|info.*(pais|country))/i,
  build: function(query) {
    var q = (query || '').toLowerCase();
    var words = q.split(/\s+/);
    var skip = /^(pais|country|capital|populac..o|bandeira|info|do|da|de|dos|das|o|a|um|uma|qual|quais|me|mostre|informacoes|sobre)$/i;
    var name = '';
    for (var i = 0; i < words.length; i++) {
      if (!skip.test(words[i]) && words[i].length > 1) {
        name = words[i];
        break;
      }
    }
    if (!name) name = 'brazil';
    return 'https://restcountries.com/v3.1/name/' + encodeURIComponent(name);
  },
  parse: function(data) {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        return 'Pais nao encontrado.';
      }
      var c = data[0];
      if (!c) return 'Pais nao encontrado.';
      var name = '';
      try { name = c.name.common || ''; } catch (e) { name = '?'; }
      var capital = '';
      try { capital = (c.capital && c.capital[0]) || 'N/A'; } catch (e) { capital = 'N/A'; }
      var region = '';
      try { region = c.region || 'N/A'; } catch (e) { region = 'N/A'; }
      var pop = 0;
      try { pop = c.population || 0; } catch (e) { pop = 0; }
      var popStr = pop.toLocaleString('pt-BR');
      var flag = '';
      try { flag = (c.flags && c.flags.png) || ''; } catch (e) { flag = ''; }
      var currencies = '';
      try {
        if (c.currencies) {
          var keys = Object.keys(c.currencies);
          if (keys.length > 0) {
            currencies = keys.map(function(k) { return c.currencies[k].name; }).join(', ');
          }
        }
      } catch (e) { currencies = ''; }
      var out = 'Pais: ' + name +
        '\nCapital: ' + capital +
        '\nRegiao: ' + region +
        '\nPopulacao: ' + popStr;
      if (currencies) out += '\nMoeda: ' + currencies;
      if (flag) out += '\nBandeira: ' + flag;
      return out;
    } catch (e) {
      return 'Pais nao encontrado.';
    }
  }
},
    'openlibrary': {
      favicon: 'openlibrary.png',
      desc: 'busca de livros (Open Library)',
  match: /(livro|book|biblioteca|procura.*livro|busca.*livro|autor.*livro|title)/i,
  build: function(query) {
    var q = (query || '').replace(/\b(livros?|books?|buscar|procure|procura|me indica|busca|biblioteca|autor|title)\b/gi, '').replace(/\b(de|o|um|uma|do|da|dos|das)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (!q) q = 'hobbit';
    return 'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=3';
  },
  parse: function(data) {
    try {
      if (!data || !data.docs || !data.docs.length) return 'Nenhum livro encontrado.';
      var lines = [];
      for (var i = 0; i < data.docs.length && i < 3; i++) {
        var doc = data.docs[i];
        var title = doc.title || 'Sem titulo';
        var authors = (doc.author_name && doc.author_name.length) ? doc.author_name.join(', ') : 'Autor desconhecido';
        var year = doc.first_publish_year || 'N/D';
        var link = 'https://openlibrary.org' + (doc.key || '');
        lines.push(title + ' (' + authors + ', ' + year + ') | ' + link);
      }
      return lines.join('\n');
    } catch (e) {
      return 'Nenhum livro encontrado.';
    }
  }
},
    'jokeapi': {
      favicon: 'jokeapi.png',
      desc: 'piada aleatoria (JokeAPI, pt)',
  match: /(piada|joke|ver um.*piada|conta.*piada|faz me rir|conta uma)/i,
  build: function() {
    return 'https://v2.jokeapi.dev/joke/Any?lang=pt';
  },
  parse: function(data) {
    try {
      if (!data || data.error) return 'Nao consegui uma piada.';
      if (data.type === 'twopart' && data.setup && data.delivery) {
        return data.setup + '\n' + data.delivery;
      }
      if (data.joke) return data.joke;
      return 'Nao consegui uma piada.';
    } catch (e) {
      return 'Nao consegui uma piada.';
    }
  }
},
    'chucknorris': {
      favicon: 'chucknorris.png',
      desc: 'piada/fato do Chuck Norris (chucknorris)',
  match: /(chuck|norris|chuck norris|fato.*chuck)/i,
  build: function (query) {
    var m = query.match(/(?:sobre|about|search)\s+(.+)/i);
    if (m && m[1] && m[1].trim().length > 0) {
      return 'https://api.chucknorris.io/jokes/search?query=' + encodeURIComponent(m[1].trim());
    }
    return 'https://api.chucknorris.io/jokes/random';
  },
  parse: function (data) {
    if (!data) return 'Chuck Norris facts unavailable.';
    if (data.value && typeof data.value === 'string') return data.value;
    if (data.result && Array.isArray(data.result) && data.result.length > 0) {
      return data.result[0].value;
    }
    return 'Chuck Norris facts unavailable.';
  }
},
    'frankfurter': {
      favicon: 'frankfurter.png',
      desc: 'converte/cota moeda (Frankfurter, taxa ECB)',
  match: /(converter?|cotaca?o|taxa|cambio|currency|moeda|eur|usd|brl|real|dolar|euro|dollar)/i,
  build: function (query, state) {
    var q = (query || '').toLowerCase();
    var base = 'USD';
    var symbols = 'BRL';
    var map = {
      usd: 'USD', dolar: 'USD', dollar: 'USD',
      brl: 'BRL', real: 'BRL', reais: 'BRL',
      eur: 'EUR', euro: 'EUR',
      gbp: 'GBP', libra: 'GBP',
      jpy: 'JPY', chf: 'CHF',
      cad: 'CAD', aud: 'AUD', cny: 'CNY'
    };
    var tokens = q.split(/[\s,;.!?]+/);
    var found = [];
    for (var i = 0; i < tokens.length; i++) {
      if (map[tokens[i]]) found.push(map[tokens[i]]);
    }
    if (found.length >= 2) {
      base = found[0];
      symbols = found[1];
    } else if (found.length === 1) {
      var em = q.match(/\b(em|to|in|para)\b\s+(\w+)/);
      if (em && map[em[2]]) {
        base = found[0];
        symbols = map[em[2]];
      } else {
        symbols = found[0];
      }
    }
    return 'https://api.frankfurter.dev/v1/latest?base=' + encodeURIComponent(base) + '&symbols=' + encodeURIComponent(symbols);
  },
  parse: function (data) {
    try {
      if (!data || !data.base || !data.rates) return 'moeda indispon\u00EDvel';
      var keys = Object.keys(data.rates);
      if (keys.length === 0) return 'moeda indispon\u00EDvel';
      var out = [];
      for (var i = 0; i < keys.length; i++) {
        out.push('1 ' + data.base + ' = ' + data.rates[keys[i]] + ' ' + keys[i]);
      }
      return out.join(' | ');
    } catch (e) {
      return 'moeda indispon\u00EDvel';
    }
  }
},
    'numbersapi': {
      favicon: 'numbersapi.png',
      desc: 'curiosidade sobre um numero (numbersapi)',
  match: /(numer\w*|number|fato.*numer\w*|curiosidade.*numer\w*|trivia|math fact)/i,
  build: function(query) {
    var m = query.match(/(\d+)/);
    var num = m ? m[1] : '42';
    return 'https://numbersapi.com/' + num + '?json';
  },
  parse: function(data) {
    try {
      if (data && typeof data.text === 'string' && data.text.length > 0) return data.text;
      return 'Nao foi possivel obter curiosidade sobre o numero.';
    } catch (e) {
      return 'Nao foi possivel obter curiosidade sobre o numero.';
    }
  }
},
    'ipapico': {
      favicon: 'ipapico.png',
      desc: 'info de IP / geolocalizacao (ipapi.co)',
  match: /(meu ip|ip publico|meu ip e|what is my ip|ip address|geolocaliza(c..o|cao)|localiza.c?ao.*ip)/i,
  build: function(query) {
    var m = query.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    if (m) return 'https://ipapi.co/' + m[1] + '/json/';
    return 'https://ipapi.co/json/';
  },
  parse: function(data) {
    if (!data || typeof data !== 'object') return 'Dados indisponiveis.';
    var ip = data.ip || '-';
    var city = data.city || '-';
    var region = data.region || '-';
    var country = data.country_name || '-';
    var lat = data.latitude != null ? data.latitude : '-';
    var lon = data.longitude != null ? data.longitude : '-';
    var tz = data.timezone || '-';
    return 'IP: ' + ip + '\n' +
      'Cidade: ' + city + '\n' +
      'Regiao: ' + region + '\n' +
      'Pais: ' + country + '\n' +
      'Lat/Lon: ' + lat + ', ' + lon + '\n' +
      'Fuso horario: ' + tz;
  }
},
    'boredapi': {
      favicon: 'boredapi.png',
      desc: 'sugestao de atividade/coisa pra fazer (boredapi)',
  match: /(entediado|bored|sugere|sugestao|algo para fazer|o que eu posso fazer|atividade|passa tempo)/i,
  build: function() {
    return 'https://www.boredapi.com/api/activity';
  },
  parse: function(data) {
    try {
      if (!data || typeof data !== 'object') {
        return 'Atividade indisponível no momento. Tente novamente.';
      }
      var activity = data.activity || 'Atividade desconhecida';
      var type = data.type || 'desconhecido';
      var participants = data.participants != null ? String(data.participants) : '?';
      var price = data.price != null ? data.price : null;
      var priceStr;
      if (price === null) {
        priceStr = 'Preço desconhecido';
      } else if (price === 0) {
        priceStr = 'Grátis';
      } else {
        priceStr = price + '/5';
      }
      return activity + '\nTipo: ' + type + '\nParticipantes: ' + participants + '\nPreço: ' + priceStr;
    } catch (e) {
      return 'Erro ao processar atividade.';
    }
  }
},
    'agify': {
      favicon: 'agify.png',
      desc: 'adivinha idade pelo nome (agify)',
  match: /(idade do\s+\w+|quantos anos tem\s+\w+|age of\s+\w+|agify|idade.*nome|nome.*idade)/i,
  build: function(query) {
    var name = 'michael';
    var m = query.match(/(?:idade do|quantos anos tem|age of|do|tem|of|para|nome?)\s+([A-Za-zÀ-ÿ]+)/i);
    if (m && m[1]) name = m[1].toLowerCase();
    return 'https://api.agify.io/?name=' + encodeURIComponent(name);
  },
  parse: function(data) {
    try {
      if (!data || typeof data !== 'object' || data.age == null) {
        return 'Nao foi possivel prever a idade.';
      }
      return 'Idade media para "' + data.name + '": ' + data.age + ' anos (base de ' + data.count + ' pessoas).';
    } catch (e) {
      return 'Nao foi possivel prever a idade.';
    }
  }
},
    'genderize': {
      favicon: 'genderize.png',
      desc: 'adivinha genero pelo nome (genderize)',
  match: /(masculino|feminino|genero do\s+\w+|gender of\s+\w+|eh homem ou mulher|menino ou menina|genero.*nome)/i,
  build: function(query) {
    var match = query.match(/(?:do|de|of|para)\s+(?:nome\s+)?(\w+)/i);
    var name = match ? match[1] : 'emily';
    return 'https://api.genderize.io/?name=' + encodeURIComponent(name);
  },
  parse: function(data) {
    try {
      if (!data || !data.name) return 'Nao foi possivel determinar o genero.';
      var gender = data.gender;
      var genderPt = gender === 'female' ? 'feminino' : gender === 'male' ? 'masculino' : 'indeterminado';
      var prob = data.probability != null ? Math.round(data.probability * 100) : 0;
      var count = data.count || 0;
      if (gender === null || gender === undefined) {
        return 'O nome "' + data.name + '" tem genero indeterminado.';
      }
      return 'O nome "' + data.name + '" e provavelmente ' + genderPt + ' (confianca ' + prob + '%, base de ' + count + ').';
    } catch (e) {
      return 'Nao foi possivel determinar o genero.';
    }
  }
},
    'universities': {
      favicon: 'universities.png',
      desc: 'busca universidades (Hipolabs)',
  match: /(universidade|university|faculdade|faculdade.*nome|busca.*universidade|universidade.*(brasil|brazil|pais|country))/i,
  build: function (query) {
    var country = 'brazil';
    var lower = (query || '').toLowerCase();
    for (var key in COUNTRY_MAP) {
      if (lower.indexOf(key) !== -1) {
        country = COUNTRY_MAP[key];
        break;
      }
    }
    return 'http://universities.hipolabs.com/search?country=' + encodeURIComponent(country);
  },
  parse: function (data) {
    if (!Array.isArray(data) || data.length === 0) {
      return 'Nenhuma universidade encontrada.';
    }
    var results = data.slice(0, 3);
    var lines = [];
    for (var i = 0; i < results.length; i++) {
      var u = results[i];
      var name = u.name || 'Desconhecida';
      var site = (u.web_pages && u.web_pages.length > 0) ? u.web_pages[0] : 'Sem site';
      lines.push(name + ' | ' + site);
    }
    return lines.join('\n');
  }
},
    'deezer': {
      favicon: 'deezer.png',
      desc: 'busca de musica/faixa (Deezer)',
  match: /(deezer|faixa|ouve.*(musica|song|track)|toque.*(musica|song)|listen to|play.*song|track.*deezer|cancao.*busca)/i,
  build: function(query) {
    const q = (query || '').replace(/deezer|faixa|ouve|toque|listen to|play|musica|song|track|busca|cancao|buscar/gi, '').trim() || 'queen';
    return 'https://api.deezer.com/search?q=' + encodeURIComponent(q) + '&limit=3';
  },
  parse: function(data) {
    try {
      if (!data || !data.data || !data.data.length) return 'Nenhuma faixa encontrada.';
      return data.data.map(function(item) {
        return item.title + ' - ' + (item.artist && item.artist.name) + ' (' + (item.album && item.album.title) + ', ' + item.duration + 's)\npreview: ' + item.preview;
      }).join('\n');
    } catch (e) {
      return 'Nenhuma faixa encontrada.';
    }
  }
},
    'lastfm': {
      favicon: 'lastfm.png',
      desc: 'ultimo scrobble/musica ouvida (ListenBrainz, keyless)',
      match: /(ultimo scrobble|ultima scrobble|ultimo listen|ultima musica ouvida|ultima tocada|last scrobble|last listen|scrobble do|scrobble de)/i,
      build: function(query) {
        var m = query.match(/(?:do|de|of|user|usuario)\s+(\w+)/i);
        var user = (m && m[1]) ? m[1].toLowerCase() : 'rj';
        return 'https://api.listenbrainz.org/1/user/' + encodeURIComponent(user) + '/listens?count=1';
      },
      parse: function(data) {
        if (!data || !data.payload || !Array.isArray(data.payload.listens) || data.payload.listens.length === 0) {
          return 'Nenhum scrobble encontrado para esse usuario.';
        }
        var l = data.payload.listens[0];
        var t = l.track_metadata || {};
        var played = l.played_at ? new Date(l.played_at * 1000).toISOString().slice(0, 16).replace('T', ' ') : 'data desconhecida';
        return 'Ultimo scrobble: "' + (t.track_name || '?') + '" por ' + (t.artist_name || '?') + ' (' + (t.release_name || 'sem album') + ', ' + played + ' UTC)';
      }
    },
    'wttr': {
      favicon: 'wttr.png',
      desc: 'previsao do tempo detalhada (wttr.in, keyless)',
      match: /(wttr|previsao completa|clima completo|tempo agora em|weather json)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(wttr|previsao completa|clima completo|tempo agora em|weather json|clima em|tempo em|previsao do tempo em)/gi, '').replace(/[?.!]/g, '').trim();
        if (q) return 'https://wttr.in/' + encodeURIComponent(q) + '?format=j1&lang=pt';
        var c = state.coords || { lat: 0, lon: 0 };
        return 'https://wttr.in/' + c.lat + ',' + c.lon + '?format=j1&lang=pt';
      },
      parse: function(data) {
        try {
          if (!data || !data.current_condition || !data.current_condition.length) return 'Sem dados de clima.';
          var c = data.current_condition[0];
          var desc = (c.weatherDesc && c.weatherDesc[0] && c.weatherDesc[0].value) || 'desconhecido';
          var temp = c.temp_C != null ? c.temp_C : '?';
          var feels = c.FeelsLikeC != null ? c.FeelsLikeC : '?';
          var hum = c.humidity != null ? c.humidity : '?';
          var wind = c.windspeedKmph != null ? c.windspeedKmph : '?';
          var area = '';
          if (data.nearest_area && data.nearest_area[0]) {
            var a = data.nearest_area[0];
            var name = (a.areaName && a.areaName[0] && a.areaName[0].value) || '';
            var country = (a.country && a.country[0] && a.country[0].value) || '';
            area = (name || '') + (country ? ', ' + country : '');
          }
          var head = area ? 'Clima em ' + area + ':\n' : '';
          return head + 'Atual: ' + desc + ', ' + temp + '°C (sensacao ' + feels + '°C)\nUmidade: ' + hum + '%\nVento: ' + wind + ' km/h';
        } catch (e) {
          return 'Erro ao processar clima.';
        }
      }
    },
    'coingecko': {
      favicon: 'coingecko.png',
      desc: 'preco de cripto (CoinGecko, keyless)',
      match: /(preco.*(btc|bitcoin|eth|ethereum|doge|dogecoin|ltc|litecoin|cardano|ada|solana|sol|xrp|ripple|bnb|tether|usdt|cripto|crypto|moeda digital)|valor.*(btc|bitcoin|eth|ethereum)|cotaca[cço].*(btc|bitcoin|eth|ethereum)|cripto.*hoje|crypto.*price|quanto.*(ta|esta|custa|vale).*(btc|bitcoin|eth|ethereum|doge|dogecoin|ltc|litecoin|cardano|ada|solana|sol|xrp|ripple|bnb|tether|usdt|cripto|crypto))/i,
      build: function(query) {
        var map = {
          bitcoin:'bitcoin',btc:'bitcoin',ethereum:'ethereum',eth:'ethereum',
          doge:'dogecoin',dogecoin:'dogecoin',litecoin:'litecoin',ltc:'litecoin',
          cardano:'cardano',ada:'cardano',solana:'solana',sol:'solana',
          ripple:'ripple',xrp:'ripple',bnb:'binancecoin',
          tether:'tether',usdt:'tether'
        };
        var cMap = { usd:'usd', dolar:'usd', brl:'brl', real:'brl', eur:'eur', euro:'eur', gbp:'gbp', libra:'gbp', jpy:'jpy' };
        var q = (query || '').toLowerCase();
        var coin = 'bitcoin';
        var curr = 'brl';
        var tokens = q.split(/[\s,;]+/);
        for (var i = 0; i < tokens.length; i++) {
          if (map[tokens[i]]) { coin = map[tokens[i]]; break; }
        }
        for (var j = 0; j < tokens.length; j++) {
          if (cMap[tokens[j]]) { curr = cMap[tokens[j]]; break; }
        }
        return 'https://api.coingecko.com/api/v3/simple/price?ids=' + coin + '&vs_currencies=' + curr;
      },
      parse: function(data) {
        try {
          if (!data || typeof data !== 'object') return 'Sem dados.';
          var keys = Object.keys(data);
          if (keys.length === 0) return 'Moeda nao encontrada.';
          var obj = data[keys[0]];
          if (!obj || typeof obj !== 'object') return 'Sem dados.';
          var innerKeys = Object.keys(obj);
          if (innerKeys.length === 0) return 'Sem cotacao.';
          var parts = [];
          for (var i = 0; i < innerKeys.length; i++) {
            var k = innerKeys[i];
            var v = obj[k];
            parts.push('1 ' + keys[0] + ' = ' + v + ' ' + k.toUpperCase());
          }
          return parts.join(' | ');
        } catch (e) {
          return 'Erro ao processar cotacao.';
        }
      }
    },
    'qrcode': {
      favicon: 'qrcode.png',
      desc: 'gerador de QR code (goqr.me, keyless, retorna PNG; parse usa wrapper {url} - raw mode ainda nao suportado em brain.js)',
      match: /(qr\s*code|qrcode|gera.*qr|cria.*qr|fazer.*qr)/i,
      build: function(query) {
        var q = (query || '').replace(/qr\s*code|qrcode/gi, '').replace(/\b(gera(r)?|cria(r)?|fazer)\b/gi, '').replace(/^(de|do|da|para|com|with)\s+/i, '').trim();
        var data = q || 'https://github.com/havaianasdestruido/hemorroidabot';
        return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(data);
      },
      parse: function(data) {
        try {
          var url = (data && typeof data === 'object' && data.url) ? data.url : (typeof data === 'string' ? data : null);
          if (!url) return 'QR code indisponivel.';
          return '![QR](' + url + ')';
        } catch (e) {
          return 'QR code indisponivel.';
        }
      }
    },
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

  function externalExampleFor(tool) {
    const ex = {
      'wikipedia': 'o que e wikipedia brasil',
      'open-meteo': 'clima agora',
      'pokemon': 'info pokemon charizard',
      'itunes': 'musica do pink floyd',
      'npm': 'info npm lodash',
      'dog-ceo': 'me mostra um cachorro',
      'catfact': 'fato sobre gatos',
      'restcountries': 'info do pais brasil',
      'openlibrary': 'busca livro hobbit',
      'jokeapi': 'conta uma piada',
      'chucknorris': 'fato do chuck norris',
      'frankfurter': 'converter 1 real em dolar',
      'numbersapi': 'fato sobre o numero 7',
      'ipapico': 'qual meu ip',
      'boredapi': 'estou entediado',
      'agify': 'qual a idade do jose',
      'genderize': 'o nome lucas e masculino ou feminino',
      'universities': 'busca universidades do brasil',
      'deezer': 'busca deezer queen',
      'lastfm': 'ultimo scrobble do rj',
      'wttr': 'tempo agora em sao paulo',
      'coingecko': 'preco do bitcoin',
      'qrcode': 'qrcode do google'
    };
    return ex[tool] || tool;
  }

  function chainFor(tool, text, state) {
    const t = EXTERNAL_TOOLS[tool];
    if (!t || !t.favicon) return [];
    const url = t.build(text, state || {});
    if (t.chain) return t.chain(text, state || {}, url);
    const parsed = new URL(url, 'https://x');
    const label = extractChainLabel(tool, text, parsed);
    return [{ label: label, icon: t.favicon }];
  }

  function extractChainLabel(tool, text, parsed) {
    switch (tool) {
      case 'wikipedia': {
        const parts = parsed.pathname.split('/');
        const q = decodeURIComponent(parts[parts.length - 1] || '');
        return q ? 'searching "' + q + '"' : 'consulting Wikipedia';
      }
      case 'open-meteo': return 'fetching weather data';
      case 'pokemon': {
        const parts = parsed.pathname.split('/');
        const name = parts[parts.length - 1] || '';
        return name ? 'looking up "' + name + '"' : 'consulting PokéAPI';
      }
      case 'itunes': {
        const q = parsed.searchParams.get('term') || '';
        return q ? 'searching iTunes for "' + q + '"' : 'searching iTunes';
      }
      case 'npm': {
        const parts = parsed.pathname.split('/');
        const pkg = parts[parts.length - 1] || '';
        return pkg ? 'looking up npm package "' + pkg + '"' : 'consulting npm';
      }
      case 'dog-ceo': return 'fetching random dog image';
      case 'catfact': return 'fetching random cat fact';
      case 'restcountries': {
        const parts = parsed.pathname.split('/');
        const q = decodeURIComponent(parts[parts.length - 1] || '');
        return q ? 'searching country "' + q + '"' : 'searching country info';
      }
      case 'openlibrary': {
        const q = parsed.searchParams.get('q') || '';
        return q ? 'searching books for "' + q + '"' : 'searching Open Library';
      }
      case 'jokeapi': return 'fetching a random joke';
      case 'chucknorris': {
        if (parsed.pathname.includes('/random')) return 'fetching Chuck Norris joke';
        const q = parsed.searchParams.get('query') || '';
        return q ? 'searching Chuck Norris facts for "' + q + '"' : 'fetching Chuck Norris joke';
      }
      case 'frankfurter': {
        const base = parsed.searchParams.get('base') || '';
        const syms = parsed.searchParams.get('symbols') || '';
        return base && syms ? 'converting ' + base + ' to ' + syms : 'consulting currency rates';
      }
      case 'numbersapi': {
        const parts = parsed.pathname.split('/');
        const n = parts[1] || '42';
        return 'fetching fact about number ' + n;
      }
      case 'ipapico': {
        const ip = parsed.pathname.split('/')[1];
        return ip && ip !== 'json' ? 'looking up IP ' + ip : 'fetching your public IP info';
      }
      case 'boredapi': return 'finding an activity for you';
      case 'agify': {
        const name = parsed.searchParams.get('name') || '';
        return name ? 'predicting age for "' + name + '"' : 'predicting age';
      }
      case 'genderize': {
        const name = parsed.searchParams.get('name') || '';
        return name ? 'predicting gender for "' + name + '"' : 'predicting gender';
      }
      case 'universities': {
        const country = parsed.searchParams.get('country') || '';
        return country ? 'searching universities in ' + country : 'searching universities';
      }
      case 'deezer': {
        const q = parsed.searchParams.get('q') || '';
        return q ? 'searching Deezer for "' + decodeURIComponent(q) + '"' : 'searching Deezer';
      }
      case 'lastfm': {
        const parts = parsed.pathname.split('/');
        const user = parts[3] || 'rj';
        return 'checking last scrobble for "' + user + '"';
      }
      case 'wttr': {
        let loc = parsed.host + parsed.pathname + parsed.search;
        return 'fetching weather at ' + loc;
      }
      case 'coingecko': {
        const ids = parsed.searchParams.get('ids') || 'bitcoin';
        return 'fetching crypto price for ' + ids;
      }
      case 'qrcode': return 'generating QR code';
      default: return 'consulting ' + tool;
    }
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
    externalExampleFor: externalExampleFor,
    chainFor: chainFor,
    runExternal: runExternal,
    LOCAL_TOOLS: LOCAL_TOOLS,
    EXTERNAL_TOOLS: EXTERNAL_TOOLS,
    recordPerf: recordPerf,
    getPerf: getPerf
  };
})();
