const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const tool = require('../../tools/dog-ceo.js');

describe('dog-ceo tool', () => {
  it('match is RegExp', () => {
    assert.ok(tool.match instanceof RegExp);
  });

  it('matches "foto de cachorro"', () => {
    assert.ok(tool.match.test('foto de cachorro'));
  });

  it('matches "me mostra um dog"', () => {
    assert.ok(tool.match.test('me mostra um dog'));
  });

  it('matches "imagem de cao" (com acento)', () => {
    assert.ok(tool.match.test('imagem de cao'));
  });

  it('matches "imagem de cão" (com acento)', () => {
    assert.ok(tool.match.test('imagem de cão'));
  });

  it('matches "dog photo"', () => {
    assert.ok(tool.match.test('dog photo'));
  });

  it('build returns exact dog.ceo random URL', () => {
    assert.equal(tool.build('qualquer coisa'), 'https://dog.ceo/api/breeds/image/random');
  });

  it('build ignores query parameter', () => {
    assert.equal(tool.build(''), 'https://dog.ceo/api/breeds/image/random');
    assert.equal(tool.build(null), 'https://dog.ceo/api/breeds/image/random');
    assert.equal(tool.build(123), 'https://dog.ceo/api/breeds/image/random');
  });

  it('parse returns string with URL on success', () => {
    const result = tool.parse({ status: 'success', message: 'https://x/y.jpg' });
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('https://x/y.jpg'));
  });

  it('parse on null returns graceful fallback', () => {
    const result = tool.parse(null);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('parse on empty object returns graceful fallback', () => {
    const result = tool.parse({});
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('parse on {status:"error"} returns graceful fallback', () => {
    const result = tool.parse({ status: 'error' });
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('parse never throws on malformed input', () => {
    assert.doesNotThrow(() => tool.parse(null));
    assert.doesNotThrow(() => tool.parse(undefined));
    assert.doesNotThrow(() => tool.parse(42));
    assert.doesNotThrow(() => tool.parse('string'));
    assert.doesNotThrow(() => tool.parse({ status: 'error', message: 'no' }));
  });
});

describe('dog-ceo full fetch flow', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
    global.fetch = async function(url) {
      return {
        json: async function() {
          return { status: 'success', message: 'https://example.com/dog.jpg' };
        }
      };
    };
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('full mocked fetch flow', async () => {
    const url = tool.build('me mostra um dog');
    const res = await fetch(url);
    const data = await res.json();
    const result = tool.parse(data);
    assert.equal(typeof result, 'string');
    assert.ok(result.includes('https://example.com/dog.jpg'));
  });
});
