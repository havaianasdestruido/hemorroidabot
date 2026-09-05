'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { loadScriptFile, PATH } = require('./harness');

let Brain;
let loader;

beforeEach(() => {
  loader = loadScriptFile('./brain.js', { session: 'shared', exposes: ['Brain'] });
  Brain = loader.exposed.Brain;
});

const APIS = {
  'dog-ceo': {
    phrase: 'me mostra um cachorro',
    mock: { status: 'success', message: 'https://images.dog.ceo/xyz.jpg' },
    expect: ['Cachorro: https://images']
  },
  'catfact': {
    phrase: 'fato sobre gatos',
    mock: { fact: 'Cats sleep a lot.' },
    expect: ['Cats sleep']
  },
  'restcountries': {
    phrase: 'info do pais brasil',
    mock: [{ name: { common: 'Brazil' }, capital: ['Brasília'], region: 'Americas', population: 200000000, flags: { png: 'https://flag' } }],
    expect: ['Brazil', 'Brasília']
  },
  'openlibrary': {
    phrase: 'busca livro hobbit',
    mock: { docs: [{ title: 'The Hobbit', author_name: ['J.R.R. Tolkien'], first_publish_year: 1937, key: '/works/OL1W' }] },
    expect: ['Hobbit']
  },
  'jokeapi': {
    phrase: 'conta uma piada',
    mock: { type: 'single', joke: 'Why so serious?', error: false },
    expect: ['Why so serious?']
  },
  'chucknorris': {
    phrase: 'chuck norris',
    mock: { value: 'Chuck Norris does not sleep. He waits.' },
    expect: ['Chuck Norris']
  },
  'frankfurter': {
    phrase: 'converter 10 real em dolar',
    mock: { base: 'BRL', rates: { USD: 0.18 } },
    expect: ['1 BRL = 0.18 USD']
  },
  'numbersapi': {
    phrase: 'fato sobre o numero 7',
    mock: { text: '7 is a fantastic number.', number: 7 },
    expect: ['7 is a fantastic number']
  },
  'ipapico': {
    phrase: 'qual meu ip',
    mock: { ip: '8.8.8.8', city: 'Mountain View', region: 'California', country_name: 'US', latitude: 37.4, longitude: -122.1, timezone: 'America/Los_Angeles' },
    expect: ['8.8.8.8', 'Mountain View']
  },
  'boredapi': {
    phrase: 'me sugere algo para fazer',
    mock: { activity: 'Water your plants', type: 'relaxation', participants: 1, price: 0 },
    expect: ['Water your plants']
  },
  'agify': {
    phrase: 'qual a idade do jose',
    mock: { name: 'jose', age: 40, count: 1000 },
    expect: ['40']
  },
  'genderize': {
    phrase: 'o nome lucas e masculino ou feminino',
    mock: { name: 'lucas', gender: 'male', probability: 0.98, count: 500 },
    expect: ['masculino']
  },
  'universities': {
    phrase: 'busca universidades do brasil',
    mock: [{ name: 'USP', country: 'Brazil', web_pages: ['https://www.usp.br'], alpha_two_code: 'BR' }],
    expect: ['USP']
  },
  'deezer': {
    phrase: 'busca deezer queen bohemian',
    mock: { data: [{ title: 'Bohemian Rhapsody', artist: { name: 'Queen' }, album: { title: 'A Night at the Opera' }, duration: 354, preview: 'https://x.mp3' }] },
    expect: ['Queen', 'Bohemian Rhapsody']
  }
};

async function withFetch(mockFn, run) {
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = mockFn;
  try { return await run(); } finally { loader.ctx.fetch = orig; }
}

describe('central merge: tools/*.js <-> Brain.EXTERNAL_TOOLS', () => {
  for (const name of Object.keys(APIS)) {
    const api = APIS[name];
    test(name + ': source module and Brain entry agree', () => {
      const src = require(path.join(__dirname, '..', 'tools', name + '.js'));
      const entry = Brain.EXTERNAL_TOOLS[name];
      assert.ok(entry, 'Brain.EXTERNAL_TOOLS missing key "' + name + '"');
      assert.strictEqual(entry.desc, src.desc, name + ': desc divergiu do source');
      assert.strictEqual(entry.build(api.phrase, {}), src.build(api.phrase, {}), name + ': build divergiu do source');
      assert.strictEqual(entry.parse(api.mock), src.parse(api.mock), name + ': parse divergiu do source');
    });

    test(name + ': intentExternal roteia para "' + name + '"', () => {
      assert.strictEqual(Brain.intentExternal(api.phrase), name);
    });

    test(name + ': runExternal e2e com fetch mockado', async () => {
      let captured = '';
      const out = await withFetch((u) => {
        captured = String(u);
        return Promise.resolve({ ok: true, json: () => Promise.resolve(api.mock) });
      }, () => Brain.runExternal(name, api.phrase, {}));
      assert.strictEqual(captured, Brain.EXTERNAL_TOOLS[name].build(api.phrase, {}), name + ': URL capturada != build()');
      for (const expected of api.expect) {
        assert.ok(out.indexOf(expected) !== -1, name + ': saida sem "' + expected + '" -> ' + out);
      }
    });
  }
});

describe('central merge: integridade do registro', () => {
  test('todos os keys tools/*.js estao em EXTERNAL_TOOLS', () => {
    const fs = require('node:fs');
    const files = fs.readdirSync(path.join(__dirname, '..', 'tools')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
    const missing = files.filter((f) => !Brain.EXTERNAL_TOOLS[f]);
    assert.deepEqual(missing, [], 'ferramentas ausentes de EXTERNAL_TOOLS: ' + missing.join(', '));
  });

  test('novas tools nao quebraram as 5 originais', () => {
    assert.strictEqual(Brain.intentExternal('clima em sao paulo'), 'open-meteo');
    assert.strictEqual(Brain.intentExternal('quem foi einstein wikipedia'), 'wikipedia');
    assert.strictEqual(Brain.intentExternal('musica do pink floyd'), 'itunes');
    assert.strictEqual(Brain.intentExternal('info pokemon charizard'), 'pokemon');
    assert.strictEqual(Brain.intentExternal('instala lodash npm'), 'npm');
    assert.strictEqual(Brain.intentExternal('bom dia tudo bem'), null);
  });
});