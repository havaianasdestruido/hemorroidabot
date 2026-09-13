'use strict';
module.exports = {
  desc: 'foto de cachorro/gatinho para codigo de status HTTP (http.dog, keyless, JSON)',
  match: /(http dog|status code do http|http cat|status code do|status code de|qual o status|status dog|status cat|foto do status|ctrl alt del status)/i,
  build: function(query) {
    var q = query || '';
    if (/\/infty\b/i.test(q)) return 'https://http.dog/599.json';
    if (/\/(?:dunder|mifflin)\b/i.test(q)) return 'https://http.dog/200.json';
    var m = q.match(/\b([1-5]\d{2})\b/);
    var code = m ? m[1] : 200;
    return 'https://http.dog/' + code + '.json';
  },
  parse: function(data) {
    try {
      var out = '';
      var code = (data && data.status_code != null) ? data.status_code : null;
      var title = (data && data.title) ? data.title : '';
      var image = (data && data.image) ? data.image : '';
      if (code != null) out += 'HTTP ' + code;
      if (title) out += (out ? ' – ' : '') + title;
      if (image) out += (out ? '\nFoto: ' : 'Foto: ') + image;
      if (out) return out;
      return 'Status HTTP indisponivel no momento.';
    } catch (e) {
      return 'Status HTTP indisponivel no momento.';
    }
  }
};