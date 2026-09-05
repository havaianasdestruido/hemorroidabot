module.exports = {
  desc: 'info de IP / geolocalizacao (ipapi.co)',
  match: /(meu ip|ip publico|meu ip e|what is my ip|ip address|geolocaliza(c..o|cao)|localiza.c?ao.*ip)/i,
  build: function(query) {
    var m = query.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    if (m) return 'https://ipapi.co/' + m[1] + '/json/';
    return 'https://ipapi.co/json/';
  },
  parse: function(data) {
    if (!data || typeof data !== 'object') return 'Dados indisponiveis.';
    var ip = data.ip || '-';
    var city = data.city || '-';
    var region = data.region || '-';
    var country = data.country_name || '-';
    var lat = data.latitude != null ? data.latitude : '-';
    var lon = data.longitude != null ? data.longitude : '-';
    var tz = data.timezone || '-';
    return 'IP: ' + ip + '\n' +
      'Cidade: ' + city + '\n' +
      'Regiao: ' + region + '\n' +
      'Pais: ' + country + '\n' +
      'Lat/Lon: ' + lat + ', ' + lon + '\n' +
      'Fuso horario: ' + tz;
  }
};
