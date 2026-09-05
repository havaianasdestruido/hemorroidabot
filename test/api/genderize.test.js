'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const genderize = require('../../tools/genderize');

describe('genderize tool', () => {

  test('match detects gender-related queries', () => {
    assert.ok(genderize.match.test('o nome julia e masculino ou feminino'));
    assert.ok(genderize.match.test('genero do nome lucas'));
    assert.ok(genderize.match.test('gender of alex'));
    assert.ok(genderize.match.test('eh homem ou mulher esse nome'));
    assert.ok(genderize.match.test('menino ou menina'));
    assert.ok(genderize.match.test('genero do nome maria'));
  });

  test('match does NOT match plain name without gender intent', () => {
    assert.strictEqual(genderize.match.test('lucas'), false);
    assert.strictEqual(genderize.match.test('me fala sobre flores'), false);
    assert.strictEqual(genderize.match.test('pesquisar'), false);
  });

  test('build extracts name from query', () => {
    assert.ok(genderize.build('genero do nome lucas').includes('name=lucas'));
  });

  test('build uses default name emily', () => {
    const url = genderize.build('qualquer coisa');
    assert.ok(url.includes('name=emily'));
  });

  test('parse returns feminine result for female', () => {
    const result = genderize.parse({ name: 'emily', gender: 'female', probability: 0.99, count: 123 });
    assert.ok(result.includes('feminino'));
    assert.ok(result.includes('99'));
  });

  test('parse returns masculine result for male', () => {
    const result = genderize.parse({ name: 'lucas', gender: 'male', probability: 0.95, count: 50 });
    assert.ok(result.includes('masculino'));
    assert.ok(result.includes('95'));
  });

  test('parse handles null gender gracefully', () => {
    const result = genderize.parse({ name: 'x', gender: null });
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('indeterminado'));
  });

  test('parse handles empty object gracefully', () => {
    const result = genderize.parse({});
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  test('parse handles null data gracefully', () => {
    const result = genderize.parse(null);
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  test('mocked fetch flow female', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return { name: 'emily', gender: 'female', probability: 0.99, count: 123 };
        }
      };
    };
    try {
      const url = genderize.build('genero do nome emily');
      assert.ok(url.includes('name=emily'));
      const res = await fetch(url);
      const data = await res.json();
      const result = genderize.parse(data);
      assert.ok(result.includes('feminino'));
      assert.ok(result.includes('99'));
      assert.ok(result.includes('123'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('mocked fetch flow male', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return { name: 'pedro', gender: 'male', probability: 0.88, count: 77 };
        }
      };
    };
    try {
      const url = genderize.build('gender of pedro');
      assert.ok(url.includes('name=pedro'));
      const res = await fetch(url);
      const data = await res.json();
      const result = genderize.parse(data);
      assert.ok(result.includes('masculino'));
      assert.ok(result.includes('88'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
