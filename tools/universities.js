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

module.exports = {
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
    return 'https://universities.hipolabs.com/search?country=' + encodeURIComponent(country);
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
};
