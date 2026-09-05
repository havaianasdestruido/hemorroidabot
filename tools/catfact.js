module.exports = {
  desc: 'curiosidade/fato sobre gatos (catfact)',
  match: /(gato|cat|gatinho|bichano|felino|fato.*gato|curiosidade.*gato)/i,
  build: function(query) { return 'https://catfact.ninja/fact'; },
  parse: function(data) {
    try {
      if (data && data.fact) return data.fact;
      return 'Nao foi possivel obter fato sobre gatos.';
    } catch (e) {
      return 'Nao foi possivel obter fato sobre gatos.';
    }
  }
};
