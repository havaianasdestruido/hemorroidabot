'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/kanye');

describe('kanye tool', () => {
  test('match detects kanye queries', () => {
    assert.ok(tool.match.test('kanye'));
    assert.ok(tool.match.test('frase do kanye'));
    assert.ok(tool.match.test('cita algo do kanye'));
    assert.ok(tool.match.test('inspira frases do kanye'));
  });

  test('match does not collide with generic words', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('frase do dia'), false);
  });

  test('build returns kanye.rest URL', () => {
    const url = tool.build('frase do kanye');
    assert.strictEqual(url, 'https://api.kanye.rest/');
    assert.doesNotThrow(() => tool.build());
  });

  test('parse returns quote', () => {
    const out = tool.parse({ quote: 'I am the best.' });
    assert.ok(out.includes('Kanye:'));
    assert.ok(out.includes('I am the best.'));
  });

  test('parse missing quote falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Sem citacao de Kanye agora.');
    assert.strictEqual(tool.parse(null), 'Sem citacao de Kanye agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { quote: 'Belief is the ultimate superpower.' }; } };
    };
    try {
      const url = tool.build('cita algo do kanye');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Kanye:'));
      assert.ok(out.includes('Belief'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});