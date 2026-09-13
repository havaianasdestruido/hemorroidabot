'use strict';
module.exports = {
  desc: 'receitas aleatorias ou por nome (TheMealDB, keyless)',
  match: /(receita|receita de|cozinh|culinaria|recipe)/i,
  build: function(query, state) {
    try {
      var q = (query || '').replace(/(receita de|receita)/gi, '').replace(/[?.!]/g, '').trim();
      if (q) return 'https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q);
      return 'https://www.themealdb.com/api/json/v1/1/random.php';
    } catch (e) {
      return 'https://www.themealdb.com/api/json/v1/1/random.php';
    }
  },
  parse: function(data) {
    try {
      if (!data || !data.meals || !data.meals.length) return 'Receita nao encontrada.';
      var m = data.meals[0];
      var name = m.strMeal || 'sem nome';
      var cat = m.strCategory || 'desconhecida';
      var thumb = m.strMealThumb || '';
      var instr = (m.strInstructions || '').replace(/\s+/g, ' ').trim();
      var res = name + ' (' + cat + ')\n';
      if (thumb) res += thumb + '\n';
      if (instr) res += instr.slice(0, 120) + (instr.length > 120 ? '...' : '');
      return res;
    } catch (e) {
      return 'Receita nao encontrada.';
    }
  }
};