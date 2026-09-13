'use strict';
module.exports = {
  desc: 'foto de shiba inu (shibe.online, keyless)',
  match: /(shiba|shibe)/i,
  build: function() {
    return 'https://shibe.online/api/shibes?count=1&urls=true';
  },
  parse: function(data) {
    try {
      if (!data || !Array.isArray(data) || !data.length) return 'Shiba nao encontrado.';
      return 'Shiba:\n' + data[0];
    } catch (e) {
      return 'Shiba nao encontrado.';
    }
  }
};