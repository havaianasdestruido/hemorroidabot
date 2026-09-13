'use strict';
module.exports = {
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
};