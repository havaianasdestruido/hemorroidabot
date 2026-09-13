'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const httppets = require('../../tools/httppets');

describe('httppets tool', () => {
  test('match detects http dog query', () => {
    assert.ok(httppets.match.test('qual o status code do http'));
  });

  test('match detects http cat query', () => {
    assert.ok(httppets.match.test('status code do http cat 404'));
  });

  test('match detects status code de', () => {
    assert.ok(httppets.match.test('status code de 500'));
  });

  test('match detects qual o status', () => {
    assert.ok(httppets.match.test('qual o status da url'));
  });

  test('match detects status dog/status cat', () => {
    assert.ok(httppets.match.test('status dog do 404'));
    assert.ok(httppets.match.test('status cat de 500'));
  });

  test('match does NOT match dog alone (no collision with dog-ceo)', () => {
    assert.strictEqual(httppets.match.test('foto de um dog'), false);
  });

  test('match does NOT match gato alone (no collision with catfact)', () => {
    assert.strictEqual(httppets.match.test('fato sobre gato'), false);
  });

  test('build returns 200 URL for default query', () => {
    assert.strictEqual(httppets.build('status code do http'), 'https://http.dog/200.json');
  });

  test('build returns 404 URL when number in middle of text', () => {
    assert.strictEqual(httppets.build('status dog do http 404 agora'), 'https://http.dog/404.json');
  });

  test('build returns 599 URL for /infty route', () => {
    assert.strictEqual(httppets.build('status cat /infty'), 'https://http.dog/599.json');
  });

  test('build returns 200 URL for /dunder route', () => {
    assert.strictEqual(httppets.build('status dog /dunder'), 'https://http.dog/200.json');
  });

  test('build returns 200 URL for /mifflin route', () => {
    assert.strictEqual(httppets.build('status cat /mifflin'), 'https://http.dog/200.json');
  });

  test('build returns 200 URL when no number present', () => {
    assert.strictEqual(httppets.build('status code de'), 'https://http.dog/200.json');
  });

  test('build returns 200 URL for empty query', () => {
    assert.strictEqual(httppets.build(''), 'https://http.dog/200.json');
  });

  test('build ignores out-of-range numbers', () => {
    assert.strictEqual(httppets.build('status code de 99'), 'https://http.dog/200.json');
  });

  test('parse returns string with OK and image link', () => {
    const result = httppets.parse({ status_code: 200, title: 'OK', image: 'https://http.dog/200.jpg' });
    assert.ok(result.includes('OK'));
    assert.ok(result.includes('https://http.dog/200.jpg'));
    assert.ok(result.includes('HTTP 200'));
    assert.ok(result.includes('Foto:'));
  });

  test('parse 404 mock returns string', () => {
    const result = httppets.parse({ status_code: 404, title: 'Not Found', image: 'https://http.dog/404.jpg' });
    assert.ok(result.includes('HTTP 404'));
    assert.ok(result.includes('Not Found'));
  });

  test('parse empty object returns fallback no throw', () => {
    assert.doesNotThrow(() => httppets.parse({}));
    assert.strictEqual(httppets.parse({}), 'Status HTTP indisponivel no momento.');
  });

  test('parse null returns fallback no throw', () => {
    assert.doesNotThrow(() => httppets.parse(null));
    assert.strictEqual(httppets.parse(null), 'Status HTTP indisponivel no momento.');
  });

  test('parse undefined returns fallback no throw', () => {
    assert.doesNotThrow(() => httppets.parse(undefined));
  });

  test('parse garbage never throws and returns non-empty string', () => {
    assert.doesNotThrow(() => httppets.parse(42));
    assert.doesNotThrow(() => httppets.parse(true));
    assert.doesNotThrow(() => httppets.parse([]));
    assert.ok(httppets.parse('lixo').length > 0);
  });

  test('parse partial data keeps friendly fallback', () => {
    const result = httppets.parse({ title: 'OK' });
    assert.ok(result.length > 0);
  });

  test('mocked fetch full flow captures build URL and renders text', async () => {
    const originalFetch = globalThis.fetch;
    let captured = null;
    globalThis.fetch = async function(u) {
      captured = u;
      return {
        ok: true,
        json: async function() {
          return { status_code: 200, title: 'OK', image: 'https://http.dog/200.jpg' };
        }
      };
    };
    try {
      const query = 'status code do http 200';
      const url = httppets.build(query);
      assert.strictEqual(url, 'https://http.dog/200.json');
      const res = await fetch(url);
      assert.strictEqual(res.ok, true);
      const data = await res.json();
      assert.strictEqual(data.status_code, 200);
      const result = httppets.parse(data);
      assert.ok(result.includes('HTTP 200'));
      assert.ok(result.includes('OK'));
      assert.ok(result.includes('https://http.dog/200.jpg'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});