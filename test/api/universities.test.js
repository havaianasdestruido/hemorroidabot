const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/universities.js');

describe('universities tool', function () {
  describe('match', function () {
    it('matches buscas varias', function () {
      assert.ok(tool.match.test('busca universidades do brasil'));
      assert.ok(tool.match.test('universidade em alemanha'));
      assert.ok(tool.match.test('faculdade'));
      assert.ok(tool.match.test('university in france'));
    });

    it('does not match unrelated', function () {
      assert.ok(!tool.match.test('receita de bolo'));
      assert.ok(!tool.match.test('pizza'));
    });
  });

  describe('build', function () {
    it('universidade brasil -> country=brazil', function () {
      var url = tool.build('universidade brasil');
      assert.ok(url.includes('country=brazil'), 'expected country=brazil in ' + url);
    });

    it('universidade alemanha -> country=germany', function () {
      var url = tool.build('universidade alemanha');
      assert.ok(url.includes('country=germany'), 'expected country=germany in ' + url);
    });

    it('university in france -> country=france', function () {
      var url = tool.build('university in france');
      assert.ok(url.includes('country=france'), 'expected country=france in ' + url);
    });

    it('default -> country=brazil', function () {
      var url = tool.build('');
      assert.ok(url.includes('country=brazil'), 'expected country=brazil in ' + url);
    });

    it('default null -> country=brazil', function () {
      var url = tool.build(null);
      assert.ok(url.includes('country=brazil'), 'expected country=brazil in ' + url);
    });
  });

  describe('parse', function () {
    it('parses array with web_pages', function () {
      var result = tool.parse([
        { name: 'USP', country: 'Brazil', web_pages: ['https://www.usp.br'], alpha_two_code: 'BR' }
      ]);
      assert.ok(result.includes('USP'));
      assert.ok(result.includes('usp.br'));
    });

    it('parses empty array gracefully', function () {
      var result = tool.parse([]);
      assert.ok(result.includes('Nenhuma universidade'));
    });

    it('parses null gracefully', function () {
      var result = tool.parse(null);
      assert.ok(result.includes('Nenhuma universidade'));
    });

    it('parses object missing web_pages', function () {
      var result = tool.parse([{ name: 'X' }]);
      assert.ok(result.includes('X'));
      assert.ok(result.includes('Sem site'));
    });

    it('limits to 3 results', function () {
      var arr = [
        { name: 'A', web_pages: ['a.com'] },
        { name: 'B', web_pages: ['b.com'] },
        { name: 'C', web_pages: ['c.com'] },
        { name: 'D', web_pages: ['d.com'] }
      ];
      var result = tool.parse(arr);
      assert.ok(result.includes('A'));
      assert.ok(result.includes('C'));
      assert.ok(!result.includes('D'));
    });
  });

  describe('full mocked fetch flow', function () {
    var origFetch;

    beforeEach(function () {
      origFetch = global.fetch;
    });

    afterEach(function () {
      global.fetch = origFetch;
    });

    it('end to end', async function () {
      var mockData = [
        { name: 'UFRJ', country: 'Brazil', web_pages: ['https://ufrj.br'], alpha_two_code: 'BR' },
        { name: 'UFRGS', country: 'Brazil', web_pages: ['https://ufrgs.br'], alpha_two_code: 'BR' }
      ];
      global.fetch = async function (url) {
        return {
          json: async function () {
            return mockData;
          }
        };
      };
      var url = tool.build('universidade brasil');
      var res = await fetch(url);
      var data = await res.json();
      var output = tool.parse(data);
      assert.ok(output.includes('UFRJ'));
      assert.ok(output.includes('ufrj.br'));
      assert.ok(output.includes('UFRGS'));
    });
  });
});
