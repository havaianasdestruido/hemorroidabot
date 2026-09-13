'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/advice');

describe('advice tool', () => {
  test('match detects advice queries', () => {
    assert.ok(tool.match.test('me da um conselho'));
    assert.ok(tool.match.test('me aconselhe'));
    assert.ok(tool.match.test('give me advice'));
    assert.ok(tool.match.test('me de uma dica'));
    assert.ok(tool.match.test('dicas de sobrevivencia'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('piada'), false);
    assert.strictEqual(tool.match.test('clima'), false);
    assert.strictEqual(tool.match.test('tempo'), false);
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('livro'), false);
    assert.strictEqual(tool.match.test('numero'), false);
    assert.strictEqual(tool.match.test('trivia'), false);
    assert.strictEqual(tool.match.test('moeda'), false);
    assert.strictEqual(tool.match.test('receita'), false);
  });

  test('build returns advice URL', () => {
    const url = tool.build('me da um conselho');
    assert.strictEqual(url, 'https://api.adviceslip.com/advice');
  });

  test('build ignores query and state', () => {
    const url = tool.build('any random query', { coords: { lat: 0, lon: 0 } });
    assert.strictEqual(url, 'https://api.adviceslip.com/advice');
  });

  test('parse success returns conselho', () => {
    const out = tool.parse({ slip: { id: 1, advice: 'Nao desista.' } });
    assert.strictEqual(out, 'Conselho: Nao desista.');
  });

  test('parse missing slip falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Sem conselhos no momento.');
  });

  test('parse missing advice falls back', () => {
    assert.doesNotThrow(() => tool.parse({ slip: {} }));
    assert.strictEqual(tool.parse({ slip: {} }), 'Sem conselhos no momento.');
  });

  test('parse null data falls back', () => {
    assert.strictEqual(tool.parse(null), 'Sem conselhos no momento.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { slip: { id: 42, advice: 'Confie em voce mesmo.' } }; } };
    };
    try {
      const url = tool.build('me aconselhe');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Conselho'));
      assert.ok(out.includes('Confie em voce mesmo.'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
