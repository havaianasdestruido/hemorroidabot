'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/rickandmorty');

describe('rickandmorty tool', () => {
  test('match detects rick and morty queries', () => {
    assert.ok(tool.match.test('rick and morty morty sanchez'));
    assert.ok(tool.match.test('rick e morty'));
    assert.ok(tool.match.test('personagem do rick'));
    assert.ok(tool.match.test('morty'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('previsao do tempo'), false);
    assert.strictEqual(tool.match.test('clima agora'), false);
  });

  test('build uses character name', () => {
    const url = tool.build('rick and morty morty');
    assert.ok(url.includes('rickandmortyapi.com/api/character/'));
    assert.ok(url.includes('name=') && url.includes('morty'));
  });

  test('build falls back to rick', () => {
    const url = tool.build('');
    assert.ok(url.includes('name=rick'));
  });

  test('parse full response', () => {
    const out = tool.parse({
      results: [{
        name: 'Rick Sanchez',
        status: 'Alive',
        species: 'Human',
        gender: 'Male',
        origin: { name: 'Earth (C-137)' },
        image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg'
      }]
    });
    assert.ok(out.includes('Rick Sanchez'));
    assert.ok(out.includes('Alive'));
    assert.ok(out.includes('Human'));
    assert.ok(out.includes('Male'));
    assert.ok(out.includes('Earth (C-137)'));
    assert.ok(out.includes('Imagem'));
  });

  test('parse missing results falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Personagem nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { results: [{ name: 'Morty Smith', status: 'Alive', species: 'Human', gender: 'Male', origin: { name: 'Earth (C-137)' }, image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg' }] }; } };
    };
    try {
      const url = tool.build('rick and morty morty');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Morty Smith'));
      assert.ok(out.includes('Alive'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});