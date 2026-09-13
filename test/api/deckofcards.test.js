'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/deckofcards');

describe('deckofcards tool', () => {
  test('match detects deck/card queries', () => {
    assert.ok(tool.match.test('comprar carta'));
    assert.ok(tool.match.test('sorteia uma carta'));
    assert.ok(tool.match.test('tira uma carta'));
    assert.ok(tool.match.test('jogo de cartas'));
    assert.ok(tool.match.test('baralho'));
    assert.ok(tool.match.test('3 cartas'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('uma piada'), false);
    assert.strictEqual(tool.match.test('toca uma musica'), false);
    assert.strictEqual(tool.match.test('recomenda um livro'), false);
    assert.strictEqual(tool.match.test('um numero aleatorio'), false);
  });

  test('build uses default count 1', () => {
    const url = tool.build('comprar carta');
    assert.ok(url.includes('deckofcardsapi.com'));
    assert.ok(url.includes('count=1'));
  });

  test('build extracts count 1-5 from query', () => {
    assert.ok(tool.build('comprar 3 cartas').includes('count=3'));
    assert.ok(tool.build('sorteia 5 cartas').includes('count=5'));
  });

  test('build ignores count outside 1-5', () => {
    assert.ok(tool.build('comprar 99 cartas').includes('count=1'));
    assert.ok(tool.build('comprar 0 cartas').includes('count=1'));
  });

  test('build never throws on empty query', () => {
    assert.doesNotThrow(() => tool.build(''));
    assert.ok(tool.build('').includes('count=1'));
  });

  test('parse full response', () => {
    const out = tool.parse({
      success: true,
      remaining: 51,
      cards: [{ value: 'ACE', suit: 'SPADES', image: 'https://deckofcardsapi.com/static/img/AS.png' }]
    });
    assert.strictEqual(out, 'Carta: ACE de SPADES\nImagem: https://deckofcardsapi.com/static/img/AS.png\nRestantes: 51');
  });

  test('parse missing cards falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Carta nao encontrada.');
  });

  test('parse malformed data falls back', () => {
    assert.doesNotThrow(() => tool.parse({ cards: 'nope' }));
    assert.strictEqual(tool.parse({ cards: 'nope' }), 'Carta nao encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { success: true, remaining: 51, cards: [{ value: 'KING', suit: 'HEARTS', image: 'https://deckofcardsapi.com/static/img/KH.png' }] }; } };
    };
    try {
      const url = tool.build('sorteia uma carta');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('KING de HEARTS'));
      assert.ok(out.includes('Restantes: 51'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});