'use strict';
module.exports = {
  desc: 'definicao de palavra em ingles (dictionaryapi.dev, keyless)',
  match: /(dicionario|definicao de|meaning of|significado de|define a palavra|o que significa a palavra)/i,
  build: function(query, state) {
    var q = (query || '').replace(/(dicionario|definicao de|meaning of|significado de|define a palavra|o que significa a palavra)/gi, '').replace(/[?.!]/g, '').trim();
    if (!q) q = 'hello';
    return 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(q);
  },
  parse: function(data) {
    try {
      if (!Array.isArray(data) || !data.length) return 'Palavra nao encontrada.';
      var entry = data[0];
      var word = entry.word || '?';
      var meaning = entry.meanings && entry.meanings[0];
      var def = meaning && meaning.definitions && meaning.definitions[0] && meaning.definitions[0].definition;
      if (!def) return 'Palavra nao encontrada.';
      var pos = (meaning && meaning.partOfSpeech) || '?';
      return '"' + word + '" (' + pos + '): ' + def;
    } catch (e) {
      return 'Palavra nao encontrada.';
    }
  }
};