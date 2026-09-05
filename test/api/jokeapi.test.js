'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const jokeapi = require('../../tools/jokeapi');

describe('jokeapi tool', () => {

  test('match detects joke-related queries', () => {
    assert.ok(jokeapi.match.test('conta uma piada'));
    assert.ok(jokeapi.match.test('me da uma piada'));
    assert.ok(jokeapi.match.test('joke'));
    assert.ok(jokeapi.match.test('faz me rir'));
    assert.ok(jokeapi.match.test('ver uma piada'));
  });

  test('match does NOT match unrelated keyword', () => {
    assert.strictEqual(jokeapi.match.test('clima hoje'), false);
  });

  test('build returns URL with lang=pt', () => {
    const url = jokeapi.build('conta uma piada');
    assert.ok(url.includes('lang=pt'));
    assert.ok(url.includes('v2.jokeapi.dev'));
  });

  test('parse single type returns joke', () => {
    const result = jokeapi.parse({ type: 'single', joke: 'Por que o programador usa oculos? Porque nao consegue C#.', error: false });
    assert.strictEqual(result, 'Por que o programador usa oculos? Porque nao consegue C#.');
  });

  test('parse twopart type returns setup and delivery', () => {
    const result = jokeapi.parse({ type: 'twopart', setup: 'Por que o programador foi ao medico?', delivery: 'Porque ele tinha um bug.', error: false });
    assert.ok(result.includes('Por que o programador foi ao medico?'));
    assert.ok(result.includes('Porque ele tinha um bug.'));
    assert.ok(result.includes('\n'));
  });

  test('parse error true returns fallback', () => {
    const result = jokeapi.parse({ error: true });
    assert.strictEqual(result, 'Nao consegui uma piada.');
  });

  test('parse null returns fallback', () => {
    const result = jokeapi.parse(null);
    assert.strictEqual(result, 'Nao consegui uma piada.');
  });

  test('parse empty object returns fallback', () => {
    const result = jokeapi.parse({});
    assert.strictEqual(result, 'Nao consegui uma piada.');
  });

  test('parse never throws', () => {
    assert.doesNotThrow(() => jokeapi.parse(null));
    assert.doesNotThrow(() => jokeapi.parse(undefined));
    assert.doesNotThrow(() => jokeapi.parse({}));
    assert.doesNotThrow(() => jokeapi.parse({ error: true }));
  });

  test('mocked fetch full flow single type', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return { type: 'single', joke: 'Por que o programmador foge do pescador? Porque ele tem medo de phishing.', error: false };
        }
      };
    };
    try {
      const url = jokeapi.build('conta uma piada');
      assert.ok(url.includes('lang=pt'));
      const res = await fetch(url);
      assert.strictEqual(res.ok, true);
      const data = await res.json();
      const result = jokeapi.parse(data);
      assert.ok(result.includes('phishing'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('mocked fetch full flow twopart type', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return { type: 'twopart', setup: 'O que o Java bebe?', delivery: 'JavaScript!', error: false };
        }
      };
    };
    try {
      const url = jokeapi.build('faz me rir');
      const res = await fetch(url);
      const data = await res.json();
      const result = jokeapi.parse(data);
      assert.ok(result.includes('O que o Java bebe?'));
      assert.ok(result.includes('JavaScript!'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
