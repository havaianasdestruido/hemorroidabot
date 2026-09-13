'use strict';
module.exports = {
  desc: 'fato/curiosidade sobre anime (AnimeFacts, keyless)',
  match: /(fato sobre anime|fatos sobre anime|curiosidade do anime|animefacts|fato do anime)/i,
  build: function(query, state) {
    var q = (query || '').replace(/(fato sobre anime|fatos sobre anime|curiosidade do anime|animefacts|fato do anime)/gi, '').replace(/[?.!,;:]/g, '').trim();
    if (state && q) state.anime_name = q;
    return 'https://chandan-02.github.io/anime-facts-rest-api/fact.json';
  },
  parse: function(data, state) {
    try {
      var list = (data && Array.isArray(data.data)) ? data.data : [];
      if (!list.length) return 'Sem fatos sobre anime agora.';
      var word = '';
      if (typeof state === 'string') word = state;
      else if (state && typeof state === 'object') word = state.anime_name || (state.animefacts && state.animefacts.name) || '';
      if (word) {
        var w = String(word).toLowerCase();
        list = list.filter(function(f) {
          return f && f.anime_name && String(f.anime_name).toLowerCase().indexOf(w) !== -1;
        });
        if (!list.length) return 'Sem fatos sobre anime agora.';
      }
      var f = list[Math.floor(Math.random() * list.length)];
      return '"' + (f.anime_name || 'Desconhecido') + '"\nFato: ' + (f.fact || '');
    } catch (e) {
      return 'Sem fatos sobre anime agora.';
    }
  }
};