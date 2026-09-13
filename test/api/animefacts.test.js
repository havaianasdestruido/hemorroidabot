'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/animefacts');

const API_URL = 'https://chandan-02.github.io/anime-facts-rest-api/fact.json';
const FACTS = {
  data: [
    { fact_id: 1, fact: 'Naruto villagers disliked him.', anime_name: 'Naruto' },
    { fact_id: 2, fact: 'Goku is a saiyan.', anime_name: 'Dragon Ball' }
  ]
};

describe('animefacts tool', () => {
  test('match detects fact queries', () => {
    assert.ok(tool.match.test('fato sobre anime naruto'));
    assert.ok(tool.match.test('fatos sobre anime'));
    assert.ok(tool.match.test('curiosidade do anime'));
    assert.ok(tool.match.test('animefacts'));
    assert.ok(tool.match.test('fato do anime one piece'));
  });

  test('match does not collide with anime tool', () => {
    assert.strictEqual(tool.match.test('anime naruto'), false);
    assert.strictEqual(tool.match.test('busca de anime one piece'), false);
    assert.strictEqual(tool.match.test('manga'), false);
  });

  test('build returns fixed URL and stores optional name in state', () => {
    const state = {};
    const url = tool.build('fato sobre anime naruto', state);
    assert.strictEqual(url, API_URL);
    assert.strictEqual(state.anime_name, 'naruto');
  });

  test('build with no name still returns fixed URL', () => {
    assert.strictEqual(tool.build('animefacts'), API_URL);
  });

  test('parse filters by anime name', () => {
    const out = tool.parse(FACTS, { anime_name: 'naruto' });
    assert.ok(out.includes('Naruto'));
    assert.ok(out.includes('Fato:'));
    assert.ok(out.includes('Naruto villagers disliked him.'));
  });

  test('parse without filter returns a random fact', () => {
    const out = tool.parse(FACTS);
    assert.ok(out.includes('Fato:'));
    assert.ok(out.includes('Naruto') || out.includes('Dragon Ball'));
    assert.ok(/^"[^"]+"\nFato: /.test(out));
  });

  test('parse fallback on empty data', () => {
    assert.strictEqual(tool.parse({}), 'Sem fatos sobre anime agora.');
    assert.strictEqual(tool.parse({ data: [] }), 'Sem fatos sobre anime agora.');
    assert.strictEqual(tool.parse(null), 'Sem fatos sobre anime agora.');
  });

  test('parse fallback when filter misses', () => {
    assert.strictEqual(tool.parse(FACTS, { anime_name: 'bleach' }), 'Sem fatos sobre anime agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return FACTS; } };
    };
    try {
      const state = {};
      const url = tool.build('fato sobre anime dragon ball', state);
      assert.ok(url.includes('chandan-02.github.io'));
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data, state);
      assert.ok(out.includes('Dragon Ball'));
      assert.ok(out.includes('Fato:'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});