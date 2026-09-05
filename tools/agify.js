module.exports = {
  desc: 'adivinha idade pelo nome (agify)',
  match: /(idade do\s+\w+|quantos anos tem\s+\w+|age of\s+\w+|agify|idade.*nome|nome.*idade)/i,
  build: function(query) {
    var name = 'michael';
    var m = query.match(/(?:idade do|quantos anos tem|age of|do|tem|of|para|nome?)\s+([A-Za-zÀ-ÿ]+)/i);
    if (m && m[1]) name = m[1].toLowerCase();
    return 'https://api.agify.io/?name=' + encodeURIComponent(name);
  },
  parse: function(data) {
    try {
      if (!data || typeof data !== 'object' || data.age == null) {
        return 'Nao foi possivel prever a idade.';
      }
      return 'Idade media para "' + data.name + '": ' + data.age + ' anos (base de ' + data.count + ' pessoas).';
    } catch (e) {
      return 'Nao foi possivel prever a idade.';
    }
  }
};
