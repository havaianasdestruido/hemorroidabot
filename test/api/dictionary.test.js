'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/dictionary');

describe('dictionary tool', () => {
  test('match detects dictionary queries', () => {
    assert.ok(tool.match.test('dicionario de serendipity'));
    assert.ok(tool.match.test('definicao de lovely'));
    assert.ok(tool.match.test('meaning of apple'));
    assert.ok(tool.match.test('significado de water'));
    assert.ok(tool.match.test('define a palavra run'));
    assert.ok(tool.match.test('o que significa a palavra book'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('significa qualquer coisa'), false);
    assert.strictEqual(tool.match.test('toca a musica'), false);
    assert.strictEqual(tool.match.test('conta uma piada'), false);
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('numero da sorte'), false);
    assert.strictEqual(tool.match.test('me indica um livro'), false);
  });

  test('build uses word', () => {
    const url = tool.build('significado de hello world');
    assert.ok(url.includes('api.dictionaryapi.dev'));
    assert.ok(url.includes('/entries/en/'));
    assert.ok(url.includes('hello%20world') || url.includes('hello'));
  });

  test('build falls back to hello without word', () => {
    const url = tool.build('dicionario');
    assert.ok(url.endsWith('/entries/en/hello'));
  });

  test('parse full response', () => {
    const out = tool.parse([{
      word: 'apple',
      meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'a round fruit' }] }]
    }]);
    assert.strictEqual(out, '"apple" (noun): a round fruit');
  });

  test('parse returns not found for bad data', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Palavra nao encontrada.');
    assert.strictEqual(tool.parse([]), 'Palavra nao encontrada.');
    assert.strictEqual(tool.parse([{ word: 'x' }]), 'Palavra nao encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return [{ word: 'water', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'a clear liquid' }] }] }]; } };
    };
    try {
      const url = tool.build('meaning of water');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.strictEqual(out, '"water" (noun): a clear liquid');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});