'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScriptFile } = require('./harness');

let Brain;
let loader;

beforeEach(() => {
  loader = loadScriptFile('./brain.js', { session: 'shared', exposes: ['Brain'] });
  Brain = loader.exposed.Brain;
});

test('Brain expoe API esperada', () => {
  assert.ok(Brain, 'Brain nao definido');
  for (const k of ['loadHistory','getMemory','clearMemory','addMessage','recentMemory','intentLocal','intentExternal','runLocal','runExternal','LOCAL_TOOLS','EXTERNAL_TOOLS','exampleFor']) {
    assert.ok(typeof Brain[k] !== 'undefined', 'falta ' + k);
  }
});

test('memoria: addMessage/loadHistory persistem', () => {
  Brain.loadHistory();
  Brain.addMessage('user', 'ola');
  Brain.addMessage('assistant', 'oi');
  assert.strictEqual(Brain.getMemory().map(m => m.role).join(','), 'user,assistant');
  // recarrega do mesmo localStorage (mesma sessao)
  const reload = loadScriptFile('./brain.js', { session: 'shared', exposes: ['Brain'] });
  const reloadBrain = reload.exposed.Brain;
  reloadBrain.loadHistory();
  assert.strictEqual(reloadBrain.getMemory().length, 2);
  assert.strictEqual(reloadBrain.getMemory()[1].content, 'oi');
  reloadBrain.clearMemory();
  assert.strictEqual(reloadBrain.getMemory().length, 0);
});

test('memoria limita a 40 entradas', () => {
  for (let i = 0; i < 50; i++) Brain.addMessage('user', 'm' + i);
  assert.ok(Brain.getMemory().length <= 40);
});

test('intentLocal detecta calculadora e outras', () => {
  assert.strictEqual(Brain.intentLocal('quanto e 2+2?'), 'calculator');
  assert.strictEqual(Brain.intentLocal('gerar uuid'), 'uuid');
  assert.strictEqual(Brain.intentLocal('que horas e'), 'timestamp');
  assert.strictEqual(Brain.intentLocal('formata esse json'), 'json-formatter');
  assert.strictEqual(Brain.intentLocal('me ajuda com outra coisa'), null);
});

test('runLocal: calculadora', () => {
  assert.strictEqual(Brain.runLocal('calculator', '2 + 3 * 4'), '14');
  assert.strictEqual(Brain.runLocal('calculator', 'abc'), 'Expressao vazia');
});

test('runLocal: base64 roundtrip', () => {
  const enc = Brain.runLocal('base64', 'codificar hello');
  const token = enc.split(': ')[1].trim();
  assert.strictEqual(Brain.runLocal('base64', 'decodificar ' + token), 'Decodificado: hello');
});

test('runLocal: json formatter', () => {
  const out = Brain.runLocal('json-formatter', 'formatar {"a":1}');
  assert.strictEqual(out, JSON.stringify({ a: 1 }, null, 2));
});

test('runLocal: color converter hex', () => {
  const out = Brain.runLocal('color-converter', '#ff5500');
  assert.match(out, /RGB: 255, 85, 0/);
});

test('runLocal: uuid e timestamp', () => {
  const u = Brain.runLocal('uuid', 'gerar uuid').trim();
  assert.match(u, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  const ts = Brain.runLocal('timestamp', 'que horas e');
  assert.match(ts, /Unix:/);
  assert.match(ts, /ISO:/);
});

test('intentExternal detecta APIs', () => {
  assert.strictEqual(Brain.intentExternal('clima em sao paulo'), 'open-meteo');
  assert.strictEqual(Brain.intentExternal('quem foi einstein wikipedia'), 'wikipedia');
  assert.strictEqual(Brain.intentExternal('musica do pink floyd'), 'itunes');
  assert.strictEqual(Brain.intentExternal('info pokemon charizard'), 'pokemon');
  assert.strictEqual(Brain.intentExternal('instala lodash npm'), 'npm');
  assert.strictEqual(Brain.intentExternal('bom dia tudo bem'), null);
});

test('runExternal wikipedia usa fetch e parseia', async () => {
  const calls = [];
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = (url) => {
    calls.push(String(url));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ title: 'Brasil', extract: 'Brasil e um pais.\nSegunda linha.\nTerceira linha.' })
    });
  };
  try {
    const out = await Brain.runExternal('wikipedia', 'wikipedia brasil', {});
    assert.match(out, /Brasil/);
    assert.match(out, /Segunda linha/);
    assert.ok(calls[0].includes('wikipedia.org'));
  } finally {
    loader.ctx.fetch = orig;
  }
});

test('runExternal npm parseia metadata', async () => {
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ name: 'lodash', 'dist-tags': { latest: '4.17.21' }, description: 'Modern utilities' })
  });
  try {
    const out = await Brain.runExternal('npm', 'info npm lodash', {});
    assert.match(out, /lodash@4\.17\.21/);
    assert.match(out, /Modern utilities/);
  } finally {
    loader.ctx.fetch = orig;
  }
});

test('runExternal pokemon parseia', async () => {
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ name: 'pikachu', height: 4, weight: 60, types: [{ type: { name: 'electric' } }] })
  });
  try {
    const out = await Brain.runExternal('pokemon', 'pokemon pikachu', {});
    assert.match(out, /Pikachu/);
    assert.match(out, /electric/);
    assert.match(out, /0\.4m/);
  } finally {
    loader.ctx.fetch = orig;
  }
});

test('runExternal constroi open-meteo com coords', async () => {
  const orig = loader.ctx.fetch;
  let urlCaptured = '';
  loader.ctx.fetch = (url) => {
    urlCaptured = String(url);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ current_weather: { temperature: 22.5, windspeed: 10, time: '2026-01-01T12:00' } })
    });
  };
  try {
    const out = await Brain.runExternal('open-meteo', 'clima', { coords: { lat: -23.55, lon: -46.63 } });
    assert.match(urlCaptured, /latitude=-23\.55/);
    assert.match(urlCaptured, /longitude=-46\.63/);
    assert.match(out, /22\.5°C/);
  } finally {
    loader.ctx.fetch = orig;
  }
});

test('runExternal trata erro de rede sem lancar', async () => {
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = () => Promise.reject(new Error('offline'));
  try {
    const out = await Brain.runExternal('wikipedia', 'teste', {});
    assert.match(out, /Erro ao consultar/);
  } finally {
    loader.ctx.fetch = orig;
  }
});

test('memory max context e recentMemory', () => {
  for (let i = 0; i < 20; i++) Brain.addMessage('user', 'u' + i);
  const r = Brain.recentMemory(3);
  assert.strictEqual(r.length, 6); // 3 turnos * 2
  assert.strictEqual(r[r.length - 1].content, 'u19');
});

test('exampleFor retorna exemplos', () => {
  assert.strictEqual(Brain.exampleFor('calculator'), '2 + 3 * 4');
  assert.strictEqual(Brain.exampleFor('color-converter'), '#ff5500');
});
