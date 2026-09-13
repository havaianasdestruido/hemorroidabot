'use strict';
module.exports = {
  desc: 'pergunta de trivia / quiz aleatorio (Open Trivia DB, keyless)',
  match: /(quiz|trivia|pergunta de teste|teste de conhecimento|conhecimento geral)/i,
  build: function(query, state) {
    return 'https://opentdb.com/api.php?amount=1&type=multiple';
  },
  parse: function(data) {
    try {
      if (!data || !data.results || !data.results.length) return 'Sem perguntas agora.';
      var r = data.results[0];
      var q = r.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
      var a = r.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
      var cat = r.category || 'Geral';
      return 'Pergunta (' + cat + '):\n' + q + '\nResposta: ' + a;
    } catch (e) {
      return 'Sem perguntas agora.';
    }
  }
};
