'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/fox');

describe('fox tool', () => {
  test('match detects fox queries', () => {
    assert.ok(tool.match.test('me manda uma raposa'));
    assert.ok(tool.match.test('fox picture'));
    assert.ok(tool.match.test('foto de raposa'));
    assert.ok(tool.match.test('imagem de uma raposa'));
  });

  test('match does not collide with other animal tools', () => {
    assert.strictEqual(tool.match.test('cachorro'), false);
    assert.strictEqual(tool.match.test('gato'), false);
    assert.strictEqual(tool.match.test('dog'), false);
    assert.strictEqual(tool.match.test('cat'), false);
  });

  test('build returns fixed URL', () => {
    assert.strictEqual(tool.build('foto de raposa'), 'https://randomfox.ca/floof/');
  });

  test('parse full response', () => {
    const out = tool.parse({ image: 'https://randomfox.ca/images/1.jpg' });
    assert.ok(out.includes('Raposa:'));
    assert.ok(out.includes('https://randomfox.ca/images/1.jpg'));
  });

  test('parse missing image falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Raposa nao encontrada.');
    assert.strictEqual(tool.parse(null), 'Raposa nao encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { image: 'https://randomfox.ca/images/42.jpg' }; } };
    };
    try {
      const url = tool.build('foto de raposa');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Raposa:'));
      assert.ok(out.includes('https://randomfox.ca/images/42.jpg'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});