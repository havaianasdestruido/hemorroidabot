'use strict';
module.exports = {
  desc: 'versiculo aleatorio da biblia (Bible API, keyless)',
  match: /(versiculo|versiculo da biblia|biblia|salmo|palavra de deus)/i,
  build: function(query) {
    try {
      return 'https://bible-api.com/data/web/random';
    } catch (e) {
      return 'https://bible-api.com/data/web/random';
    }
  },
  parse: function(data) {
    try {
      if (!data || !data.random_verse) return 'Sem versiculo agora.';
      var v = data.random_verse;
      var text = (v.text || '').trim();
      var ref = (v.reference || '').trim();
      var trans = (v.translation_name || '');
      if (!text) return 'Sem versiculo agora.';
      return text + '\n— ' + ref + ' (' + trans + ')';
    } catch (e) {
      return 'Sem versiculo agora.';
    }
  }
};