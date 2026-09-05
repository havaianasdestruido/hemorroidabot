var test = require('node:test');
var assert = require('node:assert/strict');
var tool = require('../../tools/chucknorris.js');

test('match - piada do chuck norris', function () {
  assert.ok(tool.match.test('piada do chuck norris'));
});

test('match - chuck norris', function () {
  assert.ok(tool.match.test('chuck norris'));
});

test('match - fato do chuck', function () {
  assert.ok(tool.match.test('fato do chuck'));
});

test('build - random URL', function () {
  assert.equal(tool.build('chuck norris'), 'https://api.chucknorris.io/jokes/random');
});

test('build - search URL', function () {
  var url = tool.build('chuck norris sobre database');
  assert.ok(url.includes('search?query='));
  assert.ok(url.includes('database'));
});

test('parse - single value', function () {
  var result = tool.parse({ value: 'Chuck Norris can divide by zero.' });
  assert.ok(result.includes('divide'));
});

test('parse - search result array', function () {
  var result = tool.parse({ result: [{ value: 'A' }, { value: 'B' }] });
  assert.ok(result.includes('A'));
});

test('parse - empty object fallback', function () {
  var result = tool.parse({});
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
});

test('parse - null fallback', function () {
  var result = tool.parse(null);
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
});

test('full mocked fetch flow - random', async function () {
  var origFetch = global.fetch;
  global.fetch = async function () {
    return { json: async function () { return { value: 'Mocked Chuck fact.' }; } };
  };
  var url = tool.build('chuck');
  var resp = await global.fetch(url);
  var data = await resp.json();
  var parsed = tool.parse(data);
  assert.ok(parsed.includes('Mocked'));
  global.fetch = origFetch;
});

test('full mocked fetch flow - search', async function () {
  var origFetch = global.fetch;
  global.fetch = async function (u) {
    assert.ok(u.includes('search?query='));
    return { json: async function () { return { result: [{ value: 'Found one' }, { value: 'Found two' }] }; } };
  };
  var url = tool.build('chuck norris sobre python');
  var resp = await global.fetch(url);
  var data = await resp.json();
  var parsed = tool.parse(data);
  assert.ok(parsed.includes('Found one'));
  global.fetch = origFetch;
});
