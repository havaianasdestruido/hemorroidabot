'use strict';
module.exports = {
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
};