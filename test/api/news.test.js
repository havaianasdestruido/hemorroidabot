'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/news');

describe('news tool', () => {
  test('match detects news queries', () => {
    assert.ok(tool.match.test('hacker news'));
    assert.ok(tool.match.test('noticias tech de hoje'));
    assert.ok(tool.match.test('top stories do momento'));
    assert.ok(tool.match.test('topstories'));
    assert.ok(tool.match.test('news ycombinator'));
    assert.ok(tool.match.test('hn algo'));
  });

  test('match does not collide with generic tools', () => {
    assert.strictEqual(tool.match.test('piada'), false);
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('receita'), false);
    assert.strictEqual(tool.match.test('clima'), false);
  });

  test('build returns topstories URL', () => {
    const url = tool.build('hacker news', {});
    assert.strictEqual(url, 'https://hacker-news.firebaseio.com/v0/topstories.json');
  });

  test('parse success returns first 5 ids as HN links', () => {
    const out = tool.parse([1, 2, 3, 4, 5, 6, 7]);
    const lines = out.split('\n');
    assert.strictEqual(lines.length, 5);
    assert.strictEqual(lines[0], 'https://news.ycombinator.com/item?id=1');
    assert.strictEqual(lines[4], 'https://news.ycombinator.com/item?id=5');
    assert.ok(out.includes('id=6') === false);
  });

  test('parse empty array falls back', () => {
    assert.doesNotThrow(() => tool.parse([]));
    assert.strictEqual(tool.parse([]), 'Sem noticias agora.');
  });

  test('parse non-array falls back', () => {
    assert.strictEqual(tool.parse({}), 'Sem noticias agora.');
    assert.strictEqual(tool.parse(null), 'Sem noticias agora.');
    assert.strictEqual(tool.parse(undefined), 'Sem noticias agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return [10, 20, 30, 40, 50, 60]; } };
    };
    try {
      const url = tool.build('hacker news');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('id=10'));
      assert.ok(out.includes('id=50'));
      assert.strictEqual(out.split('\n').length, 5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});