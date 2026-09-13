'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/emoji');

describe('emoji tool', () => {
  test('match detects emoji queries', () => {
    assert.ok(tool.match.test('emoji aleatorio'));
    assert.ok(tool.match.test('manda um emoji'));
    assert.ok(tool.match.test('quero um emoji agora'));
    assert.ok(tool.match.test('um emoji emoji para presente'));
  });

  test('match does not collide with generic queries', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('o que e emoji'), false);
    assert.strictEqual(tool.match.test('hello there'), false);
  });

  test('match does not match wttr queries', () => {
    assert.strictEqual(tool.match.test('wttr em sao paulo'), false);
  });

  test('build returns fixed URL', () => {
    const url = tool.build('emoji aleatorio');
    assert.strictEqual(url, 'https://emojihub.yurace.pro/api/random');
    assert.ok(url.includes('emojihub.yurace.pro'));
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build(undefined));
    assert.doesNotThrow(() => tool.build('manda um emoji'));
  });

  test('parse full response', () => {
    const out = tool.parse({
      name: 'grinning face',
      category: 'smileys and emotion',
      group: 'face',
      htmlCode: ['&#x1F600;'],
      unicode: ['U+1F600']
    });
    assert.ok(out.includes('&#x1F600;'));
    assert.ok(out.includes('grinning face'));
    assert.ok(out.includes('smileys and emotion'));
  });

  test('parse joins htmlCode array', () => {
    const out = tool.parse({
      name: 'fire',
      category: 'activity',
      htmlCode: ['&#x1F525;', '&#xFE0F;'],
      unicode: ['U+1F525', 'U+FE0F']
    });
    assert.ok(out.includes('&#x1F525;&#xFE0F;'));
    assert.ok(out.includes('fire (activity)'));
  });

  test('parse missing data falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Emoji nao encontrado.');
  });

  test('parse missing htmlCode falls back', () => {
    assert.doesNotThrow(() => tool.parse({ name: 'x', category: 'y' }));
    assert.strictEqual(tool.parse({ name: 'x', category: 'y' }), 'Emoji nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { name: 'party popper', category: 'activities', group: 'event', htmlCode: ['&#x1F389;'], unicode: ['U+1F389'] }; } };
    };
    try {
      const url = tool.build('manda um emoji');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('&#x1F389;'));
      assert.ok(out.includes('party popper'));
      assert.ok(out.includes('activities'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});