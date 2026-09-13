'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/tronalddump');

describe('tronalddump tool', () => {
  test('match detects trump quote queries', () => {
    assert.ok(tool.match.test('tronald dump'));
    assert.ok(tool.match.test('tronald'));
    assert.ok(tool.match.test('trump'));
    assert.ok(tool.match.test('donald trump'));
    assert.ok(tool.match.test('fato do trump'));
    assert.ok(tool.match.test('frase do trump'));
  });

  test('match does not collide with generic words', () => {
    assert.strictEqual(tool.match.test('piada'), false);
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('livro'), false);
  });

  test('build returns fixed URL', () => {
    const url = tool.build('frase do trump');
    assert.strictEqual(url, 'https://api.tronalddump.io/random/quote');
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build());
    assert.doesNotThrow(() => tool.build(null));
  });

  test('parse full response', () => {
    const out = tool.parse({ value: 'I have a very good brain.' });
    assert.strictEqual(out, 'Tronald Dump: "I have a very good brain."');
  });

  test('parse missing value falls back', () => {
    assert.strictEqual(tool.parse({}), 'Sem citacao do trump agora.');
    assert.strictEqual(tool.parse(null), 'Sem citacao do trump agora.');
    assert.doesNotThrow(() => tool.parse(undefined));
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { value: 'I have a very good brain.' }; } };
    };
    try {
      const url = tool.build('frase do trump');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Tronald Dump'));
      assert.ok(out.includes('I have a very good brain.'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});