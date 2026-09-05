const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const tool = require('../../tools/frankfurter.js');

describe('match', () => {
  it('is a RegExp', () => {
    assert.ok(tool.match instanceof RegExp);
  });
  it('matches "10 usd em brl"', () => {
    assert.ok(tool.match.test('10 usd em brl'));
  });
  it('matches "cotacao do dolar"', () => {
    assert.ok(tool.match.test('cotacao do dolar'));
  });
  it('matches "converter 50 eur"', () => {
    assert.ok(tool.match.test('converter 50 eur'));
  });
  it('matches "quanto vale 1 dollar"', () => {
    assert.ok(tool.match.test('quanto vale 1 dollar'));
  });
});

describe('build', () => {
  it('builds URL with base=USD and symbols=BRL from "10 usd em brl"', () => {
    const url = tool.build('10 usd em brl');
    assert.ok(url.includes('base=USD'));
    assert.ok(url.includes('symbols=BRL'));
  });
  it('falls back to defaults when no parseable currency', () => {
    const url = tool.build('olá mundo');
    assert.ok(url.includes('base=USD'));
    assert.ok(url.includes('symbols=BRL'));
  });
  it('handles eur to brl', () => {
    const url = tool.build('converter 50 eur para brl');
    assert.ok(url.includes('base=EUR'));
    assert.ok(url.includes('symbols=BRL'));
  });
  it('handles null/undefined query gracefully', () => {
    const url = tool.build(null);
    assert.ok(url.includes('base=USD'));
    assert.ok(url.includes('symbols=BRL'));
  });
  it('handles state being undefined', () => {
    const url = tool.build('10 usd em brl', undefined);
    assert.ok(url.includes('base=USD'));
    assert.ok(url.includes('symbols=BRL'));
  });
});

describe('parse', () => {
  it('returns string with rate and currency', () => {
    const result = tool.parse({ base: 'USD', rates: { BRL: 5.4 }, date: '2026-01-01' });
    assert.ok(result.includes('5.4'));
    assert.ok(result.includes('BRL'));
  });
  it('returns fallback for null', () => {
    const result = tool.parse(null);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });
  it('returns fallback for empty object', () => {
    const result = tool.parse({});
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });
  it('does not throw on malformed data', () => {
    assert.doesNotThrow(() => tool.parse(undefined));
    assert.doesNotThrow(() => tool.parse(42));
    assert.doesNotThrow(() => tool.parse('string'));
  });
  it('handles rates object with multiple currencies', () => {
    const result = tool.parse({ base: 'USD', rates: { BRL: 5.4, EUR: 0.92 } });
    assert.ok(result.includes('5.4'));
    assert.ok(result.includes('BRL'));
    assert.ok(result.includes('0.92'));
    assert.ok(result.includes('EUR'));
  });
});

describe('full runExternal-style', () => {
  let origFetch;
  beforeEach(() => {
    origFetch = global.fetch;
    global.fetch = async () => ({
      json: async () => ({ base: 'USD', amount: 1, rates: { BRL: 5.4 } })
    });
  });
  afterEach(() => {
    global.fetch = origFetch;
  });
  it('fetch then parse', async () => {
    const url = tool.build('10 usd em brl');
    const res = await fetch(url);
    const data = await res.json();
    const result = tool.parse(data);
    assert.ok(result.includes('5.4'));
    assert.ok(result.includes('BRL'));
    assert.ok(result.includes('USD'));
  });
  it('gracefully handles fetch returning bad data', async () => {
    global.fetch = async () => ({
      json: async () => null
    });
    const url = tool.build('cotacao do dolar');
    const res = await fetch(url);
    const data = await res.json();
    const result = tool.parse(data);
    assert.equal(typeof result, 'string');
  });
});
