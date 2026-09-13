'use strict';
module.exports = {
  desc: 'pessoa aleatoria (RandomUser, keyless)',
  match: /(pessoa aleatoria|random user|usuario aleatorio|gera uma pessoa|pessoa ficticia)/i,
  build: function(query, state) {
    return 'https://randomuser.me/api/?nat=br';
  },
  parse: function(data) {
    try {
      if (!data || !data.results || !data.results.length) return 'Pessoa nao encontrada.';
      var p = data.results[0];
      var name = (p.name && p.name.first) + ' ' + (p.name && p.name.last);
      var email = p.email || '?';
      var phone = p.phone || '?';
      var loc = '';
      if (p.location && p.location.city) {
        loc = p.location.city + (p.location.country ? ', ' + p.location.country : '');
      }
      var thumb = (p.picture && p.picture.thumbnail) || '';
      var line = 'Nome: ' + name + '\nEmail: ' + email + '\nTelefone: ' + phone;
      if (loc) line += '\nLocalizacao: ' + loc;
      if (thumb) line += '\nFoto: ' + thumb;
      return line;
    } catch (e) {
      return 'Pessoa nao encontrada.';
    }
  }
};