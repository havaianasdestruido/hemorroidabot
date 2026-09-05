module.exports = {
  desc: 'busca de musica/faixa (Deezer)',
  match: /(deezer|faixa|ouve.*(musica|song|track)|toque.*(musica|song)|listen to|play.*song|track.*deezer|cancao.*busca)/i,
  build: function(query) {
    const q = (query || '').replace(/deezer|faixa|ouve|toque|listen to|play|musica|song|track|busca|cancao|buscar/gi, '').trim() || 'queen';
    return 'https://api.deezer.com/search?q=' + encodeURIComponent(q) + '&limit=3';
  },
  parse: function(data) {
    try {
      if (!data || !data.data || !data.data.length) return 'Nenhuma faixa encontrada.';
      return data.data.map(function(item) {
        return item.title + ' - ' + (item.artist && item.artist.name) + ' (' + (item.album && item.album.title) + ', ' + item.duration + 's)\npreview: ' + item.preview;
      }).join('\n');
    } catch (e) {
      return 'Nenhuma faixa encontrada.';
    }
  }
};
