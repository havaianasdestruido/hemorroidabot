'use strict';
module.exports = {
  desc: 'significado de giria (Urban Dictionary, keyless)',
  match: /(giria|giria de|urban dictionary|slang|o que quer dizer na giria|termo da internet)/i,
  build: function(query) {
    try {
      var q = (query || '').replace(/(giria de|giria|urban dictionary de|urban dictionary|slang de|slang|o que quer dizer na giria|termo da internet)/gi, '').replace(/[?.!]/g, '').trim();
      if (!q) q = 'lol';
      return 'https://api.urbandictionary.com/v0/define?term=' + encodeURIComponent(q);
    } catch (e) {
      return 'https://api.urbandictionary.com/v0/define?term=lol';
    }
  },
  parse: function(data) {
    try {
      if (!data || !data.list || !data.list.length) return 'Giria nao encontrada.';
      var item = data.list[0];
      var word = item.word != null ? item.word : '?';
      var def = (item.definition || '').replace(/\s+/g, ' ').trim();
      if (!def) return 'Giria nao encontrada.';
      if (def.length > 140) def = def.slice(0, 140) + '...';
      var ex = (item.example || '').replace(/\s+/g, ' ').trim();
      if (ex.length > 80) ex = ex.slice(0, 80) + '...';
      var out = 'Giria: ' + word + '\n' + def;
      if (ex) out += '\nexemplo: ' + ex;
      return out;
    } catch (e) {
      return 'Giria nao encontrada.';
    }
  }
};