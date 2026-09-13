'use strict';
module.exports = {
  desc: 'personagem de Star Wars (SWAPI, keyless)',
  match: /(star wars|jedi|sith|luke skywalker|darth vader|yoda|personagem de star wars)/i,
  build: function(query, state) {
    try {
      var m = (query || '').match(/(star wars|jedi|sith|luke skywalker|darth vader|yoda|personagem de star wars)/i);
      var rest = (query || '').replace(m ? m[1] : '', '').replace(/[?.!,]/g, '').trim();
      var name = rest || 'luke';
      return 'https://swapi.dev/api/people/?search=' + encodeURIComponent(name);
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
};