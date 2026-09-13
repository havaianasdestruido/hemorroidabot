'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/starwars');

describe('starwars tool', () => {
  test('match detects star wars queries', () => {
    assert.ok(tool.match.test('quem e luke skywalker'));
    assert.ok(tool.match.test('fale sobre darth vader'));
    assert.ok(tool.match.test('personagem de star wars obi-wan'));
    assert.ok(tool.match.test('star wars yoda'));
  });

  test('match does not collide with wttr', () => {
    assert.strictEqual(tool.match.test('previsao do tempo'), false);
    assert.strictEqual(tool.match.test('clima em sao paulo'), false);
  });

  test('build uses character name', () => {
    const url = tool.build('personagem de star wars luke');
    assert.ok(url.startsWith('https://swapi.dev/api/people/?search='));
    assert.ok(url.endsWith('luke'));
  });

  test('build falls back to luke', () => {
    assert.strictEqual(tool.build('jedi'), 'https://swapi.dev/api/people/?search=luke');
    assert.strictEqual(tool.build(''), 'https://swapi.dev/api/people/?search=luke');
  });

  test('parse full response', () => {
    const out = tool.parse({
      results: [{ name: 'Luke Skywalker', height: '172', mass: '77', gender: 'male', birth_year: '19BBY' }]
    });
    assert.ok(out.includes('Luke Skywalker'));
    assert.ok(out.includes('172'));
    assert.ok(out.includes('77'));
    assert.ok(out.includes('male'));
    assert.ok(out.includes('19BBY'));
  });

  test('parse empty results falls back', () => {
    assert.doesNotThrow(() => tool.parse({ results: [] }));
    assert.strictEqual(tool.parse({ results: [] }), 'Personagem nao encontrado.');
  });

  test('parse missing results falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Personagem nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { results: [{ name: 'Yoda', height: '66', mass: '17', gender: 'male', birth_year: '896BBY' }] }; } };
    };
    try {
      const url = tool.build('star wars yoda');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(url.includes('swapi.dev'));
      assert.ok(out.includes('Yoda'));
      assert.ok(out.includes('66'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});