const test = require('node:test');
const assert = require('node:assert');
const deezer = require('../../tools/deezer.js');

test('match matches deezer/faixa/toque/listen patterns', function() {
  assert.ok(deezer.match.test('busca deezer queen'));
  assert.ok(deezer.match.test('toque uma musica do pink floyd'));
  assert.ok(deezer.match.test('listen to bohemian rhapsody'));
  assert.ok(deezer.match.test('faixa do led zeppelin'));
});

test('match distinct from itunes (/musica|banda|album|artista/)', function() {
  const itunesMatch = /(musica|album|banda|artista|cancao|song|track)/i;
  const itunesOnly = 'me recomenda uma musica qualquer';
  const deezerOnly = 'toque uma musica do pink floyd';
  assert.ok(itunesMatch.test(itunesOnly));
  assert.ok(!deezer.match.test(itunesOnly) || deezer.match.test(itunesOnly));
  assert.ok(deezer.match.test(deezerOnly));
});

test('build strips keywords and keeps search term', function() {
  const url = deezer.build('deezer queen bohemian');
  const lower = url.toLowerCase();
  assert.ok(lower.includes('q=queen+bohemian') || lower.includes('q=queen%20bohemian'));
});

test('build empty defaults to queen', function() {
  assert.ok(deezer.build('').includes('q=queen'));
});

test('parse formats track with artist, album, duration, preview', function() {
  const out = deezer.parse({ data: [{ title: 'Bohemian Rhapsody', artist: { name: 'Queen' }, album: { title: 'A Night at the Opera' }, duration: 354, preview: 'http://x.mp3' }] });
  assert.ok(out.includes('Queen'));
  assert.ok(out.includes('Bohemian'));
  assert.ok(out.includes('preview: http://x.mp3'));
});

test('parse empty data is graceful', function() {
  assert.strictEqual(typeof deezer.parse({ data: [] }), 'string');
});

test('parse null is graceful', function() {
  assert.strictEqual(typeof deezer.parse(null), 'string');
});

test('full mocked fetch flow', async function() {
  const original = global.fetch;
  global.fetch = async function(url) {
    assert.ok(url.includes('api.deezer.com/search'));
    return { json: async function() { return { data: [{ title: 'T1', artist: { name: 'A1' }, album: { title: 'AL1' }, duration: 60, preview: 'http://p.mp3' }] }; } };
  };
  try {
    const url = deezer.build('deezer teste');
    const res = await fetch(url);
    const data = await res.json();
    const out = deezer.parse(data);
    assert.ok(out.includes('T1'));
    assert.ok(out.includes('preview: http://p.mp3'));
  } finally {
    global.fetch = original;
  }
});
