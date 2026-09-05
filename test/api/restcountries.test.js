const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const tool = require('../../tools/restcountries.js');

describe('restcountries match', () => {
  it('matches "capital do brasil"', () => {
    assert.ok(tool.match.test('capital do brasil'));
  });

  it('matches "info do pais japao"', () => {
    assert.ok(tool.match.test('info do pais japao'));
  });

  it('matches "country france"', () => {
    assert.ok(tool.match.test('country france'));
  });

  it('matches "populacao do pais"', () => {
    assert.ok(tool.match.test('populacao do pais'));
  });

  it('does not match unrelated text', () => {
    assert.ok(!tool.match.test('me mostra um gato'));
    assert.ok(!tool.match.test('como esta o tempo'));
  });
});

describe('restcountries build', () => {
  it('build("brasil") URL contains /name/brasil', () => {
    const url = tool.build('brasil');
    assert.ok(url.includes('/name/brasil'));
  });

  it('build("pais japao") extracts "japao"', () => {
    const url = tool.build('pais japao');
    assert.ok(url.includes('/name/japao'));
  });

  it('build("capital do brasil") extracts "brasil"', () => {
    const url = tool.build('capital do brasil');
    assert.ok(url.includes('/name/brasil'));
  });

  it('build defaults to brazil when no country keyword found', () => {
    const url = tool.build('');
    assert.ok(url.includes('/name/brazil'));
  });

  it('build defaults to brazil on null input', () => {
    const url = tool.build(null);
    assert.ok(url.includes('/name/brazil'));
  });

  it('build encodes special characters', () => {
    const url = tool.build('pais chine');
    assert.ok(url.includes('/name/chine'));
  });
});

describe('restcountries parse', () => {
  const sampleData = [
    {
      name: { common: 'Brazil', official: 'Federative Republic of Brazil' },
      capital: ['Brasília'],
      region: 'Americas',
      population: 213882914,
      flags: { png: 'https://flagcdn.com/br.png' },
      currencies: { BRL: { name: 'Brazilian real' } }
    }
  ];

  it('parse returns string with all fields', () => {
    const result = tool.parse(sampleData);
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('Brazil'));
    assert.ok(result.includes('Brasília'));
    assert.ok(result.includes('Americas'));
    assert.ok(result.includes('213.882.914'));
    assert.ok(result.includes('https://flagcdn.com/br.png'));
    assert.ok(result.includes('Brazilian real'));
  });

  it('parse([]) returns graceful fallback', () => {
    const result = tool.parse([]);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
    assert.ok(!result.includes('undefined'));
  });

  it('parse(null) returns graceful fallback', () => {
    const result = tool.parse(null);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('parse([{}]) returns graceful fallback', () => {
    const result = tool.parse([{}]);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('parse never throws on malformed input', () => {
    assert.doesNotThrow(() => tool.parse(null));
    assert.doesNotThrow(() => tool.parse(undefined));
    assert.doesNotThrow(() => tool.parse(42));
    assert.doesNotThrow(() => tool.parse('string'));
    assert.doesNotThrow(() => tool.parse([null]));
    assert.doesNotThrow(() => tool.parse([{ name: null }]));
  });

  it('parse handles missing optional fields', () => {
    const minimal = [{ name: { common: 'X' } }];
    const result = tool.parse(minimal);
    assert.ok(result.includes('X'));
    assert.ok(result.includes('N/A'));
  });
});

describe('restcountries full fetch flow', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
    global.fetch = async function(url) {
      return {
        ok: true,
        json: async function() {
          return [
            {
              name: { common: 'Brazil' },
              capital: ['Brasília'],
              region: 'Americas',
              population: 213882914,
              flags: { png: 'https://flagcdn.com/br.png' },
              currencies: { BRL: { name: 'Brazilian real' } }
            }
          ];
        }
      };
    };
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('full mocked fetch flow', async () => {
    const url = tool.build('pais brasil');
    const res = await fetch(url);
    assert.ok(res.ok);
    const data = await res.json();
    const result = tool.parse(data);
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('Brazil'));
    assert.ok(result.includes('Brasília'));
    assert.ok(result.includes('Americas'));
    assert.ok(result.includes('213.882.914'));
    assert.ok(result.includes('https://flagcdn.com/br.png'));
  });
});
