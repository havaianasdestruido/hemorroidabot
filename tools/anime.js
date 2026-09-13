'use strict';
module.exports = {
  desc: 'busca de anime/manga no Jikan (MyAnimeList, keyless)',
  match: /(anime|manga|personagem anime)/i,
  build: function(query, state) {
    var q = (query || '').replace(/(anime|manga|personagem)/gi, '').replace(/[?.!]/g, '').trim();
    if (!q) q = 'one piece';
    return 'https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(q) + '&limit=3&sfw=true';
  },
  parse: function(data) {
    try {
      if (!data || !data.data || !data.data[0]) return 'Anime nao encontrado.';
      var a = data.data[0];
      var title = a.title || 'Desconhecido';
      var score = a.score != null ? a.score : '?';
      var episodes = a.episodes != null ? a.episodes : '?';
      var status = a.status || 'desconhecido';
      var synopsis = a.synopsis || '';
      if (synopsis.length > 120) synopsis = synopsis.slice(0, 120) + '...';
      return 'Titulo: ' + title + '\nNota: ' + score + '/10\nEpisodios: ' + episodes + '\nStatus: ' + status + '\nSinopse: ' + synopsis;
    } catch (e) {
      return 'Anime nao encontrado.';
    }
  }
};