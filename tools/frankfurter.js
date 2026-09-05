module.exports = {
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
};
