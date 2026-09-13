'use strict';
module.exports = {
  desc: 'perfil publico do github (keyless)',
  match: /(github|perfil no github|usuario do github|github do)/i,
  build: function(query, state) {
    var q = (query || '')
      .replace(/(github|perfil no github|usuario do github|github do|perfil de|usuario de|do |de )/gi, '')
      .replace(/[?.!]/g, '')
      .trim();
    if (!q) q = 'torvalds';
    return 'https://api.github.com/users/' + encodeURIComponent(q);
  },
  parse: function(data) {
    try {
      if (!data || !data.login) return 'Usuario nao encontrado.';
      var nome = data.name || data.login;
      var bio = data.bio || 'sem bio';
      var repos = data.public_repos != null ? data.public_repos : '?';
      var followers = data.followers != null ? data.followers : '?';
      return nome + ' — ' + bio + '\nRepos publicos: ' + repos + '\nSeguidores: ' + followers + '\nLink: ' + (data.html_url || '');
    } catch (e) {
      return 'Usuario nao encontrado.';
    }
  }
};
