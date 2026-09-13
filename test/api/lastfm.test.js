const test = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/lastfm');

test('match: hits', () => {
  assert.ok(tool.match.test('qual meu ultimo scrobble do ultimatequack'));
  assert.ok(tool.match.test('ultima musica ouvida do joao'));
  assert.ok(tool.match.test('last scrobble de maria'));
  assert.ok(tool.match.test('scrobble do user pedro'));
  assert.ok(tool.match.test('ultimo listen'));
});

test('match: misses', () => {
  assert.ok(!tool.match.test('ultima piada'));
  assert.ok(!tool.match.test('ultimo pais'));
});

test('build: extracts user', () => {
  const u = tool.build('ultimo scrobble do ultimatequack');
  assert.ok(u.includes('user/ultimatequack/listens?count=1'));
});

test('build: default user', () => {
  const u = tool.build('ultimo scrobble');
  assert.ok(u.includes('user/rj/listens?count=1') || /\/user\/[^/]+\/listens/.test(u));
});

test('parse: full listen', () => {
  const out = tool.parse({ payload: { listens: [{ played_at: 1700000000, track_metadata: { artist_name: 'Artist', track_name: 'Track', release_name: 'Album' } }] } });
  assert.ok(out.includes('Track'));
  assert.ok(out.includes('Artist'));
  assert.ok(/2023-11-14 22:13/.test(out));
});

test('parse: empty listens', () => {
  assert.doesNotThrow(() => tool.parse({ payload: { listens: [] } }));
  assert.strictEqual(tool.parse({ payload: { listens: [] } }), 'Nenhum scrobble encontrado para esse usuario.');
});

test('parse: null/missing', () => {
  assert.doesNotThrow(() => tool.parse(null));
  assert.doesNotThrow(() => tool.parse({}));
  assert.doesNotThrow(() => tool.parse({ payload: {} }));
  assert.strictEqual(tool.parse(null), 'Nenhum scrobble encontrado para esse usuario.');
  assert.strictEqual(tool.parse({}), 'Nenhum scrobble encontrado para esse usuario.');
});

test('end-to-end: mocked fetch', async () => {
  const fakePayload = { payload: { listens: [{ played_at: 1700000000, track_metadata: { artist_name: 'Run The Jewels', track_name: 'Legend Has It', release_name: 'RTJ3' } }] } };
  const original = global.fetch;
  let captured = null;
  global.fetch = async (url) => { captured = url; return { json: async () => fakePayload }; };
  try {
    const url = tool.build('ultimo scrobble do ultimatequack');
    const r = await fetch(url);
    const data = await r.json();
    assert.strictEqual(captured, 'https://api.listenbrainz.org/1/user/ultimatequack/listens?count=1');
    const out = tool.parse(data);
    assert.ok(out.includes('Legend Has It'));
    assert.ok(out.includes('Run The Jewels'));
  } finally {
    global.fetch = original;
  }
});
