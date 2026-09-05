const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/boredapi.js');

describe('boredapi tool', function () {
  describe('match', function () {
    const cases = [
      'estou entediado',
      'me sugere algo para fazer',
      'bored',
      'sugestao de atividade',
      'o que eu posso fazer hoje'
    ];
    cases.forEach(function (input) {
      it('matches: ' + input, function () {
        assert.ok(tool.match.test(input));
      });
    });

    it('does not match unrelated text', function () {
      assert.ok(!tool.match.test('como esta o tempo hoje'));
    });
  });

  describe('build', function () {
    it('returns exact boredapi URL', function () {
      const url = tool.build('qualquer query');
      assert.strictEqual(url, 'https://www.boredapi.com/api/activity');
    });
  });

  describe('parse', function () {
    it('parses full activity data', function () {
      const result = tool.parse({
        activity: 'Water your plants',
        type: 'relaxation',
        participants: 1,
        price: 0
      });
      assert.ok(result.includes('Water your plants'));
      assert.ok(result.includes('relaxation'));
      assert.ok(result.includes('1'));
      assert.ok(result.includes('Grátis'));
    });

    it('parses non-free activity', function () {
      const result = tool.parse({
        activity: 'Go bowling',
        type: 'sports',
        participants: 2,
        price: 0.5
      });
      assert.ok(result.includes('0.5/5'));
    });

    it('handles empty object', function () {
      const result = tool.parse({});
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });

    it('handles null', function () {
      const result = tool.parse(null);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });

    it('handles undefined', function () {
      const result = tool.parse(undefined);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });
  });

  describe('full fetch flow', function () {
    let originalFetch;

    beforeEach(function () {
      originalFetch = global.fetch;
    });

    afterEach(function () {
      global.fetch = originalFetch;
    });

    it('simulates fetch + parse', async function () {
      global.fetch = async function (url) {
        return {
          json: async function () {
            return {
              activity: 'Build a fort',
              type: 'diy',
              participants: 1,
              price: 0
            };
          }
        };
      };
      const url = tool.build('bored');
      const res = await fetch(url);
      const data = await res.json();
      const result = tool.parse(data);
      assert.ok(result.includes('Build a fort'));
      assert.ok(result.includes('diy'));
      assert.ok(result.includes('1'));
      assert.ok(result.includes('Grátis'));
    });

    it('handles fetch returning empty object', async function () {
      global.fetch = async function () {
        return {
          json: async function () {
            return {};
          }
        };
      };
      const url = tool.build('sugere');
      const res = await fetch(url);
      const data = await res.json();
      const result = tool.parse(data);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });
  });
});
