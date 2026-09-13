'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/shibe');

describe('shibe tool', () => {
  test('match detects shiba queries', () => {
    assert.ok(tool.match.test('me manda uma foto de shiba'));
    assert.ok(tool.match.test('shibe por favor'));
  });

  test('match does not collide with dog-ceo', () => {
    assert.strictEqual(tool.match.test('foto de um dog'), false);
    assert.strictEqual(tool.match.test('me manda uma foto de cachorro'), false);
  });

  test('build returns fixed url', () => {
    const url = tool.build('me manda uma foto de shiba');
    assert.strictEqual(url, 'https://shibe.online/api/shibes?count=1&urls=true');
  });

  test('parse success', () => {
    const out = tool.parse(['https://cdn.shibe.online/shibes/123.jpg']);
    assert.strictEqual(out, 'Shiba:\nhttps://cdn.shibe.online/shibes/123.jpg');
  });

  test('parse empty array falls back', () => {
    assert.doesNotThrow(() => tool.parse([]));
    assert.strictEqual(tool.parse([]), 'Shiba nao encontrado.');
  });

  test('parse missing data falls back', () => {
    assert.doesNotThrow(() => tool.parse(undefined));
    assert.doesNotThrow(() => tool.parse('nope'));
    assert.strictEqual(tool.parse('nope'), 'Shiba nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return ['https://cdn.shibe.online/shibes/456.jpg']; } };
    };
    try {
      const url = tool.build('me manda uma foto de shiba');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Shiba:'));
      assert.ok(out.includes('456.jpg'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});