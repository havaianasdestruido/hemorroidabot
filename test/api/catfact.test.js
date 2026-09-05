'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const catfact = require('../../tools/catfact');

describe('catfact tool', () => {

  test('match detects cat-related queries', () => {
    assert.ok(catfact.match.test('fato sobre gatos'));
    assert.ok(catfact.match.test('me conta um gato'));
    assert.ok(catfact.match.test('cat fact'));
    assert.ok(catfact.match.test('curiosidade de gatinho'));
  });

  test('match does NOT match dog keyword', () => {
    assert.strictEqual(catfact.match.test('cachorro'), false);
  });

  test('build returns exact catfact URL', () => {
    assert.strictEqual(catfact.build('qualquer coisa'), 'https://catfact.ninja/fact');
  });

  test('parse returns fact from valid data', () => {
    const result = catfact.parse({ fact: 'Gatos dormem 16h.', length: 20 });
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('Gatos dormem'));
  });

  test('parse handles null gracefully', () => {
    const result = catfact.parse(null);
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('parse handles empty object gracefully', () => {
    const result = catfact.parse({});
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('mocked fetch full flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return { fact: 'Gatos podem girar 180 graus a cabeca.', length: 40 };
        }
      };
    };
    try {
      const url = catfact.build('gato');
      const res = await fetch(url);
      const data = await res.json();
      const result = catfact.parse(data);
      assert.ok(result.includes('girar 180 graus'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
