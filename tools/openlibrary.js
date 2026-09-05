module.exports = {
  desc: 'busca de livros (Open Library)',
  match: /(livro|book|biblioteca|procura.*livro|busca.*livro|autor.*livro|title)/i,
  build: function(query) {
    var q = (query || '').replace(/\b(livros?|books?|buscar|procure|procura|me indica|busca|biblioteca|autor|title)\b/gi, '').replace(/\b(de|o|um|uma|do|da|dos|das)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (!q) q = 'hobbit';
    return 'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=3';
  },
  parse: function(data) {
    try {
      if (!data || !data.docs || !data.docs.length) return 'Nenhum livro encontrado.';
      var lines = [];
      for (var i = 0; i < data.docs.length && i < 3; i++) {
        var doc = data.docs[i];
        var title = doc.title || 'Sem titulo';
        var authors = (doc.author_name && doc.author_name.length) ? doc.author_name.join(', ') : 'Autor desconhecido';
        var year = doc.first_publish_year || 'N/D';
        var link = 'https://openlibrary.org' + (doc.key || '');
        lines.push(title + ' (' + authors + ', ' + year + ') | ' + link);
      }
      return lines.join('\n');
    } catch (e) {
      return 'Nenhum livro encontrado.';
    }
  }
};
