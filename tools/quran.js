'use strict';
module.exports = {
  desc: 'versiculo aleatorio do Corao em arabe e portugues (AlQuran Cloud, keyless)',
  match: /(alcorao|alcorao|corao|surata|versiculo do corao)/i,
  build: function(query, state) {
    return 'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,pt-br';
  },
  parse: function(data) {
    try {
      if (!data || !data.data || !data.data.editions || !data.data.editions.length) return 'Sem versiculo do Corao agora.';
      var editions = data.data.editions;
      var ed = editions.filter(function(e) { return e.edition && e.edition.language === 'pt'; })[0];
      if (!ed) ed = editions[0];
      var surah = (ed.surah && ed.surah.number) || '?';
      var ayah = ed.numberInSurah != null ? ed.numberInSurah : '?';
      var id = (ed.edition && ed.edition.identifier) || 'desconhecido';
      return 'Surah ' + surah + ':' + ayah + ' (' + id + ')\n' + (ed.text || '');
    } catch (e) {
      return 'Sem versiculo do Corao agora.';
    }
  }
};