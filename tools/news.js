'use strict';
module.exports = {
  desc: 'ultimas noticias tech do Hacker News (keyless)',
  match: /(hacker news|noticias.*tech|top stories|topstories|news ycombinator|hn algo)/i,
  build: function(query, state) {
    return 'https://hacker-news.firebaseio.com/v0/topstories.json';
  },
  parse: function(data) {
    try {
      if (!Array.isArray(data) || data.length === 0) return 'Sem noticias agora.';
      var ids = data.slice(0, 5);
      return ids.map(function(id) {
        return 'https://news.ycombinator.com/item?id=' + id;
      }).join('\n');
    } catch (e) {
      return 'Sem noticias agora.';
    }
  }
};