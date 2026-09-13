'use strict';
module.exports = {
  desc: 'previsao do tempo detalhada (wttr.in, keyless)',
  match: /(wttr|previsao completa|clima completo|tempo agora em|weather json)/i,
  build: function(query, state) {
    var q = (query || '').replace(/(wttr|previsao completa|clima completo|tempo agora em|weather json|clima em|tempo em|previsao do tempo em)/gi, '').replace(/[?.!]/g, '').trim();
    if (q) return 'https://wttr.in/' + encodeURIComponent(q) + '?format=j1&lang=pt';
    var c = state.coords || { lat: 0, lon: 0 };
    return 'https://wttr.in/' + c.lat + ',' + c.lon + '?format=j1&lang=pt';
  },
  parse: function(data) {
    try {
      if (!data || !data.current_condition || !data.current_condition.length) return 'Sem dados de clima.';
      var c = data.current_condition[0];
      var desc = (c.weatherDesc && c.weatherDesc[0] && c.weatherDesc[0].value) || 'desconhecido';
      var temp = c.temp_C != null ? c.temp_C : '?';
      var feels = c.FeelsLikeC != null ? c.FeelsLikeC : '?';
      var hum = c.humidity != null ? c.humidity : '?';
      var wind = c.windspeedKmph != null ? c.windspeedKmph : '?';
      var area = '';
      if (data.nearest_area && data.nearest_area[0]) {
        var a = data.nearest_area[0];
        var name = (a.areaName && a.areaName[0] && a.areaName[0].value) || '';
        var country = (a.country && a.country[0] && a.country[0].value) || '';
        area = (name || '') + (country ? ', ' + country : '');
      }
      var head = area ? 'Clima em ' + area + ':\n' : '';
      return head + 'Atual: ' + desc + ', ' + temp + '°C (sensacao ' + feels + '°C)\nUmidade: ' + hum + '%\nVento: ' + wind + ' km/h';
    } catch (e) {
      return 'Erro ao processar clima.';
    }
  }
};
