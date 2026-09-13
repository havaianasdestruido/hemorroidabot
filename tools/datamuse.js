'use strict';
module.exports = {
  desc: 'sinonimos, rimas e palavras parecidas (datamuse, keyless)',
  match: /(sinonimo de|sinonimos de|rima com|rhyme with|palavras parecidas)/i,
  build: function(query, state) {
    var q = (query || '').replace(/(sinonimo de|sinonimos de|rima com|rhyme with|palavras parecidas)/gi, '').replace(/[?.!]/g, '').trim();
    if (q) return 'https://api.datamuse.com/words?rel_syn=' + encodeURIComponent(q);
    return 'https://api.datamuse.com/words?rel_syn=' + encodeURIComponent('happy');
  },
  parse: function(data, word) {
    try {
      if (!data || !Array.isArray(data) || !data.length) return 'Nenhuma palavra encontrada.';
      var target = (word || '').trim() || 'the query';
      var words = data.slice(0, 5).map(function(item) { return item.word; });
      return 'Sinonimos de ' + target + ': ' + words.join(', ');
    } catch (e) {
      return 'Nenhuma palavra encontrada.';
    }
  }
};