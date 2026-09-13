'use strict';
module.exports = {
  desc: 'informacoes nutricionais de frutas (Fruityvice, keyless)',
  match: /(fruta|fruit|info.*fruta|valor nutricional|calorias da)/i,
  build: function(query, state) {
    var q = (query || '').replace(/(fruta|fruit|info.*fruta|valor nutricional|calorias da|da fruta|de fruta)/gi, '').replace(/[?.!,:]/g, '').trim();
    if (!q) q = 'banana';
    return 'https://www.fruityvice.com/api/fruit/' + encodeURIComponent(q);
  },
  parse: function(data) {
    try {
      if (!data || !data.name) return 'Fruta nao encontrada.';
      var fam = data.family || '?';
      var n = data.nutritions || {};
      var num = function(v) { return v != null ? v : '?'; };
      return data.name + ' (' + fam + ')\nCalorias: ' + num(n.calories) + ' kcal\nAcucar: ' + num(n.sugar) + ' g\nCarboidratos: ' + num(n.carbohydrates) + ' g\nProteina: ' + num(n.protein) + ' g\nGordura: ' + num(n.fat) + ' g';
    } catch (e) {
      return 'Fruta nao encontrada.';
    }
  }
};