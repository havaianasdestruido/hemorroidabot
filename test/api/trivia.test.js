'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/trivia');

describe('trivia tool', () => {
  test('match detects trivia queries', () => {
    assert.ok(tool.match.test('quiz de ciencias'));
    assert.ok(tool.match.test('trivia'));
    assert.ok(tool.match.test('me de uma pergunta de teste'));
    assert.ok(tool.match.test('teste de conhecimento'));
    assert.ok(tool.match.test('conhecimento geral'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('piada boa'), false);
    assert.strictEqual(tool.match.test('clima em sao paulo'), false);
    assert.strictEqual(tool.match.test('tempo agora'), false);
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('livro'), false);
    assert.strictEqual(tool.match.test('numero da sorte'), false);
    assert.strictEqual(tool.match.test('moeda'), false);
    assert.strictEqual(tool.match.test('receita de bolo'), false);
    assert.strictEqual(tool.match.test('conselho'), false);
  });

  test('build returns opentdb url', () => {
    const url = tool.build('trivia');
    assert.ok(url.includes('opentdb.com'));
    assert.ok(url.includes('amount=1'));
    assert.ok(url.includes('type=multiple'));
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build(undefined));
    assert.doesNotThrow(() => tool.build(null, {}));
    assert.ok(tool.build('', {}));
  });

  test('parse success with results', () => {
    const out = tool.parse({
      response_code: 0,
      results: [{
        category: 'Science',
        type: 'multiple',
        difficulty: 'easy',
        question: 'What planet is known as the Red Planet?',
        correct_answer: 'Mars',
        incorrect_answers: ['Venus', 'Jupiter', 'Saturn']
      }]
    });
    assert.ok(out.includes('Red Planet'));
    assert.ok(out.includes('Mars'));
    assert.ok(out.includes('Science'));
  });

  test('parse falls back on empty results', () => {
    assert.strictEqual(tool.parse({ response_code: 1, results: [] }), 'Sem perguntas agora.');
    assert.strictEqual(tool.parse({}), 'Sem perguntas agora.');
    assert.strictEqual(tool.parse(null), 'Sem perguntas agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async () => ({
          response_code: 0,
          results: [{
            category: 'History',
            type: 'multiple',
            difficulty: 'medium',
            question: 'In what year did WWII end?',
            correct_answer: '1945',
            incorrect_answers: ['1943', '1944', '1946']
          }]
        })
      };
    };
    try {
      const url = tool.build('trivia');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('1945'));
      assert.ok(out.includes('History'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
