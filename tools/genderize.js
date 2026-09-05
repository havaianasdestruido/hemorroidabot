module.exports = {
  desc: 'adivinha genero pelo nome (genderize)',
  match: /(masculino|feminino|genero do\s+\w+|gender of\s+\w+|eh homem ou mulher|menino ou menina|genero.*nome)/i,
  build: function(query) {
    var match = query.match(/(?:do|de|of|para)\s+(?:nome\s+)?(\w+)/i);
    var name = match ? match[1] : 'emily';
    return 'https://api.genderize.io/?name=' + encodeURIComponent(name);
  },
  parse: function(data) {
    try {
      if (!data || !data.name) return 'Nao foi possivel determinar o genero.';
      var gender = data.gender;
      var genderPt = gender === 'female' ? 'feminino' : gender === 'male' ? 'masculino' : 'indeterminado';
      var prob = data.probability != null ? Math.round(data.probability * 100) : 0;
      var count = data.count || 0;
      if (gender === null || gender === undefined) {
        return 'O nome "' + data.name + '" tem genero indeterminado.';
      }
      return 'O nome "' + data.name + '" e provavelmente ' + genderPt + ' (confianca ' + prob + '%, base de ' + count + ').';
    } catch (e) {
      return 'Nao foi possivel determinar o genero.';
    }
  }
};
