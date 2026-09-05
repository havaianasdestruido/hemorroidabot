'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const numbersapi = require('../../tools/numbersapi');

describe('numbersapi tool', () => {

  test('match detects number-related queries', () => {
    assert.ok(numbersapi.match.test('fato sobre o numero 7'));
    assert.ok(numbersapi.match.test('me da um fato numerico'));
    assert.ok(numbersapi.match.test('number trivia'));
    assert.ok(numbersapi.match.test('curiosidade numero'));
  });

  test('match does NOT match unrelated query', () => {
    assert.strictEqual(numbersapi.match.test('gato bonito'), false);
  });

  test('build extracts number from query', () => {
    assert.ok(numbersapi.build('fato sobre o numero 7').includes('/7?json'));
  });

  test('build defaults to 42 when no number', () => {
    assert.ok(numbersapi.build('curiosidade numero').includes('/42?json'));
  });

  test('parse returns text from valid data', () => {
    const result = numbersapi.parse({ text: '7 is a lucky number.', number: 7, type: 'trivia' });
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('lucky'));
  });

  test('parse handles null gracefully', () => {
    const result = numbersapi.parse(null);
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('parse handles empty object gracefully', () => {
    const result = numbersapi.parse({});
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('mocked fetch full flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return { text: '42 is the answer to life.', number: 42, type: 'trivia' };
        }
      };
    };
    try {
      const url = numbersapi.build('fato numero 42');
      const res = await fetch(url);
      const data = await res.json();
      const result = numbersapi.parse(data);
      assert.ok(result.includes('answer to life'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
