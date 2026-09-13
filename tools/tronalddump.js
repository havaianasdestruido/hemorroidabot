'use strict';
module.exports = {
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
};