module.exports = {
  desc: 'curiosidade sobre um numero (numbersapi)',
  match: /(numer\w*|number|fato.*numer\w*|curiosidade.*numer\w*|trivia|math fact)/i,
  build: function(query) {
    var m = query.match(/(\d+)/);
    var num = m ? m[1] : '42';
    return 'https://numbersapi.com/' + num + '?json';
  },
  parse: function(data) {
    try {
      if (data && typeof data.text === 'string' && data.text.length > 0) return data.text;
      return 'Nao foi possivel obter curiosidade sobre o numero.';
    } catch (e) {
      return 'Nao foi possivel obter curiosidade sobre o numero.';
    }
  }
};
