module.exports = {
  desc: 'sugestao de atividade/coisa pra fazer (boredapi)',
  match: /(entediado|bored|sugere|sugestao|algo para fazer|o que eu posso fazer|atividade|passa tempo)/i,
  build: function() {
    return 'https://www.boredapi.com/api/activity';
  },
  parse: function(data) {
    try {
      if (!data || typeof data !== 'object') {
        return 'Atividade indisponível no momento. Tente novamente.';
      }
      var activity = data.activity || 'Atividade desconhecida';
      var type = data.type || 'desconhecido';
      var participants = data.participants != null ? String(data.participants) : '?';
      var price = data.price != null ? data.price : null;
      var priceStr;
      if (price === null) {
        priceStr = 'Preço desconhecido';
      } else if (price === 0) {
        priceStr = 'Grátis';
      } else {
        priceStr = price + '/5';
      }
      return activity + '\nTipo: ' + type + '\nParticipantes: ' + participants + '\nPreço: ' + priceStr;
    } catch (e) {
      return 'Erro ao processar atividade.';
    }
  }
};
