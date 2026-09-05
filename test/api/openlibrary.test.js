'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const openlibrary = require('../../tools/openlibrary');

describe('openlibrary tool', () => {

  test('match detects book-related queries in PT and EN', () => {
    assert.ok(openlibrary.match.test('procura o livro hobbit'));
    assert.ok(openlibrary.match.test('me indica um livro'));
    assert.ok(openlibrary.match.test('search book'));
    assert.ok(openlibrary.match.test('busca livro duna'));
  });

  test('build with normal query returns correct URL', () => {
    const url = openlibrary.build('livro hobbit');
    assert.ok(url.includes('q=hobbit'));
    assert.ok(url.includes('limit=3'));
    assert.ok(url.startsWith('https://openlibrary.org/search.json'));
  });

  test('build with empty query defaults to hobbit', () => {
    const url = openlibrary.build('');
    assert.ok(url.includes('q=hobbit'));
  });

  test('build with null query defaults to hobbit', () => {
    const url = openlibrary.build(null);
    assert.ok(url.includes('q=hobbit'));
  });

  test('build URL-encodes special characters', () => {
    const url = openlibrary.build('livro guerra e paz');
    assert.ok(url.includes('q=guerra%20e%20paz'));
  });

  test('parse returns formatted lines from valid data', () => {
    const data = {
      numFound: 3,
      docs: [{
        title: 'The Hobbit',
        author_name: ['J.R.R. Tolkien'],
        first_publish_year: 1937,
        key: '/works/OL1W',
        cover_i: 12345
      }]
    };
    const result = openlibrary.parse(data);
    assert.ok(result.includes('Hobbit'));
    assert.ok(result.includes('Tolkien'));
    assert.ok(result.includes('1937'));
    assert.ok(result.includes('https://openlibrary.org/works/OL1W'));
  });

  test('parse handles empty docs gracefully', () => {
    const result = openlibrary.parse({ numFound: 0, docs: [] });
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
    assert.ok(result.includes('Nenhum'));
  });

  test('parse handles null gracefully', () => {
    const result = openlibrary.parse(null);
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  test('parse handles missing fields gracefully', () => {
    const data = { numFound: 1, docs: [{}] };
    const result = openlibrary.parse(data);
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('Sem titulo'));
    assert.ok(result.includes('Autor desconhecido'));
    assert.ok(result.includes('N/D'));
  });

  test('mocked fetch full flow', async () => {
    const originalFetch = globalThis.fetch;
    const mockData = {
      numFound: 1,
      docs: [{
        title: 'The Hobbit',
        author_name: ['J.R.R. Tolkien'],
        first_publish_year: 1937,
        key: '/works/OL1W'
      }]
    };
    globalThis.fetch = async function(url) {
      return {
        ok: true,
        json: async function() { return mockData; }
      };
    };
    try {
      const url = openlibrary.build('livro hobbit');
      const res = await fetch(url);
      const data = await res.json();
      const result = openlibrary.parse(data);
      assert.ok(result.includes('Hobbit'));
      assert.ok(result.includes('Tolkien'));
      assert.ok(result.includes('1937'));
      assert.ok(result.includes('https://openlibrary.org/works/OL1W'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
