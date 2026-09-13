'use strict';
module.exports = {
  desc: 'informacao sobre especies marinhas (FishWatch, keyless)',
  match: /(peixe|fish|especie marinha|frutos do mar|info.*peixe)/i,
  build: function(query, state) {
    return 'https://www.fishwatch.gov/api/species';
  },
  parse: function(data) {
    try {
      if (!Array.isArray(data) || data.length === 0) return 'Peixe nao encontrado.';
      var s = data[Math.floor(Math.random() * data.length)];
      var name = (s && s.name) || 'Desconhecido';
      var sci = (s && s.scientific_name) || 'Desconhecido';
      var reg = (s && s.harvest_type) || 'Desconhecido';
      var hab = (s && s.habitat) || 'Desconhecido';
      if (hab.length > 80) hab = hab.slice(0, 80);
      var img = 'Indisponivel';
      if (s && Array.isArray(s.image_gallery) && s.image_gallery.length && s.image_gallery[0] && s.image_gallery[0].src) {
        img = s.image_gallery[0].src;
      }
      return 'Nome: ' + name + '\nNome cientifico: ' + sci + '\nRegiao: ' + reg + '\nHabitat: ' + hab + '\nImagem: ' + img;
    } catch (e) {
      return 'Erro ao processar especie.';
    }
  }
};