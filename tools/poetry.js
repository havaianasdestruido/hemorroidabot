'use strict';
module.exports = {
  desc: 'poema aleatorio do PoetryDB (keyless)',
  match: /(poema|poesia|poeta|verso|versos|uma poema)/i,
  build: function(query, state) {
    return 'https://poetrydb.org/random';
  },
  parse: function(data) {
    try {
      if (!data || !Array.isArray(data) || !data.length) return 'Nenhum poema encontrado.';
      var poem = data[0];
      var title = poem.title || 'Sem titulo';
      var author = poem.author || 'Desconhecido';
      var lines = Array.isArray(poem.lines) ? poem.lines.slice(0, 4) : [];
      var body = lines.join('\n');
      return title + '\n— ' + author + '\n\n' + body;
    } catch (e) {
      return 'Nenhum poema encontrado.';
    }
  }
};
