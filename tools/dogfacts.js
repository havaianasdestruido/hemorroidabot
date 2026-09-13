'use strict';
module.exports = {
  desc: 'fatos caninos curiosos (dog-api.kinduff.com, keyless)',
  match: /(fato canino|fatos caninos|curiosidade canina|fact canino|cachorrinho trivia)/i,
  build: function(query) {
    return 'https://dog-api.kinduff.com/api/facts?number=2';
  },
  parse: function(data) {
    try {
      if (!data || !data.facts || !data.facts.length) return 'Sem fatos agora.';
      var list = data.facts.slice(0, 2).map(function(f) { return '- ' + String(f); });
      return 'Fatos sobre caes:\n' + list.join('\n');
    } catch (e) {
      return 'Sem fatos agora.';
    }
  }
};