'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/dogfacts');

describe('dogfacts tool', () => {
  test('match detects canino queries', () => {
    assert.ok(tool.match.test('fato canino sobre labrador'));
    assert.ok(tool.match.test('fatos caninos curiosos'));
    assert.ok(tool.match.test('curiosidade canina'));
    assert.ok(tool.match.test('fact canino'));
    assert.ok(tool.match.test('cachorrinho trivia'));
  });

  test('match does not collide with dog-ceo', () => {
    assert.strictEqual(tool.match.test('foto de um dog'), false);
    assert.strictEqual(tool.match.test('cachorro bonito'), false);
    assert.strictEqual(tool.match.test('cao de rua'), false);
    assert.strictEqual(tool.match.test('fato canino sobre labrador'), true);
  });

  test('build returns fixed url', () => {
    const url = tool.build('fato canino');
    assert.strictEqual(url, 'https://dog-api.kinduff.com/api/facts?number=2');
    assert.ok(url.includes('dog-api.kinduff.com'));
    assert.doesNotThrow(() => tool.build(null));
  });

  test('parse full response', () => {
    const out = tool.parse({ facts: ['Dogs can smell cancer.', 'Dogs dream like humans.'] });
    assert.ok(out.includes('Fatos sobre caes:'));
    assert.ok(out.includes('- Dogs can smell cancer.'));
    assert.ok(out.includes('- Dogs dream like humans.'));
  });

  test('parse joins first 2 facts only', () => {
    const out = tool.parse({ facts: ['Lake.', 'Stone.', 'Rex.'] });
    assert.ok(out.includes('- Lake.'));
    assert.ok(out.includes('- Stone.'));
    assert.ok(!out.includes('- Rex.'));
  });

  test('parse missing facts falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Sem fatos agora.');
    assert.strictEqual(tool.parse({ facts: [] }), 'Sem fatos agora.');
    assert.strictEqual(tool.parse(null), 'Sem fatos agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { facts: ['Dogs have about 1,700 taste buds.', 'A dog can hear four times farther than humans.'] }; } };
    };
    try {
      const url = tool.build('fatos caninos');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Fatos sobre caes:'));
      assert.ok(out.includes('taste buds'));
      assert.ok(out.includes('hear four times farther'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});