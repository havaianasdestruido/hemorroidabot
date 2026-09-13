'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/datamuse');

describe('datamuse tool', () => {
  test('match detects synonym/rhyme queries', () => {
    assert.ok(tool.match.test('sinonimo de feliz'));
    assert.ok(tool.match.test('sinonimos de casa'));
    assert.ok(tool.match.test('rima com amor'));
    assert.ok(tool.match.test('rhyme with love'));
    assert.ok(tool.match.test('palavras parecidas com pedra'));
  });

  test('match does not collide with generic words', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('previsao do tempo'), false);
    assert.strictEqual(tool.match.test('feliz e rima'), false);
  });

  test('build uses target word', () => {
    const url = tool.build('sinonimos de sol');
    assert.ok(url.includes('api.datamuse.com'));
    assert.ok(url.includes('rel_syn=sol'));
  });

  test('build URL encodes word', () => {
    const url = tool.build('sinonimo de sao paulo');
    assert.ok(url.includes('rel_syn=sao%20paulo') || url.includes('rel_syn=Sao%20paulo'));
  });

  test('build falls back to happy', () => {
    const url = tool.build('');
    assert.ok(url.includes('rel_syn=happy'));
  });

  test('parse full response returns up to 5 synonyms', () => {
    const out = tool.parse([
      { word: 'alegre', score: 1000 },
      { word: 'contente', score: 900 },
      { word: 'feliz', score: 800 },
      { word: 'satisfeito', score: 700 },
      { word: 'radiante', score: 600 },
      { word: 'animado', score: 500 }
    ], 'feliz');
    assert.strictEqual(out, 'Sinonimos de feliz: alegre, contente, feliz, satisfeito, radiante');
  });

  test('parse empty array falls back', () => {
    assert.doesNotThrow(() => tool.parse([]));
    assert.strictEqual(tool.parse([]), 'Nenhuma palavra encontrada.');
  });

  test('parse non-array falls back', () => {
    assert.strictEqual(tool.parse({}), 'Nenhuma palavra encontrada.');
    assert.strictEqual(tool.parse(null), 'Nenhuma palavra encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return [{ word: 'alegre', score: 1000 }, { word: 'contente', score: 900 }]; } };
    };
    try {
      const url = tool.build('sinonimo de feliz');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data, 'feliz');
      assert.strictEqual(out, 'Sinonimos de feliz: alegre, contente');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});