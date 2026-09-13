module.exports = {
  desc: 'ultimo scrobble/musica ouvida (ListenBrainz, keyless)',
  match: /(ultimo scrobble|ultima scrobble|ultimo listen|ultima musica ouvida|ultima tocada|last scrobble|last listen|scrobble do|scrobble de)/i,
  build: function(query) {
    var m = query.match(/(?:do|de|of|user|usuario)\s+(\w+)/i);
    var user = (m && m[1]) ? m[1].toLowerCase() : 'rj';
    return 'https://api.listenbrainz.org/1/user/' + encodeURIComponent(user) + '/listens?count=1';
  },
  parse: function(data) {
    if (!data || !data.payload || !Array.isArray(data.payload.listens) || data.payload.listens.length === 0) {
      return 'Nenhum scrobble encontrado para esse usuario.';
    }
    var l = data.payload.listens[0];
    var t = l.track_metadata || {};
    var played = l.played_at ? new Date(l.played_at * 1000).toISOString().slice(0, 16).replace('T', ' ') : 'data desconhecida';
    return 'Ultimo scrobble: "' + (t.track_name || '?') + '" por ' + (t.artist_name || '?') + ' (' + (t.release_name || 'sem album') + ', ' + played + ' UTC)';
  }
};
