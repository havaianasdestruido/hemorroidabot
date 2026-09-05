const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/agify.js');

describe('agify tool', function () {
  describe('match', function () {
    const cases = [
      'qual a idade do jose',
      'quantos anos tem maria',
      'age of john',
      'idade do nome pedro'
    ];
    cases.forEach(function (input) {
      it('matches: ' + input, function () {
        assert.ok(tool.match.test(input));
      });
    });

    it('does not match unrelated text', function () {
      assert.ok(!tool.match.test('qual e a capital da franca'));
    });
  });

  describe('build', function () {
    it('extracts name from "idade do jose"', function () {
      var url = tool.build('idade do jose');
      assert.ok(url.includes('name=jose'));
    });

    it('extracts name from "quantos anos tem maria"', function () {
      var url = tool.build('quantos anos tem maria');
      assert.ok(url.includes('name=maria'));
    });

    it('defaults to michael when no name found', function () {
      var url = tool.build('agify');
      assert.ok(url.includes('name=michael'));
    });

    it('returns agify api base url', function () {
      var url = tool.build('idade do jose');
      assert.ok(url.startsWith('https://api.agify.io/'));
    });
  });

  describe('parse', function () {
    it('parses full data', function () {
      var result = tool.parse({ name: 'jose', age: 40, count: 1000 });
      assert.ok(result.includes('jose'));
      assert.ok(result.includes('40'));
      assert.ok(result.includes('1000'));
    });

    it('handles null age gracefully', function () {
      var result = tool.parse({ name: 'x', age: null });
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });

    it('handles null input', function () {
      var result = tool.parse(null);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });

    it('handles undefined input', function () {
      var result = tool.parse(undefined);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });

    it('handles empty object', function () {
      var result = tool.parse({});
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
            return { name: 'jose', age: 35, count: 500 };
          }
        };
      };
      var url = tool.build('idade do jose');
      var res = await fetch(url);
      var data = await res.json();
      var result = tool.parse(data);
      assert.ok(result.includes('jose'));
      assert.ok(result.includes('35'));
    });

    it('handles fetch returning null age', async function () {
      global.fetch = async function () {
        return {
          json: async function () {
            return { name: 'zzz', age: null, count: 0 };
          }
        };
      };
      var url = tool.build('idade do zzz');
      var res = await fetch(url);
      var data = await res.json();
      var result = tool.parse(data);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
    });
  });
});
