'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/wttr');

describe('wttr tool', () => {
  test('match detects wttr queries', () => {
    assert.ok(tool.match.test('wttr em sao paulo'));
    assert.ok(tool.match.test('clima completo do rio'));
    assert.ok(tool.match.test('tempo agora em salvador'));
    assert.ok(tool.match.test('weather json para tokyo'));
  });

  test('match does not collide with open-meteo', () => {
    assert.strictEqual(tool.match.test('clima agora'), false);
  });

  test('build uses city', () => {
    const url = tool.build('wttr em sao paulo');
    assert.ok(url.includes('wttr.in'));
    assert.ok(url.includes('Sao%20Paulo') || url.includes('sao%20paulo'));
  });

  test('build uses coords', () => {
    const url = tool.build('', { coords: { lat: -23, lon: -46 } });
    assert.ok(url.includes('-23%2C-46') || url.includes('-23,-46'));
  });

  test('parse full response', () => {
    const out = tool.parse({
      current_condition: [{ temp_C: '25', FeelsLikeC: '27', weatherDesc: [{ value: 'Ensolarado' }], humidity: '60', windspeedKmph: '10' }],
      nearest_area: [{ areaName: [{ value: 'Sao Paulo' }], country: [{ value: 'Brazil' }] }]
    });
    assert.ok(out.includes('Atual'));
    assert.ok(out.includes('Clima em'));
    assert.ok(out.includes('Sao Paulo'));
  });

  test('parse missing current_condition falls back', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Sem dados de clima.');
  });

  test('parse missing weatherDesc falls back', () => {
    assert.doesNotThrow(() => tool.parse({ current_condition: [{}] }));
    assert.ok(tool.parse({ current_condition: [{}] }).includes('desconhecido'));
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return { ok: true, json: async function() { return { current_condition: [{ temp_C: '19', FeelsLikeC: '18', weatherDesc: [{ value: 'Nublado' }], humidity: '70', windspeedKmph: '12' }], nearest_area: [{ areaName: [{ value: 'Curitiba' }], country: [{ value: 'Brazil' }] }] }; } };
    };
    try {
      const url = tool.build('tempo agora em curitiba');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('Curitiba'));
      assert.ok(out.includes('Nublado'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
