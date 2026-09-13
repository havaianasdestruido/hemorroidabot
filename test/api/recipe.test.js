'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/recipe');

describe('recipe tool', () => {
  test('match detects recipe queries', () => {
    assert.ok(tool.match.test('receita de bolo'));
    assert.ok(tool.match.test('receita'));
    assert.ok(tool.match.test('como cozinhar arroz'));
    assert.ok(tool.match.test('culinaria italiana'));
    assert.ok(tool.match.test('chicken recipe'));
  });

  test('match does not collide with out-of-scope queries', () => {
    assert.strictEqual(tool.match.test('conte uma piada'), false);
    assert.strictEqual(tool.match.test('toc uma musica'), false);
    assert.strictEqual(tool.match.test('recomende um livro'), false);
    assert.strictEqual(tool.match.test('qual o clima agora'), false);
  });

  test('build uses dish name with search.php', () => {
    const url = tool.build('receita de feijoada');
    assert.ok(url.includes('themealdb.com'));
    assert.ok(url.startsWith('https://www.themealdb.com/api/json/v1/1/search.php?s='));
    assert.ok(url.includes('feijoada'));
  });

  test('build falls back to random.php without dish', () => {
    assert.strictEqual(tool.build('receita de'), 'https://www.themealdb.com/api/json/v1/1/random.php');
    assert.strictEqual(tool.build(''), 'https://www.themealdb.com/api/json/v1/1/random.php');
    assert.doesNotThrow(() => tool.build(null));
  });

  test('parse success with fake meals', () => {
    const out = tool.parse({
      meals: [{
        strMeal: 'Feijoada',
        strCategory: 'Beef',
        strMealThumb: 'https://example.com/thumb.jpg',
        strInstructions: 'Step one. Step two. Step three with a lot of extra text to exceed the one hundred and twenty character preview limit for this dish.'
      }]
    });
    assert.ok(out.includes('Feijoada'));
    assert.ok(out.includes('Beef'));
    assert.ok(out.includes('https://example.com/thumb.jpg'));
  });

  test('parse fallback when no meals', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Receita nao encontrada.');
    assert.strictEqual(tool.parse({ meals: [] }), 'Receita nao encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { meals: [{ strMeal: 'Brigadeiro', strCategory: 'Dessert', strMealThumb: 'https://example.com/b.jpg', strInstructions: 'Misturar tudo e enrolar.' }] }; } };
    };
    try {
      const url = tool.build('receita de brigadeiro');
      assert.ok(url.includes('search.php?s=brigadeiro'));
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Brigadeiro'));
      assert.ok(out.includes('Dessert'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});