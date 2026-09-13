'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/poetry');

describe('poetry tool', () => {
  test('match detects poetry queries', () => {
    assert.ok(tool.match.test('me da um poema'));
    assert.ok(tool.match.test('poesia bonita'));
    assert.ok(tool.match.test('poeta famoso'));
    assert.ok(tool.match.test('verso bonito'));
    assert.ok(tool.match.test('versos antigos'));
    assert.ok(tool.match.test('uma poema'));
  });

  test('match does not collide with piada/musica/livro/clima', () => {
    assert.strictEqual(tool.match.test('piada engraçada'), false);
    assert.strictEqual(tool.match.test('musica popular'), false);
    assert.strictEqual(tool.match.test('livro legal'), false);
    assert.strictEqual(tool.match.test('clima agora'), false);
  });

  test('build returns poetrydb random URL', () => {
    const url = tool.build('poema bonito');
    assert.strictEqual(url, 'https://poetrydb.org/random');
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build(''));
    assert.doesNotThrow(() => tool.build('qualquer coisa'));
    assert.doesNotThrow(() => tool.build(null));
    assert.doesNotThrow(() => tool.build(undefined));
  });

  test('parse full response with lines', () => {
    const out = tool.parse([{ title: 'Soneto 1', author: 'Shakespeare', lines: ['Rento', 'linha dois', 'linha tres', 'linha quatro', 'linha cinco', 'linha seis'] }]);
    assert.ok(out.includes('Soneto 1'));
    assert.ok(out.includes('Shakespeare'));
    assert.ok(out.includes('Rento'));
    assert.ok(out.includes('linha dois'));
    assert.ok(out.includes('linha tres'));
    assert.ok(out.includes('linha quatro'));
    assert.ok(!out.includes('linha cinco'));
  });

  test('parse empty array falls back', () => {
    assert.strictEqual(tool.parse([]), 'Nenhum poema encontrado.');
  });

  test('parse null falls back', () => {
    assert.strictEqual(tool.parse(null), 'Nenhum poema encontrado.');
  });

  test('parse undefined falls back', () => {
    assert.strictEqual(tool.parse(undefined), 'Nenhum poema encontrado.');
  });

  test('parse non-array falls back', () => {
    assert.strictEqual(tool.parse({ title: 'x' }), 'Nenhum poema encontrado.');
  });

  test('parse missing lines falls back gracefully', () => {
    const out = tool.parse([{ title: 'Teste', author: 'Autor' }]);
    assert.ok(out.includes('Teste'));
    assert.ok(out.includes('Autor'));
  });

  test('parse never throws', () => {
    assert.doesNotThrow(() => tool.parse(null));
    assert.doesNotThrow(() => tool.parse(123));
    assert.doesNotThrow(() => tool.parse('bad'));
    assert.doesNotThrow(() => tool.parse({ bad: true }));
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return [{ title: 'O Corvo', author: 'Edgar Allan Poe', lines: ['Uma vez', 'na meia noite', 'triste', 'cansado', 'pensando'] }];
        }
      };
    };
    try {
      const url = tool.build('poema');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('O Corvo'));
      assert.ok(out.includes('Edgar Allan Poe'));
      assert.ok(out.includes('Uma vez'));
      assert.ok(!out.includes('pensando'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
