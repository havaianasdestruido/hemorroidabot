'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/anime');

describe('anime tool', () => {
  test('match detects anime queries', () => {
    assert.ok(tool.match.test('anime naruto'));
    assert.ok(tool.match.test('quero saber o manga de one piece'));
    assert.ok(tool.match.test('me fala do personagem anime goku'));
  });

  test('match does not collide with weather/music tools', () => {
    assert.ok(!tool.match.test('musica do artista'));
    assert.ok(!tool.match.test('filme do iron man'));
    assert.ok(!tool.match.test('serie da netflix'));
  });

  test('build extracts title and encodes URL', () => {
    const url = tool.build('anime fullmetal alchemist');
    assert.ok(url.includes('api.jikan.moe'));
    assert.ok(url.includes('q=fullmetal%20alchemist'));
    assert.ok(url.includes('limit=3'));
    assert.ok(url.includes('sfw=true'));
  });

  test('build falls back to one piece', () => {
    const url = tool.build('anime');
    assert.ok(url.includes('q=one%20piece'));
  });

  test('parse full response', () => {
    const out = tool.parse({
      data: [{
        mal_id: 1,
        title: 'One Piece',
        score: 8.5,
        episodes: 1100,
        status: 'Currently Airing',
        synopsis: 'Pirate Monkey D. Luffy sets out to find the legendary One Piece treasure and become the Pirate King.'
      }]
    });
    assert.ok(out.includes('Titulo'));
    assert.ok(out.includes('One Piece'));
    assert.ok(out.includes('Nota: 8.5/10'));
    assert.ok(out.includes('Episodios: 1100'));
    assert.ok(out.includes('Status: Currently Airing'));
    assert.ok(out.includes('Sinopse'));
  });

  test('parse truncates long synopsis', () => {
    const long = 'x'.repeat(500);
    const out = tool.parse({ data: [{ title: 'Naruto', score: 8, episodes: 220, status: 'Finished', synopsis: long }] });
    assert.ok(out.includes('Sinopse: ' + 'x'.repeat(120) + '...'));
  });

  test('parse missing data falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Anime nao encontrado.');
    assert.strictEqual(tool.parse({ data: [] }), 'Anime nao encontrado.');
  });

  test('parse throws fall back safely', () => {
    assert.strictEqual(tool.parse(null), 'Anime nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { data: [{ mal_id: 2, title: 'Naruto', score: 8, episodes: 220, status: 'Finished', synopsis: 'A ninja named Naruto dreams of becoming Hokage.' }] }; } };
    };
    try {
      const url = tool.build('anime naruto');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Naruto'));
      assert.ok(out.includes('Status: Finished'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});