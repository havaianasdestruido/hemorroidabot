'use strict';
module.exports = {
  desc: 'compra/sorteia cartas de um baralho (deckofcardsapi, keyless)',
  match: /(baralho|cartas?|comprar carta|jogo de cartas|sorteia uma carta|tira uma carta)/i,
  build: function(query) {
    var n = 1;
    var q = query || '';
    var m = q.match(/(\d+)/);
    if (m) {
      var c = parseInt(m[1], 10);
      if (c >= 1 && c <= 5) n = c;
    }
    return 'https://deckofcardsapi.com/api/deck/new/draw/?count=' + n;
  },
  parse: function(data) {
    try {
      if (!data || !Array.isArray(data.cards) || !data.cards.length) return 'Carta nao encontrada.';
      var card = data.cards[0];
      var value = card.value || '?';
      var suit = card.suit || '?';
      var image = card.image || '?';
      var remaining = data.remaining != null ? data.remaining : '?';
      return 'Carta: ' + value + ' de ' + suit + '\nImagem: ' + image + '\nRestantes: ' + remaining;
    } catch (e) {
      return 'Carta nao encontrada.';
    }
  }
};