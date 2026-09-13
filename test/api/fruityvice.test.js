'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/fruityvice');

const BANANA = {
  name: 'Banana',
  family: 'Musaceae',
  genus: 'Musa',
  order: 'Zingiberales',
  nutritions: { calories: 96, fat: 0.1, sugar: 17.2, carbohydrates: 22.8, protein: 1.1 }
};

describe('fruityvice tool', () => {
  test('match detects fruit queries', () => {
    assert.ok(tool.match.test('fruta banana'));
    assert.ok(tool.match.test('fruit apple'));
    assert.ok(tool.match.test('info da fruta mango'));
    assert.ok(tool.match.test('valor nutricional da uva'));
    assert.ok(tool.match.test('calorias da banana'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('livro'), false);
    assert.strictEqual(tool.match.test('numero'), false);
    assert.strictEqual(tool.match.test('receita'), false);
    assert.strictEqual(tool.match.test('moeda'), false);
    assert.strictEqual(tool.match.test('gato'), false);
  });

  test('build uses fruit name and encodes it', () => {
    const url = tool.build('fruta maçã');
    assert.ok(url.includes('fruityvice.com/api/fruit/'));
    assert.ok(url.includes('ma%C3%A7%C3%A3') || url.includes('ma%C3%A7a'));
  });

  test('build falls back to banana when no fruit', () => {
    const url = tool.build('fruta');
    assert.ok(url.includes('banana'));
  });

  test('parse full response', () => {
    const out = tool.parse(BANANA);
    const expected = 'Banana (Musaceae)\nCalorias: 96 kcal\nAcucar: 17.2 g\nCarboidratos: 22.8 g\nProteina: 1.1 g\nGordura: 0.1 g';
    assert.strictEqual(out, expected);
  });

  test('parse missing name falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Fruta nao encontrada.');
  });

  test('parse missing nutritions falls back gracefully', () => {
    assert.doesNotThrow(() => tool.parse({ name: 'Manga', family: 'Anacardiaceae' }));
    assert.ok(tool.parse({ name: 'Manga', family: 'Anacardiaceae' }).includes('Manga'));
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return BANANA; } };
    };
    try {
      const url = tool.build('calorias da banana');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Banana'));
      assert.ok(out.includes('Musaceae'));
      assert.ok(out.includes('96 kcal'));
      assert.ok(out.includes('17.2 g'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});