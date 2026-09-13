'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/jsonplaceholder');

describe('jsonplaceholder tool', () => {
  test('match detects jsonplaceholder queries', () => {
    assert.ok(tool.match.test('json placeholder'));
    assert.ok(tool.match.test('placeholder json'));
    assert.ok(tool.match.test('mock rest api'));
    assert.ok(tool.match.test('dados fake para teste'));
    assert.ok(tool.match.test('endpoint de teste'));
    assert.ok(tool.match.test('teste de api rest'));
  });

  test('match does not collide with generic words', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('previsao do tempo'), false);
    assert.strictEqual(tool.match.test('api normal'), false);
  });

  test('build uses posts/1 by default', () => {
    const url = tool.build('json placeholder para teste');
    assert.strictEqual(url, 'https://jsonplaceholder.typicode.com/posts/1');
  });

  test('build uses number from query', () => {
    const url = tool.build('mock rest teste o post 42');
    assert.strictEqual(url, 'https://jsonplaceholder.typicode.com/posts/42');
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build(null));
    assert.doesNotThrow(() => tool.build('json placeholder'));
    assert.ok(tool.build(null).includes('posts/1'));
  });

  test('parse full response', () => {
    const out = tool.parse({ userId: 1, id: 1, title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit', body: 'quia et suscipit\nsuscipit recusandae consequuntur expedita et cum' });
    assert.strictEqual(out, 'Post 1:\nsunt aut facere repellat provident occaecati excepturi optio reprehenderit\n\nquia et suscipit\nsuscipit recusandae consequuntur expedita et cum');
  });

  test('parse missing data falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Post nao encontrado.');
  });

  test('parse malformed input falls back', () => {
    assert.doesNotThrow(() => tool.parse(null));
    assert.doesNotThrow(() => tool.parse({ id: 1, title: null }));
    assert.strictEqual(tool.parse(null), 'Post nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { userId: 1, id: 2, title: 'Titulo de teste', body: 'Corpo de teste' }; } };
    };
    try {
      const url = tool.build('dados fake do post 2');
      assert.strictEqual(url, 'https://jsonplaceholder.typicode.com/posts/2');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Post 2:'));
      assert.ok(out.includes('Titulo de teste'));
      assert.ok(out.includes('Corpo de teste'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});