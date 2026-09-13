'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/randomuser');

describe('randomuser tool', () => {
  test('match detects random person queries', () => {
    assert.ok(tool.match.test('pessoa aleatoria'));
    assert.ok(tool.match.test('random user'));
    assert.ok(tool.match.test('usuario aleatorio'));
    assert.ok(tool.match.test('gera uma pessoa'));
    assert.ok(tool.match.test('pessoa ficticia'));
  });

  test('match does not collide with generic queries', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('noticias'), false);
    assert.strictEqual(tool.match.test('tempo em lisboa'), false);
  });

  test('build returns fixed API URL', () => {
    const url = tool.build('pessoa aleatoria');
    assert.strictEqual(url, 'https://randomuser.me/api/?nat=br');
  });

  test('parse full response', () => {
    const out = tool.parse({
      results: [{
        name: { first: 'Maria', last: 'Silva' },
        email: 'maria.silva@example.com',
        phone: '(11) 99999-0000',
        location: { city: 'Sao Paulo', country: 'Brazil' },
        picture: { thumbnail: 'https://randomuser.me/api/portraits/thumb/w/1.jpg' }
      }]
    });
    assert.ok(out.includes('Maria Silva'));
    assert.ok(out.includes('maria.silva@example.com'));
    assert.ok(out.includes('(11) 99999-0000'));
    assert.ok(out.includes('Sao Paulo'));
    assert.ok(out.includes('Brazil'));
    assert.ok(out.includes('thumb/w/1.jpg'));
  });

  test('parse empty data falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Pessoa nao encontrada.');
  });

  test('parse null input falls back', () => {
    assert.doesNotThrow(() => tool.parse(null));
    assert.strictEqual(tool.parse(null), 'Pessoa nao encontrada.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { results: [{ name: { first: 'Joao', last: 'Pereira' }, email: 'joao.pereira@example.com', phone: '(21) 91234-5678', location: { city: 'Rio de Janeiro', country: 'Brazil' }, picture: { thumbnail: 'https://randomuser.me/api/portraits/thumb/m/2.jpg' } }] }; } };
    };
    try {
      const url = tool.build('gera uma pessoa');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Joao Pereira'));
      assert.ok(out.includes('Rio de Janeiro'));
      assert.ok(out.includes('m/2.jpg'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});