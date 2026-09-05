module.exports = {
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
};
