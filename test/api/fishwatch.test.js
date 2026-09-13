'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/fishwatch');

describe('fishwatch tool', () => {
  test('match detects fish queries', () => {
    assert.ok(tool.match.test('quero info sobre peixe'));
    assert.ok(tool.match.test('fish atlantic cod'));
    assert.ok(tool.match.test('especie marinha tucunare'));
    assert.ok(tool.match.test('frutos do mar'));
    assert.ok(tool.match.test('info sobre peixe espada'));
  });

  test('match does not collide with generic words', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('toca uma musica'), false);
    assert.strictEqual(tool.match.test('recomende um livro'), false);
    assert.strictEqual(tool.match.test('qual o numero da sorte'), false);
    assert.strictEqual(tool.match.test('conta uma piada'), false);
    assert.strictEqual(tool.match.test('receita de bolo'), false);
    assert.strictEqual(tool.match.test('cotacao da moeda'), false);
    assert.strictEqual(tool.match.test('info sobre gato'), false);
  });

  test('build returns fixed URL', () => {
    const url = tool.build('info sobre peixe');
    assert.strictEqual(url, 'https://www.fishwatch.gov/api/species');
    assert.doesNotThrow(() => tool.build(''));
  });

  test('parse full response', () => {
    const out = tool.parse([{
      name: 'Atlantic Cod',
      scientific_name: 'Gadus morhua',
      harvest_type: 'Wild',
      habitat: 'Cold waters of the North Atlantic Ocean, from Greenland to North Carolina',
      image_gallery: [{ src: 'https://example.com/cod.jpg' }]
    }]);
    assert.ok(out.includes('Nome: Atlantic Cod'));
    assert.ok(out.includes('Nome cientifico: Gadus morhua'));
    assert.ok(out.includes('Regiao: Wild'));
    assert.ok(out.includes('Habitat:'));
    assert.ok(out.includes('Imagem: https://example.com/cod.jpg'));
  });

  test('parse truncates habitat to 80 chars', () => {
    const longHabitat = 'x'.repeat(120);
    const out = tool.parse([{
      name: 'Long Fish',
      scientific_name: 'Longus fishus',
      harvest_type: 'Wild',
      habitat: longHabitat,
      image_gallery: [{ src: 'https://example.com/x.jpg' }]
    }]);
    const habitatLine = out.split('\n').find(function(l) { return l.startsWith('Habitat: '); });
    assert.strictEqual(habitatLine.length - 'Habitat: '.length, 80);
  });

  test('parse missing fields falls back', () => {
    const out = tool.parse([{ image_gallery: [] }]);
    assert.doesNotThrow(() => tool.parse([{}]));
    assert.ok(out.includes('Nome: Desconhecido'));
    assert.ok(out.includes('Imagem: Indisponivel'));
  });

  test('parse empty array falls back', () => {
    assert.doesNotThrow(() => tool.parse([]));
    assert.strictEqual(tool.parse([]), 'Peixe nao encontrado.');
    assert.strictEqual(tool.parse(null), 'Peixe nao encontrado.');
  });

  test('parse accepts single call with no extra args', () => {
    const out = tool.parse([{
      name: 'Sole',
      scientific_name: 'Solea solea',
      harvest_type: 'Wild',
      habitat: 'Sandy seabeds',
      image_gallery: [{ src: 'https://example.com/sole.jpg' }]
    }]);
    assert.ok(out.includes('Nome: Sole'));
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return [{ name: 'Tuna', scientific_name: 'Thunnus', harvest_type: 'Wild', habitat: 'Open ocean waters', image_gallery: [{ src: 'https://example.com/tuna.jpg' }] }]; } };
    };
    try {
      const url = tool.build('info sobre peixe');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Nome: Tuna'));
      assert.ok(out.includes('Imagem: https://example.com/tuna.jpg'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});