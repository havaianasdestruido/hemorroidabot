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
    'dictionary': {
      favicon: 'dictionary.png',
      desc: 'definicao de palavra em ingles (dictionaryapi.dev, keyless)',
      match: /(dicionario|definicao de|meaning of|significado de|define a palavra|o que significa a palavra)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(dicionario|definicao de|meaning of|significado de|define a palavra|o que significa a palavra)/gi, '').replace(/[?.!]/g, '').trim();
        if (!q) q = 'hello';
        return 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(q);
      },
      parse: function(data) {
        try {
          if (!Array.isArray(data) || !data.length) return 'Palavra nao encontrada.';
          var entry = data[0];
          var word = entry.word || '?';
          var meaning = entry.meanings && entry.meanings[0];
          var def = meaning && meaning.definitions && meaning.definitions[0] && meaning.definitions[0].definition;
          if (!def) return 'Palavra nao encontrada.';
          var pos = (meaning && meaning.partOfSpeech) || '?';
          return '"' + word + '" (' + pos + '): ' + def;
        } catch (e) {
          return 'Palavra nao encontrada.';
        }
      }
    },
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
    'httppets': {
      favicon: 'httppets.png',
      desc: 'foto de cachorro/gatinho para codigo de status HTTP (http.dog, keyless, JSON)',
      match: /(http dog|status code do http|http cat|status code do|status code de|qual o status|status dog|status cat|foto do status|ctrl alt del status)/i,
      build: function(query) {
        var q = query || '';
        if (/\/infty\b/i.test(q)) return 'https://http.dog/599.json';
        if (/\/(?:dunder|mifflin)\b/i.test(q)) return 'https://http.dog/200.json';
        var m = q.match(/\b([1-5]\d{2})\b/);
        var code = m ? m[1] : 200;
        return 'https://http.dog/' + code + '.json';
      },
      parse: function(data) {
        try {
          var out = '';
          var code = (data && data.status_code != null) ? data.status_code : null;
          var title = (data && data.title) ? data.title : '';
          var image = (data && data.image) ? data.image : '';
          if (code != null) out += 'HTTP ' + code;
          if (title) out += (out ? ' – ' : '') + title;
          if (image) out += (out ? '\nFoto: ' : 'Foto: ') + image;
          if (out) return out;
          return 'Status HTTP indisponivel no momento.';
        } catch (e) {
          return 'Status HTTP indisponivel no momento.';
        }
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
'trivia': {
      favicon: 'trivia.png',
      desc: 'pergunta de trivia / quiz aleatorio (Open Trivia DB, keyless)',
      match: /(quiz|trivia|pergunta de teste|teste de conhecimento|conhecimento geral)/i,
      build: function(query, state) {
        return 'https://opentdb.com/api.php?amount=1&type=multiple';
      },
      parse: function(data) {
        try {
          if (!data || !data.results || !data.results.length) return 'Sem perguntas agora.';
          var r = data.results[0];
          var q = r.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
          var a = r.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
          var cat = r.category || 'Geral';
          return 'Pergunta (' + cat + '):\n' + q + '\nResposta: ' + a;
        } catch (e) {
          return 'Sem perguntas agora.';
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
    'advice': {
      favicon: 'advice.png',
      desc: 'conselhos aleatorios (AdviceSlip, keyless)',
      match: /(conselho|me aconselhe|advice|me de uma dica|sobrevivencia)/i,
      build: function() {
        return 'https://api.adviceslip.com/advice';
      },
      parse: function(data) {
        try {
          if (!data || !data.slip || !data.slip.advice) return 'Sem conselhos no momento.';
          return 'Conselho: ' + data.slip.advice;
        } catch (e) {
          return 'Sem conselhos no momento.';
        }
      }
    },
    'kanye': {
      favicon: 'kanye.png',
      desc: 'citacao de Kanye West (kanye.rest, keyless)',
      match: /(kanye|frase do kanye|cita.*kanye|inspira.*kanye)/i,
      build: function() {
        return 'https://api.kanye.rest/';
      },
      parse: function(data) {
        try {
          if (!data || !data.quote) return 'Sem citacao de Kanye agora.';
          return 'Kanye: "' + data.quote + '"';
        } catch (e) {
          return 'Sem citacao de Kanye agora.';
        }
      }
    },
    'poetry': {
      favicon: 'poetry.png',
      desc: 'poema aleatorio do PoetryDB (keyless)',
      match: /(poema|poesia|poeta|verso|versos|uma poema)/i,
      build: function() {
        return 'https://poetrydb.org/random';
      },
      parse: function(data) {
        try {
          if (!data || !Array.isArray(data) || !data.length) return 'Nenhum poema encontrado.';
          var poem = data[0];
          var title = poem.title || 'Sem titulo';
          var author = poem.author || 'Desconhecido';
          var lines = Array.isArray(poem.lines) ? poem.lines.slice(0, 4) : [];
          return title + '\n— ' + author + '\n\n' + lines.join('\n');
        } catch (e) {
          return 'Nenhum poema encontrado.';
        }
      }
    },
    'datamuse': {
      favicon: 'datamuse.png',
      desc: 'sinonimos, rimas e palavras parecidas (datamuse, keyless)',
      match: /(sinonimo de|sinonimos de|rima com|rhyme with|palavras parecidas)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(sinonimo de|sinonimos de|rima com|rhyme with|palavras parecidas)/gi, '').replace(/[?.!]/g, '').trim();
        if (q) return 'https://api.datamuse.com/words?rel_syn=' + encodeURIComponent(q);
        return 'https://api.datamuse.com/words?rel_syn=' + encodeURIComponent('happy');
      },
      parse: function(data, word) {
        try {
          if (!data || !Array.isArray(data) || !data.length) return 'Nenhuma palavra encontrada.';
          var target = (word || '').trim() || 'the query';
          var words = data.slice(0, 5).map(function(item) { return item.word; });
          return 'Sinonimos de ' + target + ': ' + words.join(', ');
        } catch (e) {
          return 'Nenhuma palavra encontrada.';
        }
      }
    },
    'animefacts': {
      favicon: 'animefacts.png',
      desc: 'fato/curiosidade sobre anime (AnimeFacts, keyless)',
      match: /(fato sobre anime|fatos sobre anime|curiosidade do anime|animefacts|fato do anime)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(fato sobre anime|fatos sobre anime|curiosidade do anime|animefacts|fato do anime)/gi, '').replace(/[?.!,;:]/g, '').trim();
        if (state && q) state.anime_name = q;
        return 'https://chandan-02.github.io/anime-facts-rest-api/fact.json';
      },
      parse: function(data, state) {
        try {
          var list = (data && Array.isArray(data.data)) ? data.data : [];
          if (!list.length) return 'Sem fatos sobre anime agora.';
          var word = '';
          if (typeof state === 'string') word = state;
          else if (state && typeof state === 'object') word = state.anime_name || (state.animefacts && state.animefacts.name) || '';
          if (word) {
            var w = String(word).toLowerCase();
            list = list.filter(function(f) {
              return f && f.anime_name && String(f.anime_name).toLowerCase().indexOf(w) !== -1;
            });
            if (!list.length) return 'Sem fatos sobre anime agora.';
          }
          var f = list[Math.floor(Math.random() * list.length)];
          return '"' + (f.anime_name || 'Desconhecido') + '"\nFato: ' + (f.fact || '');
        } catch (e) {
          return 'Sem fatos sobre anime agora.';
        }
      }
    },
    'anime': {
      favicon: 'anime.png',
      desc: 'busca de anime/manga no Jikan (MyAnimeList, keyless)',
      match: /(anime|manga|personagem anime)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(anime|manga|personagem)/gi, '').replace(/[?.!]/g, '').trim();
        if (!q) q = 'one piece';
        return 'https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(q) + '&limit=3&sfw=true';
      },
      parse: function(data) {
        try {
          if (!data || !data.data || !data.data[0]) return 'Anime nao encontrado.';
          var a = data.data[0];
          var title = a.title || 'Desconhecido';
          var score = a.score != null ? a.score : '?';
          var episodes = a.episodes != null ? a.episodes : '?';
          var status = a.status || 'desconhecido';
          var synopsis = a.synopsis || '';
          if (synopsis.length > 120) synopsis = synopsis.slice(0, 120) + '...';
          return 'Titulo: ' + title + '\nNota: ' + score + '/10\nEpisodios: ' + episodes + '\nStatus: ' + status + '\nSinopse: ' + synopsis;
        } catch (e) {
          return 'Anime nao encontrado.';
        }
      }
    },
    'starwars': {
      favicon: 'starwars.png',
      desc: 'personagem de Star Wars (SWAPI, keyless)',
      match: /(star wars|jedi|sith|luke skywalker|darth vader|yoda|personagem de star wars)/i,
      build: function(query) {
        try {
          var m = (query || '').match(/(star wars|jedi|sith|luke skywalker|darth vader|yoda|personagem de star wars)/i);
          var rest = (query || '').replace(m ? m[1] : '', '').replace(/[?.!,]/g, '').trim();
          return 'https://swapi.dev/api/people/?search=' + encodeURIComponent(rest || 'luke');
        } catch (e) {
          return 'https://swapi.dev/api/people/?search=luke';
        }
      },
      parse: function(data) {
        try {
          if (!data || !data.results || !data.results.length) return 'Personagem nao encontrado.';
          var p = data.results[0];
          return 'Personagem: ' + p.name + '\nAltura: ' + p.height + ' cm\nMassa: ' + p.mass + ' kg\nGenero: ' + p.gender + '\nAno de nascimento: ' + p.birth_year;
        } catch (e) {
          return 'Personagem nao encontrado.';
        }
      }
    },
'rickandmorty': {
      favicon: 'rickandmorty.png',
      desc: 'busca personagem de Rick and Morty (rickandmortyapi.com, keyless)',
      match: /(rick and morty|rick e morty|personagem do rick|morty)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(rick and morty|rick e morty|personagem do rick|morty|personagem|do |de |da | and | e )/gi, '').replace(/[?.!,;:]/g, '').replace(/\s+/g, ' ').trim();
        if (!q) q = 'rick';
        return 'https://rickandmortyapi.com/api/character/?name=' + encodeURIComponent(q);
      },
      parse: function(data) {
        try {
          if (!data || !data.results || !data.results.length) return 'Personagem nao encontrado.';
          var r = data.results[0];
          var origin = (r.origin && r.origin.name) || 'desconhecida';
          return 'Nome: ' + r.name + '\nStatus: ' + r.status + '\nEspecie: ' + r.species + '\nGenero: ' + r.gender + '\nOrigem: ' + origin + '\nImagem: ' + r.image;
        } catch (e) {
          return 'Personagem nao encontrado.';
        }
      }
    },
    'recipe': {
      favicon: 'recipe.png',
      desc: 'receitas aleatorias ou por nome (TheMealDB, keyless)',
      match: /(receita|receita de|cozinh|culinaria|recipe)/i,
      build: function(query, state) {
        try {
          var q = (query || '').replace(/(receita de|receita)/gi, '').replace(/[?.!]/g, '').trim();
          if (q) return 'https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q);
          return 'https://www.themealdb.com/api/json/v1/1/random.php';
        } catch (e) {
          return 'https://www.themealdb.com/api/json/v1/1/random.php';
        }
      },
      parse: function(data) {
        try {
          if (!data || !data.meals || !data.meals.length) return 'Receita nao encontrada.';
          var m = data.meals[0];
          var name = m.strMeal || 'sem nome';
          var cat = m.strCategory || 'desconhecida';
          var thumb = m.strMealThumb || '';
          var instr = (m.strInstructions || '').replace(/\s+/g, ' ').trim();
          var res = name + ' (' + cat + ')\n';
          if (thumb) res += thumb + '\n';
          if (instr) res += instr.slice(0, 120) + (instr.length > 120 ? '...' : '');
          return res;
        } catch (e) {
          return 'Receita nao encontrada.';
        }
      }
    },
    'github': {
      favicon: 'github.png',
      desc: 'perfil publico do github (keyless)',
      match: /(github|perfil no github|usuario do github|github do)/i,
      build: function(query) {
        var q = (query || '').replace(/(github|perfil no github|usuario do github|github do|perfil de|usuario de|do |de )/gi, '').replace(/[?.!]/g, '').trim();
        return 'https://api.github.com/users/' + encodeURIComponent(q || 'torvalds');
      },
      parse: function(data) {
        try {
          if (!data || !data.login) return 'Usuario nao encontrado.';
          return (data.name || data.login) + ' — ' + (data.bio || 'sem bio') + '\nRepos publicos: ' + (data.public_repos != null ? data.public_repos : '?') + '\nSeguidores: ' + (data.followers != null ? data.followers : '?') + '\nLink: ' + (data.html_url || '');
        } catch (e) {
          return 'Usuario nao encontrado.';
        }
      }
    },
    'randomuser': {
      favicon: 'randomuser.png',
      desc: 'pessoa aleatoria (RandomUser, keyless)',
      match: /(pessoa aleatoria|random user|usuario aleatorio|gera uma pessoa|pessoa ficticia)/i,
      build: function(query, state) {
        return 'https://randomuser.me/api/?nat=br';
      },
      parse: function(data) {
        try {
          if (!data || !data.results || !data.results.length) return 'Pessoa nao encontrada.';
          var p = data.results[0];
          var name = (p.name && p.name.first) + ' ' + (p.name && p.name.last);
          var email = p.email || '?';
          var phone = p.phone || '?';
          var loc = '';
          if (p.location && p.location.city) {
            loc = p.location.city + (p.location.country ? ', ' + p.location.country : '');
          }
          var thumb = (p.picture && p.picture.thumbnail) || '';
          var line = 'Nome: ' + name + '\nEmail: ' + email + '\nTelefone: ' + phone;
          if (loc) line += '\nLocalizacao: ' + loc;
          if (thumb) line += '\nFoto: ' + thumb;
          return line;
        } catch (e) {
          return 'Pessoa nao encontrada.';
        }
      }
    },
    'news': {
      favicon: 'news.png',
      desc: 'ultimas noticias tech do Hacker News (keyless)',
      match: /(hacker news|noticias.*tech|top stories|topstories|news ycombinator|hn algo)/i,
      build: function() {
        return 'https://hacker-news.firebaseio.com/v0/topstories.json';
      },
      parse: function(data) {
        try {
          if (!Array.isArray(data) || data.length === 0) return 'Sem noticias agora.';
          return data.slice(0, 5).map(function(id) {
            return 'https://news.ycombinator.com/item?id=' + id;
          }).join('\n');
        } catch (e) {
          return 'Sem noticias agora.';
        }
      }
    },
    'quran': {
      favicon: 'quran.png',
      desc: 'versiculo aleatorio do Corao em arabe e portugues (AlQuran Cloud, keyless)',
      match: /(alcorao|alcorao|corao|surata|versiculo do corao)/i,
      build: function(query, state) {
        return 'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,pt-br';
      },
      parse: function(data) {
        try {
          if (!data || !data.data || !data.data.editions || !data.data.editions.length) return 'Sem versiculo do Corao agora.';
          var editions = data.data.editions;
          var ed = editions.filter(function(e) { return e.edition && e.edition.language === 'pt'; })[0];
          if (!ed) ed = editions[0];
          var surah = (ed.surah && ed.surah.number) || '?';
          var ayah = ed.numberInSurah != null ? ed.numberInSurah : '?';
          var id = (ed.edition && ed.edition.identifier) || 'desconhecido';
          return 'Surah ' + surah + ':' + ayah + ' (' + id + ')\n' + (ed.text || '');
        } catch (e) {
          return 'Sem versiculo do Corao agora.';
        }
      }
    },
    'bible': {
      favicon: 'bible.png',
      desc: 'versiculo aleatorio da biblia (Bible API, keyless)',
      match: /(versiculo|versiculo da biblia|biblia|salmo|palavra de deus)/i,
      build: function(query) {
        try {
          return 'https://bible-api.com/data/web/random';
        } catch (e) {
          return 'https://bible-api.com/data/web/random';
        }
      },
      parse: function(data) {
        try {
          if (!data || !data.random_verse) return 'Sem versiculo agora.';
          var v = data.random_verse;
          var text = (v.text || '').trim();
          var ref = (v.reference || '').trim();
          var trans = (v.translation_name || '');
          if (!text) return 'Sem versiculo agora.';
          return text + '\n— ' + ref + ' (' + trans + ')';
        } catch (e) {
          return 'Sem versiculo agora.';
        }
      }
    },
    'fishwatch': {
      favicon: 'fishwatch.png',
      desc: 'informacao sobre especies marinhas (FishWatch, keyless)',
      match: /(peixe|fish|especie marinha|frutos do mar|info.*peixe)/i,
      build: function(query, state) {
        return 'https://www.fishwatch.gov/api/species';
      },
      parse: function(data) {
        try {
          if (!Array.isArray(data) || data.length === 0) return 'Peixe nao encontrado.';
          var s = data[Math.floor(Math.random() * data.length)];
          var name = (s && s.name) || 'Desconhecido';
          var sci = (s && s.scientific_name) || 'Desconhecido';
          var reg = (s && s.harvest_type) || 'Desconhecido';
          var hab = (s && s.habitat) || 'Desconhecido';
          if (hab.length > 80) hab = hab.slice(0, 80);
          var img = 'Indisponivel';
          if (s && Array.isArray(s.image_gallery) && s.image_gallery.length && s.image_gallery[0] && s.image_gallery[0].src) {
            img = s.image_gallery[0].src;
          }
          return 'Nome: ' + name + '\nNome cientifico: ' + sci + '\nRegiao: ' + reg + '\nHabitat: ' + hab + '\nImagem: ' + img;
        } catch (e) {
          return 'Erro ao processar especie.';
        }
      }
    },
    'dogfacts': {
      favicon: 'dogfacts.png',
      desc: 'fatos caninos curiosos (dog-api.kinduff.com, keyless)',
      match: /(fato canino|fatos caninos|curiosidade canina|fact canino|cachorrinho trivia)/i,
      build: function(query) {
        return 'https://dog-api.kinduff.com/api/facts?number=2';
      },
      parse: function(data) {
        try {
          if (!data || !data.facts || !data.facts.length) return 'Sem fatos agora.';
          var list = data.facts.slice(0, 2).map(function(f) { return '- ' + String(f); });
          return 'Fatos sobre caes:\n' + list.join('\n');
        } catch (e) {
          return 'Sem fatos agora.';
        }
      }
    },
    'jsonplaceholder': {
      favicon: 'jsonplaceholder.png',
      desc: 'endpoint de teste mock-rest (JSONPlaceholder, keyless)',
      match: /(json placeholder|placeholder json|mock rest|dados fake|endpoint de teste|teste de api rest)/i,
      build: function(query, state) {
        try {
          var q = (query || '').trim();
          var m = q.match(/(\d+)/);
          var n = m ? m[1] : 1;
          return 'https://jsonplaceholder.typicode.com/posts/' + encodeURIComponent(n);
        } catch (e) {
          return 'https://jsonplaceholder.typicode.com/posts/1';
        }
      },
      parse: function(data) {
        try {
          if (!data || !data.id) return 'Post nao encontrado.';
          return 'Post ' + data.id + ':\n' + data.title + '\n\n' + data.body;
        } catch (e) {
          return 'Post nao encontrado.';
        }
      }
    },
    'countapi': {
      favicon: 'countapi.png',
      desc: 'contador de visitas (CountAPI, keyless)',
      match: /(contador de visitas|quantas visitas|contagem de visitas|hit counter|quantos acessos)/i,
      build: function() {
        return 'https://api.countapi.xyz/hit/hemorroidabot/visitas';
      },
      parse: function(data) {
        try {
          if (!data || data.value == null) return 'Contador indisponivel.';
          return 'Total de visitas: ' + data.value;
        } catch (e) {
          return 'Contador indisponivel.';
        }
      }
    },
    'fox': {
      favicon: 'fox.png',
      desc: 'foto aleatoria de raposa (randomfox.ca, keyless)',
      match: /(raposa|fox|foto de raposa|imagem.*raposa)/i,
      build: function(query, state) {
        return 'https://randomfox.ca/floof/';
      },
      parse: function(data) {
        try {
          if (!data || !data.image) return 'Raposa nao encontrada.';
          return 'Raposa:\n' + data.image;
        } catch (e) {
          return 'Raposa nao encontrada.';
        }
      }
    },
    'emoji': {
      favicon: 'emoji.png',
      desc: 'emoji aleatorio (EmojiHub, keyless)',
      match: /(emoji aleatorio|manda um emoji|um emoji|emoji para)/i,
      build: function(query) {
        return 'https://emojihub.yurace.pro/api/random';
      },
      parse: function(data) {
        try {
          if (!data || !data.name || !data.htmlCode || !data.htmlCode.length) return 'Emoji nao encontrado.';
          var code = data.htmlCode.join('');
          var cat = data.category || 'desconhecida';
          return code + '\n' + data.name + ' (' + cat + ')';
        } catch (e) {
          return 'Emoji nao encontrado.';
        }
      }
    },
    'fruityvice': {
      favicon: 'fruityvice.png',
      desc: 'informacoes nutricionais de frutas (Fruityvice, keyless)',
      match: /(fruta|fruit|info.*fruta|valor nutricional|calorias da)/i,
      build: function(query, state) {
        var q = (query || '').replace(/(fruta|fruit|info.*fruta|valor nutricional|calorias da|da fruta|de fruta)/gi, '').replace(/[?.!,:]/g, '').trim();
        if (!q) q = 'banana';
        return 'https://www.fruityvice.com/api/fruit/' + encodeURIComponent(q);
      },
      parse: function(data) {
        try {
          if (!data || !data.name) return 'Fruta nao encontrada.';
          var fam = data.family || '?';
          var n = data.nutritions || {};
          var num = function(v) { return v != null ? v : '?'; };
          return data.name + ' (' + fam + ')\nCalorias: ' + num(n.calories) + ' kcal\nAcucar: ' + num(n.sugar) + ' g\nCarboidratos: ' + num(n.carbohydrates) + ' g\nProteina: ' + num(n.protein) + ' g\nGordura: ' + num(n.fat) + ' g';
        } catch (e) {
          return 'Fruta nao encontrada.';
        }
      }
    },
    'deckofcards': {
      favicon: 'deckofcards.png',
      desc: 'compra/sorteia cartas de um baralho (deckofcardsapi, keyless)',
      match: /(baralho|cartas?|comprar carta|jogo de cartas|sorteia uma carta|tira uma carta)/i,
      build: function(query) {
        var n = 1;
        var q = query || '';
        var m = q.match(/(\d+)/);
        if (m) {
          var c = parseInt(m[1], 10);
          if (c >= 1 && c <= 5) n = c;
        }
        return 'https://deckofcardsapi.com/api/deck/new/draw/?count=' + n;
      },
      parse: function(data) {
        try {
          if (!data || !Array.isArray(data.cards) || !data.cards.length) return 'Carta nao encontrada.';
          var card = data.cards[0];
          var value = card.value || '?';
          var suit = card.suit || '?';
          var image = card.image || '?';
          var remaining = data.remaining != null ? data.remaining : '?';
          return 'Carta: ' + value + ' de ' + suit + '\nImagem: ' + image + '\nRestantes: ' + remaining;
        } catch (e) {
          return 'Carta nao encontrada.';
        }
      }
    },
    'tronalddump': {
      favicon: 'tronalddump.png',
      desc: 'citacao do donald trump (tronalddump.io, keyless)',
      match: /(tronald dump|tronald|trump|donald trump|fato do trump|frase do trump)/i,
      build: function(query) {
        return 'https://api.tronalddump.io/random/quote';
      },
      parse: function(data) {
        try {
          var value = (data && data.value && String(data.value)) || '';
          return value ? 'Tronald Dump: "' + value + '"' : 'Sem citacao do trump agora.';
        } catch (e) {
          return 'Sem citacao do trump agora.';
        }
      }
    },
    'urban': {
      favicon: 'urban.png',
      desc: 'significado de giria (Urban Dictionary, keyless)',
      match: /(giria|giria de|urban dictionary|slang|o que quer dizer na giria|termo da internet)/i,
      build: function(query) {
        try {
          var q = (query || '').replace(/(giria de|giria|urban dictionary de|urban dictionary|slang de|slang|o que quer dizer na giria|termo da internet)/gi, '').replace(/[?.!]/g, '').trim();
          if (!q) q = 'lol';
          return 'https://api.urbandictionary.com/v0/define?term=' + encodeURIComponent(q);
        } catch (e) {
          return 'https://api.urbandictionary.com/v0/define?term=lol';
        }
      },
      parse: function(data) {
        try {
          if (!data || !data.list || !data.list.length) return 'Giria nao encontrada.';
          var item = data.list[0];
          var word = item.word != null ? item.word : '?';
          var def = (item.definition || '').replace(/\s+/g, ' ').trim();
          if (!def) return 'Giria nao encontrada.';
          if (def.length > 140) def = def.slice(0, 140) + '...';
          var ex = (item.example || '').replace(/\s+/g, ' ').trim();
          if (ex.length > 80) ex = ex.slice(0, 80) + '...';
          var out = 'Giria: ' + word + '\n' + def;
          if (ex) out += '\nexemplo: ' + ex;
          return out;
        } catch (e) {
          return 'Giria nao encontrada.';
        }
      }
    },
    'shibe': {
      favicon: 'shibe.png',
      desc: 'foto de shiba inu (shibe.online, keyless)',
      match: /(shiba|shibe)/i,
      build: function() {
        return 'https://shibe.online/api/shibes?count=1&urls=true';
      },
      parse: function(data) {
        try {
          if (!data || !Array.isArray(data) || !data.length) return 'Shiba nao encontrado.';
          return 'Shiba:\n' + data[0];
        } catch (e) {
          return 'Shiba nao encontrado.';
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
      'qrcode': 'qrcode do google',
      'dictionary': 'definicao de serendipity',
      'advice': 'me da um conselho',
      'trivia': 'quiz para mim',
      'kanye': 'kanye para mim',
      'poetry': 'poema',
      'datamuse': 'sinonimo de happy',
      'anime': 'anime naruto',
      'starwars': 'star wars luke',
      'rickandmorty': 'personagem do rick and morty rick',
      'recipe': 'receita de pizza',
      'github': 'github do torvalds',
      'randomuser': 'me da uma pessoa aleatoria',
      'news': 'noticias tech para mim',
      'httppets': 'qual o status dog 404',
      'animefacts': 'fato sobre anime',
      'quran': 'versiculo do corao para mim',
      'bible': 'versiculo da biblia para mim',
      'fishwatch': 'me da info sobre peixe',
      'dogfacts': 'me da um fato canino',
      'jsonplaceholder': 'me mostra um post do json placeholder',
      'countapi': 'quantas visitas meu site tem',
      'fox': 'me mostra uma raposa',
      'emoji': 'manda um emoji',
      'fruityvice': 'info sobre fruta banana',
      'deckofcards': 'sorteia uma carta',
      'tronalddump': 'frase do trump',
      'urban': 'o que quer dizer na giria glow up',
      'shibe': 'me mostra um shiba'
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
      case 'dictionary': {
        const parts = parsed.pathname.split('/');
        const word = decodeURIComponent(parts[parts.length - 1] || '');
        return word ? 'looking up "' + word + '"' : 'consulting dictionary';
      }
      case 'advice': return 'fetching a random advice';
      case 'trivia': return 'fetching a trivia question';
      case 'kanye': return 'fetching a Kanye quote';
      case 'poetry': return 'fetching a random poem';
      case 'datamuse': {
        const q = parsed.searchParams.get('rel_syn') || '';
        return q ? 'finding synonyms for "' + q + '"' : 'searching words';
      }
      case 'anime': {
        const q = parsed.searchParams.get('q') || '';
        return q ? 'searching anime "' + decodeURIComponent(q) + '"' : 'searching anime';
      }
      case 'starwars': {
        const q = parsed.searchParams.get('search') || '';
        return q ? 'searching Star Wars characters for "' + q + '"' : 'searching Star Wars';
      }
      case 'rickandmorty': {
        const q = parsed.searchParams.get('name') || '';
        return q ? 'searching Rick and Morty for "' + q + '"' : 'searching Rick and Morty';
      }
      case 'recipe': {
        if (parsed.searchParams.get('s')) return 'searching a recipe';
        return 'fetching a random recipe';
      }
      case 'github': {
        const parts = parsed.pathname.split('/');
        const user = parts[parts.length - 1] || '';
        return user ? 'checking GitHub profile "' + user + '"' : 'checking GitHub';
      }
      case 'randomuser': return 'generating a random person';
      case 'news': return 'fetching top tech news';
      case 'httppets': {
        const parts = parsed.pathname.split('/');
        const code = parts[1] || '';
        return code ? 'fetching HTTP status ' + code : 'fetching an HTTP status photo';
      }
      case 'animefacts': return 'fetching anime facts';
      case 'quran': return 'fetching a random Quran verse';
      case 'bible': return 'fetching a random bible verse';
      case 'fishwatch': return 'finding a marine species';
      case 'dogfacts': return 'fetching dog facts';
      case 'jsonplaceholder': {
        const parts = parsed.pathname.split('/');
        const id = parts[2] || '1';
        return 'fetching mock-rest post ' + id;
      }
      case 'countapi': return 'reading the visit counter';
      case 'fox': return 'fetching a random fox photo';
      case 'emoji': return 'fetching a random emoji';
      case 'fruityvice': {
        const parts = parsed.pathname.split('/');
        const f = decodeURIComponent(parts[parts.length - 1] || '');
        return f ? 'fetching nutrition info for "' + f + '"' : 'fetching nutrition info';
      }
      case 'deckofcards': return 'drawing a card from the deck';
      case 'tronalddump': return 'fetching a Trump quote';
      case 'urban': {
        const q = parsed.searchParams.get('term') || '';
        return q ? 'looking up slang "' + decodeURIComponent(q) + '"' : 'looking up a slang term';
      }
      case 'shibe': return 'fetching a random shiba photo';
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
