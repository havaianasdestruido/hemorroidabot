module.exports = {
  desc: 'imagem/foto aleatoria de cachorro (dog.ceo)',
  match: /(cachorro|dog|doguinho|c[aã]o|foto de.*(c[aã]o|dog)|imagem de.*(c[aã]o|dog))/i,
  build: function(query) { return 'https://dog.ceo/api/breeds/image/random'; },
  parse: function(data) {
    try {
      if (data && data.status === 'success' && data.message) {
        return 'Cachorro: ' + data.message;
      }
      return 'Nao foi possivel obter imagem de cachorro.';
    } catch (e) {
      return 'Nao foi possivel obter imagem de cachorro.';
    }
  }
};
