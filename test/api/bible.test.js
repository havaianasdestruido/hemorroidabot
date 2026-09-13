'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/bible');

describe('bible tool', () => {
  test('match detects bible queries', () => {
    assert.ok(tool.match.test('versiculo'));
    assert.ok(tool.match.test('versiculo da biblia'));
    assert.ok(tool.match.test('biblia'));
    assert.ok(tool.match.test('salmo'));
    assert.ok(tool.match.test('palavra de deus'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('livro'), false);
    assert.strictEqual(tool.match.test('numero'), false);
    assert.strictEqual(tool.match.test('piada'), false);
  });

  test('build returns fixed URL', () => {
    const url = tool.build('versiculo da biblia');
    assert.strictEqual(url, 'https://bible-api.com/data/web/random');
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build());
    assert.strictEqual(tool.build(), 'https://bible-api.com/data/web/random');
  });

  test('parse full response', () => {
    const out = tool.parse({
      random_verse: {
        book: 'John',
        chapter: 3,
        verse: 16,
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation_id: 'web',
        translation_name: 'World English Bible'
      }
    });
    assert.ok(out.includes('For God so loved the world...'));
    assert.ok(out.includes('John 3:16'));
    assert.ok(out.includes('World English Bible'));
  });

  test('parse missing random_verse falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Sem versiculo agora.');
  });

  test('parse missing text falls back', () => {
    assert.doesNotThrow(() => tool.parse({ random_verse: { reference: 'John 3:16' } }));
    assert.strictEqual(tool.parse({ random_verse: { reference: 'John 3:16' } }), 'Sem versiculo agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { random_verse: { book: 'Psalms', chapter: 23, verse: 1, reference: 'Psalms 23:1', text: 'Yahweh is my shepherd', translation_id: 'web', translation_name: 'World English Bible' } }; } };
    };
    try {
      const url = tool.build('salmo');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Yahweh is my shepherd'));
      assert.ok(out.includes('Psalms 23:1'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});