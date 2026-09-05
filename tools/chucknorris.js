module.exports = {
  desc: 'piada/fato do Chuck Norris (chucknorris)',
  match: /(chuck|norris|chuck norris|fato.*chuck)/i,
  build: function (query) {
    var m = query.match(/(?:sobre|about|search)\s+(.+)/i);
    if (m && m[1] && m[1].trim().length > 0) {
      return 'https://api.chucknorris.io/jokes/search?query=' + encodeURIComponent(m[1].trim());
    }
    return 'https://api.chucknorris.io/jokes/random';
  },
  parse: function (data) {
    if (!data) return 'Chuck Norris facts unavailable.';
    if (data.value && typeof data.value === 'string') return data.value;
    if (data.result && Array.isArray(data.result) && data.result.length > 0) {
      return data.result[0].value;
    }
    return 'Chuck Norris facts unavailable.';
  }
};
