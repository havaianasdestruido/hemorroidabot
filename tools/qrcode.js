module.exports = {
  desc: 'gerador de QR code (goqr.me, keyless, retorna PNG; parse usa wrapper {url} - raw mode ainda nao suportado em brain.js)',
  match: /(qr\s*code|qrcode|gera.*qr|cria.*qr|fazer.*qr)/i,
  build: function(query) {
    var q = (query || '').replace(/qr\s*code|qrcode/gi, '').replace(/\b(gera(r)?|cria(r)?|fazer)\b/gi, '').replace(/^(de|do|da|para|com|with)\s+/i, '').trim();
    var data = q || 'https://github.com/havaianasdestruido/hemorroidabot';
    return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(data);
  },
  parse: function(data) {
    try {
      var url = (data && typeof data === 'object' && data.url) ? data.url : (typeof data === 'string' ? data : null);
      if (!url) return 'QR code indisponivel.';
      return '![QR](' + url + ')';
    } catch (e) {
      return 'QR code indisponivel.';
    }
  }
};
