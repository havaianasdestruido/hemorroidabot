'use strict';
module.exports = {
  desc: 'conselhos aleatorios (AdviceSlip, keyless)',
  match: /(conselho|me aconselhe|advice|me de uma dica|sobrevivencia)/i,
  build: function(query, state) {
    return 'https://api.adviceslip.com/advice';
  },
  parse: function(data) {
    try {
      if (!data || !data.slip || !data.slip.advice) return 'Sem conselhos no momento.';
      return 'Conselho: ' + data.slip.advice;
    } catch (e) {
      return 'Sem conselhos no momento.';
    }
  }
};
