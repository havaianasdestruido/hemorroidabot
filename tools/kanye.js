'use strict';
module.exports = {
  desc: 'citacao de Kanye West (kanye.rest, keyless)',
  match: /(kanye|frase do kanye|cita.*kanye|inspira.*kanye)/i,
  build: function(query, state) {
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
};