'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/countapi');

describe('countapi tool', () => {
  test('match detects visit counter queries', () => {
    assert.ok(tool.match.test('contador de visitas'));
    assert.ok(tool.match.test('quantas visitas o site tem'));
    assert.ok(tool.match.test('contagem de visitas'));
    assert.ok(tool.match.test('hit counter please'));
    assert.ok(tool.match.test('quantos acessos tivemos'));
  });

  test('match does not collide with calculator', () => {
    assert.strictEqual(tool.match.test('quanto e 2 mais 2'), false);
    assert.strictEqual(tool.match.test('conta de 5 mais 3'), false);
  });

  test('build returns fixed URL', () => {
    const url = tool.build('quantas visitas');
    assert.ok(url.includes('api.countapi.xyz'));
    assert.ok(url.includes('hemorroidabot/visitas'));
    assert.strictEqual(url, 'https://api.countapi.xyz/hit/hemorroidabot/visitas');
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build());
  });

  test('parse success formats total', () => {
    const out = tool.parse({ value: 123, namespace: 'hemorroidabot', key: 'visitas' });
    assert.ok(out.includes('Total de visitas'));
    assert.ok(out.includes('123'));
  });

  test('parse missing value falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.doesNotThrow(() => tool.parse(null));
    assert.strictEqual(tool.parse({}), 'Contador indisponivel.');
    assert.strictEqual(tool.parse(null), 'Contador indisponivel.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { value: 123, namespace: 'hemorroidabot', key: 'visitas' }; } };
    };
    try {
      const url = tool.build('quantas visitas');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Total de visitas'));
      assert.ok(out.includes('123'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});