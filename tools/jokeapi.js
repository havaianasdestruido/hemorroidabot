module.exports = {
  desc: 'piada aleatoria (JokeAPI, pt)',
  match: /(piada|joke|ver um.*piada|conta.*piada|faz me rir|conta uma)/i,
  build: function() {
    return 'https://v2.jokeapi.dev/joke/Any?lang=pt&type=single';
  },
  parse: function(data) {
    try {
      if (!data || data.error) return 'Nao consegui uma piada.';
      if (data.type === 'twopart' && data.setup && data.delivery) {
        return data.setup + '\n' + data.delivery;
      }
      if (data.joke) return data.joke;
      return 'Nao consegui uma piada.';
    } catch (e) {
      return 'Nao consegui uma piada.';
    }
  }
};
