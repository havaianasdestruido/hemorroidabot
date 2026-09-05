var test = require('node:test');
var assert = require('node:assert/strict');
var tool = require('../../tools/ipapico.js');

test('match detects relevant queries', function() {
  assert.ok(tool.match.test('qual meu ip'));
  assert.ok(tool.match.test('meu ip publico'));
  assert.ok(tool.match.test('what is my ip'));
  assert.ok(tool.match.test('geolocalizacao'));
  assert.ok(tool.match.test('localizacao de ip'));
  assert.ok(!tool.match.test('rotas'));
});

test('build returns base URL for no IP', function() {
  assert.equal(tool.build('meu ip'), 'https://ipapi.co/json/');
  assert.equal(tool.build('what is my ip'), 'https://ipapi.co/json/');
});

test('build returns IP-specific URL', function() {
  assert.ok(tool.build('ip 8.8.8.8').includes('8.8.8.8'));
  assert.equal(tool.build('ip 8.8.8.8'), 'https://ipapi.co/8.8.8.8/json/');
});

test('parse formats full data', function() {
  var out = tool.parse({
    ip: '8.8.8.8',
    city: 'Mountain View',
    region: 'California',
    country_name: 'US',
    latitude: 37.4,
    longitude: -122.1,
    timezone: 'America/Los_Angeles'
  });
  assert.ok(out.includes('8.8.8.8'));
  assert.ok(out.includes('Mountain View'));
  assert.ok(out.includes('America/Los_Angeles'));
  assert.ok(out.includes('California'));
  assert.ok(out.includes('37.4'));
  assert.ok(out.includes('-122.1'));
});

test('parse handles null gracefully', function() {
  assert.ok(tool.parse(null));
});

test('parse handles empty object gracefully', function() {
  var out = tool.parse({});
  assert.ok(out.includes('-'));
});

test('full mocked fetch flow', async function() {
  var originalFetch = global.fetch;
  global.fetch = function(url) {
    return Promise.resolve({
      json: function() {
        return Promise.resolve({
          ip: '1.2.3.4',
          city: 'Testville',
          region: 'Testland',
          country_name: 'Testia',
          latitude: 10.0,
          longitude: 20.0,
          timezone: 'UTC'
        });
      }
    });
  };
  var res = await fetch(tool.build('meu ip'));
  var data = await res.json();
  var out = tool.parse(data);
  assert.ok(out.includes('1.2.3.4'));
  assert.ok(out.includes('Testville'));
  assert.ok(out.includes('UTC'));
  global.fetch = originalFetch;
});
