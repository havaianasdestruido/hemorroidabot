'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/urban');

describe('urban tool', () => {
  test('match detects slang queries', () => {
    assert.ok(tool.match.test('o que quer dizer na giria 404'));
    assert.ok(tool.match.test('giria de internet'));
    assert.ok(tool.match.test('urban dictionary para 404'));
    assert.ok(tool.match.test('slang do brasil'));
    assert.ok(tool.match.test('termo da internet'));
  });

  test('match does not collide with wikipedia/dictionary', () => {
    assert.strictEqual(tool.match.test('o que significa 404'), false);
    assert.strictEqual(tool.match.test('qual o significado de 404'), false);
    assert.strictEqual(tool.match.test('definicao de 404'), false);
  });

  test('build uses term', () => {
    const url = tool.build('giria de tocar no saco');
    assert.ok(url.includes('urbandictionary.com'));
    assert.ok(url.includes('tocar%20no%20saco'));
  });

  test('build falls back to lol', () => {
    const url = tool.build('giria');
    assert.ok(url.includes('term=lol'));
  });

  test('parse full response', () => {
    const out = tool.parse({
      list: [{ word: '404', definition: 'alguem que nao conhece as mods do pc', example: 'voce e um 404 total', thumbs_up: 123 }]
    });
    assert.ok(out.includes('Giria: 404'));
    assert.ok(out.includes('alguem que nao conhece'));
    assert.ok(out.includes('exemplo: voce e um 404 total'));
  });

  test('parse truncates definition and example', () => {
    const out = tool.parse({
      list: [{ word: 'long', definition: 'x'.repeat(300), example: 'y'.repeat(200) }]
    });
    assert.ok(out.includes('Giria: long'));
    assert.ok(out.length <= 'Giria: long'.length + 3 + 143 + 12 + 80 + 3);
  });

  test('parse empty list falls back', () => {
    assert.doesNotThrow(() => tool.parse({ list: [] }));
    assert.strictEqual(tool.parse({ list: [] }), 'Giria nao encontrada.');
  });

  test('parse bad shape falls back', () => {
    assert.doesNotThrow(() => tool.parse(null));
    assert.strictEqual(tool.parse(null), 'Giria nao encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { list: [{ word: 'baixar', definition: 'conseguir algo', example: 'vou baixar o jogo', thumbs_up: 5 }] }; } };
    };
    try {
      const url = tool.build('giria de baixar');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Giria: baixar'));
      assert.ok(out.includes('conseguir algo'));
      assert.ok(out.includes('exemplo: vou baixar o jogo'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});