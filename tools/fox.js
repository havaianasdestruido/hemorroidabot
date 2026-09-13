'use strict';
module.exports = {
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
};