'use strict';
module.exports = {
  desc: 'emoji aleatorio (EmojiHub, keyless)',
  match: /(emoji aleatorio|manda um emoji|um emoji|emoji para)/i,
  build: function(query) {
    return 'https://emojihub.yurace.pro/api/random';
  },
  parse: function(data) {
    try {
      if (!data || !data.name || !data.htmlCode || !data.htmlCode.length) return 'Emoji nao encontrado.';
      var code = data.htmlCode.join('');
      var cat = data.category || 'desconhecida';
      return code + '\n' + data.name + ' (' + cat + ')';
    } catch (e) {
      return 'Emoji nao encontrado.';
    }
  }
};