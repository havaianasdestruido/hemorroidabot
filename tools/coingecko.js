module.exports = {
  desc: 'preco de cripto (CoinGecko, keyless)',
  match: /(preco.*(btc|bitcoin|eth|ethereum|doge|dogecoin|ltc|litecoin|cardano|ada|solana|sol|xrp|ripple|bnb|tether|usdt|cripto|crypto|moeda digital)|valor.*(btc|bitcoin|eth|ethereum)|cotaca[cço].*(btc|bitcoin|eth|ethereum)|cripto.*hoje|crypto.*price|quanto.*(ta|esta|custa|vale).*(btc|bitcoin|eth|ethereum|doge|dogecoin|ltc|litecoin|cardano|ada|solana|sol|xrp|ripple|bnb|tether|usdt|cripto|crypto))/i,
  build: function(query) {
    var map = {
      bitcoin:'bitcoin',btc:'bitcoin',ethereum:'ethereum',eth:'ethereum',
      doge:'dogecoin',dogecoin:'dogecoin',litecoin:'litecoin',ltc:'litecoin',
      cardano:'cardano',ada:'cardano',solana:'solana',sol:'solana',
      ripple:'ripple',xrp:'ripple',bnb:'binancecoin',
      tether:'tether',usdt:'tether'
    };
    var cMap = { usd:'usd', dolar:'usd', brl:'brl', real:'brl', eur:'eur', euro:'eur', gbp:'gbp', libra:'gbp', jpy:'jpy' };
    var q = (query || '').toLowerCase();
    var coin = 'bitcoin';
    var curr = 'brl';
    var tokens = q.split(/[\s,;]+/);
    for (var i = 0; i < tokens.length; i++) {
      if (map[tokens[i]]) { coin = map[tokens[i]]; break; }
    }
    for (var j = 0; j < tokens.length; j++) {
      if (cMap[tokens[j]]) { curr = cMap[tokens[j]]; break; }
    }
    return 'https://api.coingecko.com/api/v3/simple/price?ids=' + coin + '&vs_currencies=' + curr;
  },
  parse: function(data) {
    try {
      if (!data || typeof data !== 'object') return 'Sem dados.';
      var keys = Object.keys(data);
      if (keys.length === 0) return 'Moeda nao encontrada.';
      var obj = data[keys[0]];
      if (!obj || typeof obj !== 'object') return 'Sem dados.';
      var innerKeys = Object.keys(obj);
      if (innerKeys.length === 0) return 'Sem cotacao.';
      var parts = [];
      for (var i = 0; i < innerKeys.length; i++) {
        var k = innerKeys[i];
        var v = obj[k];
        parts.push('1 ' + keys[0] + ' = ' + v + ' ' + k.toUpperCase());
      }
      return parts.join(' | ');
    } catch (e) {
      return 'Erro ao processar cotacao.';
    }
  }
};
