'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/quran');

describe('quran tool', () => {
  test('match detects quran queries', () => {
    assert.ok(tool.match.test('versiculo do corao'));
    assert.ok(tool.match.test('me fala um versiculo do corao'));
    assert.ok(tool.match.test('surata do dia'));
    assert.ok(tool.match.test('alcorao para mim'));
  });

  test('match does not collide with weather tools', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
    assert.strictEqual(tool.match.test('tempo agora em sao paulo'), false);
    assert.strictEqual(tool.match.test('wttr em tokyo'), false);
  });

  test('build returns fixed alquran url', () => {
    const url = tool.build('versiculo do corao');
    assert.strictEqual(url, 'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,pt-br');
    assert.ok(url.includes('api.alquran.cloud'));
  });

  test('build never throws', () => {
    assert.doesNotThrow(() => tool.build());
  });

  test('parse prefers pt edition', () => {
    const out = tool.parse({
      data: {
        editions: [
          { edition: { identifier: 'quran-uthmani', name: 'Corano (Hafs)', language: 'ar' }, number: 1, numberInSurah: 1, surah: { number: 1 }, text: '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650' },
          { edition: { identifier: 'quran-pt-br', name: 'Portugu\u00eas', language: 'pt' }, number: 1, numberInSurah: 1, surah: { number: 1 }, text: 'Em nome de Deus' }
        ]
      }
    });
    assert.ok(out.includes('Surah 1:1 (quran-pt-br)'));
    assert.ok(out.includes('Em nome de Deus'));
  });

  test('parse falls back to first edition when no pt edition', () => {
    const out = tool.parse({
      data: {
        editions: [
          { edition: { identifier: 'quran-uthmani', name: 'Corano (Hafs)', language: 'ar' }, number: 2, numberInSurah: 2, text: '\u0627\u0644\u062d\u064e\u0645\u0652\u062f\u064f' }
        ]
      }
    });
    assert.ok(out.includes('quran-uthmani'));
    assert.ok(out.includes('Surah ?:2'));
  });

  test('parse missing data falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Sem versiculo do Corao agora.');
  });

  test('parse malformed editions falls back', () => {
    assert.doesNotThrow(() => tool.parse({ data: { editions: [] } }));
    assert.strictEqual(tool.parse({ data: { editions: [] } }), 'Sem versiculo do Corao agora.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return {
            data: {
              editions: [
                { edition: { identifier: 'quran-pt-br', name: 'Portugu\u00eas', language: 'pt' }, number: 255, numberInSurah: 255, surah: { number: 2 }, text: 'Deus, nao ha outra divindade alem dEle' }
              ]
            }
          };
        }
      };
    };
    try {
      const url = tool.build('versiculo do corao');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Surah 2:255'));
      assert.ok(out.includes('quran-pt-br'));
      assert.ok(out.includes('Deus'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});