'use strict';
module.exports = {
  desc: 'endpoint de teste mock-rest (JSONPlaceholder, keyless)',
  match: /(json placeholder|placeholder json|mock rest|dados fake|endpoint de teste|teste de api rest)/i,
  build: function(query, state) {
    try {
      var q = (query || '').trim();
      var m = q.match(/(\d+)/);
      var n = m ? m[1] : 1;
      return 'https://jsonplaceholder.typicode.com/posts/' + encodeURIComponent(n);
    } catch (e) {
      return 'https://jsonplaceholder.typicode.com/posts/1';
    }
  },
  parse: function(data) {
    try {
      if (!data || !data.id) return 'Post nao encontrado.';
      return 'Post ' + data.id + ':\n' + data.title + '\n\n' + data.body;
    } catch (e) {
      return 'Post nao encontrado.';
    }
  }
};