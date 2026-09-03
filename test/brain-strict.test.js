'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScriptFile } = require('./harness');

let Brain;
let loader;

function fresh() {
  loader = loadScriptFile('./brain.js', { session: 'shared', exposes: ['Brain'] });
  Brain = loader.exposed.Brain;
  Brain.loadHistory();
  Brain.clearMemory();
}

beforeEach(() => { fresh(); });

test('intentLocal: case-insensitive com acentos', () => {
  assert.strictEqual(Brain.intentLocal('QUANTO É 2+2'), 'calculator');
  assert.strictEqual(Brain.intentLocal('quanto é 2+2'), 'calculator');
  assert.strictEqual(Brain.intentLocal('quanto É 2+2'), 'calculator');
});

test('intentLocal: acentos em varias ferramentas', () => {
  assert.strictEqual(Brain.intentLocal('quantas palavras tem'), 'text-counter');
  assert.strictEqual(Brain.intentLocal('qual é a cor do #ff5500'), 'color-converter');
  assert.strictEqual(Brain.intentLocal('quando foi a data da série unix, que horas anda'), 'timestamp');
});

test('intentLocal: whitespace-heavy input', () => {
  assert.strictEqual(Brain.intentLocal('   quanto   é   2+2   '), 'calculator');
  assert.strictEqual(Brain.intentLocal('\t\n formatar json \n\t'), 'json-formatter');
});

test('intentLocal: empty e punctuation-only -> null', () => {
  assert.strictEqual(Brain.intentLocal(''), null);
  assert.strictEqual(Brain.intentLocal('   '), null);
  assert.strictEqual(Brain.intentLocal('!!! ??? ...'), null);
  assert.strictEqual(Brain.intentLocal(',.;:'), null);
});

test('intentLocal: prioridade formata esse json', () => {
  assert.strictEqual(Brain.intentLocal('formata esse json'), 'json-formatter');
  assert.strictEqual(Brain.intentLocal('formata esse json com varias cores #ff5500'), 'json-formatter');
});

test('calculator: rejeita injecao', () => {
  for (const inj of ['2); process.exit(1)', "require('fs')", '__proto__', 'constructor.constructor', 'process', 'global.process']) {
    assert.doesNotThrow(() => Brain.runLocal('calculator', inj), 'injection threw: ' + inj);
    const out = Brain.runLocal('calculator', inj);
    assert.ok(out === 'Expressao invalida' || out === 'Expressao vazia', 'injection result nao-graceful: ' + inj + ' -> ' + out);
  }
});

test('calculator: divisao por zero', () => {
  const r = Brain.runLocal('calculator', '1/0');
  assert.strictEqual(r, 'Infinity');
  const rn = Brain.runLocal('calculator', '0/0');
  assert.ok(rn === 'NaN', '0/0 deveria ser NaN, foi ' + rn);
});

test('calculator: decimal/negativo/parenteses', () => {
  assert.strictEqual(Brain.runLocal('calculator', '2.5 + 1.5'), '4');
  assert.strictEqual(Brain.runLocal('calculator', '(2 + 3) * 4'), '20');
  assert.strictEqual(Brain.runLocal('calculator', '-5 + 10'), '5');
  assert.strictEqual(Brain.runLocal('calculator', '10/4'), '2.5');
});

test('calculator: empty e whitespace-only', () => {
  assert.strictEqual(Brain.runLocal('calculator', ''), 'Expressao vazia');
  assert.strictEqual(Brain.runLocal('calculator', '   '), 'Expressao vazia');
  assert.strictEqual(Brain.runLocal('calculator', '\t\n'), 'Expressao vazia');
});

test('calculator: letras nao-ASCII removidas', () => {
  const out = Brain.runLocal('calculator', 'olá 2+2 ção');
  assert.strictEqual(out, '4');
});

test('calculator: expressao longa (5000 chars)', () => {
  const long = '1+'.repeat(2500) + '1';
  assert.doesNotThrow(() => { Brain.runLocal('calculator', long); });
});

test('calculator: expressao longa nao trava e eh finita', () => {
  const long = '1+'.repeat(2500) + '1';
  const r = Brain.runLocal('calculator', long);
  assert.strictEqual(typeof r, 'string');
});

test('base64: decode de base64 invalido nao lancsa', () => {
  assert.doesNotThrow(() => Brain.runLocal('base64', 'decodificar $$$'));
  const r = Brain.runLocal('base64', 'decodificar $$$');
  assert.strictEqual(typeof r, 'string');
});

test('base64: empty input', () => {
  assert.doesNotThrow(() => Brain.runLocal('base64', ''));
  assert.strictEqual(typeof Brain.runLocal('base64', ''), 'string');
});

test('base64: token valido com espacos/newlines', () => {
  assert.doesNotThrow(() => Brain.runLocal('base64', 'decodificar aGVsbG8= \n extra'));
  assert.strictEqual(typeof Brain.runLocal('base64', 'decodificar aGVsbG8= \n extra'), 'string');
});

test('base64: mixed case roundtrip', () => {
  const enc = Brain.runLocal('base64', 'codificar HelloWorld');
  assert.match(enc, /^Base64: /);
  const token = enc.split(': ')[1].trim();
  assert.strictEqual(Brain.runLocal('base64', 'decodificar ' + token), 'Decodificado: HelloWorld');
});

test('base64: unicode latin1 (olá) codifica sem lançar', () => {
  const r = Brain.runLocal('base64', 'codificar olá mundo');
  assert.doesNotThrow(() => Brain.runLocal('base64', 'codificar olá mundo'));
  assert.match(r, /^Base64: /);
});

test('base64: unicode fora de latin1 -> Erro', () => {
  const r = Brain.runLocal('base64', 'codificar olá 🎉 mundo');
  assert.strictEqual(r, 'Erro');
});

test('json-formatter: JSON invalido', () => {
  assert.strictEqual(Brain.runLocal('json-formatter', '{a:1}'), 'JSON invalido');
  assert.strictEqual(Brain.runLocal('json-formatter', '[1,2'), 'JSON invalido');
  assert.strictEqual(Brain.runLocal('json-formatter', ''), 'JSON invalido');
});

test('json-formatter: null literal', () => {
  assert.strictEqual(Brain.runLocal('json-formatter', 'null'), 'null');
});

test('json-formatter: JSON profundamente aninhado', () => {
  let deep = '{';
  for (let i = 0; i < 200; i++) deep += '"k' + i + '":{';
  deep += '"leaf":1' + '}'.repeat(201);
  const out = Brain.runLocal('json-formatter', 'formatar ' + deep);
  assert.strictEqual(typeof out, 'string');
  assert.doesNotThrow(() => JSON.parse(out));
});

test('json-formatter: JSON com unicode', () => {
  const out = Brain.runLocal('json-formatter', 'formatar {"nome":"olá mundo","emoji":"🎉"}');
  assert.match(out, /olá mundo/);
});

test('color-converter: hex de 3 digitos nao suportado', () => {
  const r = Brain.runLocal('color-converter', 'cor #fff');
  assert.match(r, /Forneca HEX/);
});

test('color-converter: sem hex no texto', () => {
  const r = Brain.runLocal('color-converter', 'qual a cor de hoje');
  assert.match(r, /Forneca HEX/);
});

test('color-converter: pega primeiro de varios hexes', () => {
  const r = Brain.runLocal('color-converter', 'cores #ff5500 e #00ff00');
  assert.match(r, /255, 85, 0/);
  assert.match(r, /#FF5500/);
});

test('color-converter: lixo nao-hex', () => {
  assert.match(Brain.runLocal('color-converter', 'zzz'), /Forneca HEX/);
});

test('uuid: formato, versao 4, variant, dois diferem', () => {
  const u1 = Brain.runLocal('uuid', 'gerar uuid').trim();
  const m = u1.match(/^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f]{4})-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.ok(m, 'formato uuid invalido: ' + u1);
  assert.strictEqual(m[1][0], '4', 'versao nibble != 4');
  const fourth = u1.split('-')[3];
  assert.ok(/^[89ab]/.test(fourth), 'variant invalido: ' + fourth);
  const u2 = Brain.runLocal('uuid', 'gerar uuid').trim();
  assert.notStrictEqual(u1, u2);
});

test('text-counter: empty', () => {
  const r = Brain.runLocal('text-counter', 'contar');
  assert.match(r, /Caracteres: 0/);
  assert.match(r, /Palavras: 0/);
});

test('text-counter: palavra unica', () => {
  const r = Brain.runLocal('text-counter', 'contar hello');
  assert.match(r, /Caracteres: 5/);
  assert.match(r, /Palavras: 1/);
});

test('text-counter: espacos inicial/final estaveis', () => {
  const a = Brain.runLocal('text-counter', 'contar   hello world   ');
  const b = Brain.runLocal('text-counter', 'contar hello world');
  assert.strictEqual(a, b);
});

test('timestamp: unix nao decresce e ISO parseavel', () => {
  const t1 = Brain.runLocal('timestamp', 'que horas e');
  const t2 = Brain.runLocal('timestamp', 'que horas e');
  const u1 = parseInt(t1.match(/Unix: (\d+)/)[1], 10);
  const u2 = parseInt(t2.match(/Unix: (\d+)/)[1], 10);
  assert.ok(u2 >= u1, 'unix decresceu');
  assert.ok(Number.isFinite(u1));
  const iso = t1.match(/ISO: (\S+)/)[1];
  assert.ok(!Number.isNaN(new Date(iso).getTime()), 'ISO nao parseavel: ' + iso);
});

test('intentExternal: precedencia wikipedia (generico ganha)', () => {
  assert.strictEqual(Brain.intentExternal('o que e npm lodash'), 'wikipedia');
  assert.strictEqual(Brain.intentExternal('musica wikipedia pink floyd'), 'wikipedia');
});

test('intentExternal: empty -> null', () => {
  assert.strictEqual(Brain.intentExternal(''), null);
  assert.strictEqual(Brain.intentExternal('   '), null);
});

test('memoria: 40 entradas, mais antiga caida', () => {
  for (let i = 0; i < 40; i++) Brain.addMessage('user', 'm' + i);
  assert.strictEqual(Brain.getMemory().length, 40);
  assert.strictEqual(Brain.getMemory()[0].content, 'm0');
  Brain.addMessage('user', 'm40');
  assert.strictEqual(Brain.getMemory().length, 40);
  assert.strictEqual(Brain.getMemory()[0].content, 'm1');
  assert.strictEqual(Brain.getMemory()[39].content, 'm40');
});

test('memoria: recentMemory(0) vs recentMemory(large)', () => {
  for (let i = 0; i < 30; i++) Brain.addMessage('user', 'u' + i);
  const zero = Brain.recentMemory(0);
  assert.strictEqual(zero.length, 24, '0 e falsy -> default 12 turnos -> 24');
  assert.strictEqual(zero[0].content, 'u6');
  const large = Brain.recentMemory(100);
  assert.strictEqual(large.length, 30);
  assert.strictEqual(large[0].content, 'u0');
  assert.strictEqual(large[large.length - 1].content, 'u29');
});

test('memoria: ordenacao por timestamp preservada apos reload', () => {
  Brain.clearMemory();
  for (let i = 0; i < 10; i++) Brain.addMessage('user', 't' + i);
  const reload = loadScriptFile('./brain.js', { session: 'shared', exposes: ['Brain'] });
  const rb = reload.exposed.Brain;
  rb.loadHistory();
  const mem = rb.getMemory();
  assert.strictEqual(mem.length, 10);
  assert.strictEqual(mem[0].content, 't0');
  assert.strictEqual(mem[9].content, 't9');
});

test('memoria: addMessage com conteudo numerico nao lança', () => {
  assert.doesNotThrow(() => Brain.addMessage('user', 12345));
  assert.strictEqual(Brain.getMemory()[0].content, 12345);
});

test('loadHistory: JSON corrompido nao lança e reseta', () => {
  loader.localStorage.setItem('hemorroida-history', '{invalid');
  assert.doesNotThrow(() => Brain.loadHistory());
  assert.strictEqual(Brain.getMemory().length, 0);
});

test('saveHistory: setItem lançando nao quebra addMessage', () => {
  const orig = loader.localStorage.setItem;
  loader.localStorage.setItem = () => { throw new Error('quota full'); };
  try {
    assert.doesNotThrow(() => Brain.addMessage('user', 'memoria-ram'));
    assert.strictEqual(Brain.getMemory().length, 1);
    assert.strictEqual(Brain.getMemory()[0].content, 'memoria-ram');
  } finally {
    loader.localStorage.setItem = orig;
  }
});

test('runExternal: ferramenta desconhecida exata', async () => {
  const r = await Brain.runExternal('not-a-tool', 'x', {});
  assert.strictEqual(r, 'Ferramenta desconhecida.');
});

async function withFetch(mockFn, run) {
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = mockFn;
  try { return await run(); } finally { loader.ctx.fetch = orig; }
}

test('runExternal: wikipedia sem extract -> fallback', async () => {
  const r = await withFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ title: 'X' }) }),
    () => Brain.runExternal('wikipedia', 'wikipedia x', {}));
  assert.strictEqual(r, 'Nenhum resultado na Wikipedia.');
});

test('runExternal: open-meteo sem current_weather -> fallback', async () => {
  const r = await withFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ hourly: {} }) }),
    () => Brain.runExternal('open-meteo', 'clima', {}));
  assert.strictEqual(r, 'Sem dados de clima.');
});

test('runExternal: itunes resultados vazios -> fallback', async () => {
  const r = await withFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }),
    () => Brain.runExternal('itunes', 'musica nada', {}));
  assert.strictEqual(r, 'Nenhuma musica encontrada.');
});

test('runExternal: npm sem dist-tags -> ?', async () => {
  const r = await withFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'pkg' }) }),
    () => Brain.runExternal('npm', 'npm pkg', {}));
  assert.match(r, /pkg@\?/);
});

test('runExternal: fetch HTTP 500 -> erro sem rejeitar', async () => {
  const r = await withFetch(() => Promise.resolve({ ok: false, status: 500 }),
    () => Brain.runExternal('wikipedia', 'wikipedia x', {}));
  assert.match(r, /^Erro ao consultar wikipedia:/);
});

test('runExternal: fetch lançando -> erro sem rejeitar', async () => {
  const r = await withFetch(() => Promise.reject(new Error('boom')),
    () => Brain.runExternal('open-meteo', 'clima', {}));
  assert.match(r, /^Erro ao consultar open-meteo:/);
});

test('runExternal: open-meteo coords null/undefined -> 0,0', async () => {
  let url = '';
  await withFetch((u) => { url = String(u); return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
    () => Brain.runExternal('open-meteo', 'clima', { coords: null }));
  assert.match(url, /latitude=0&longitude=0/);
  await withFetch((u) => { url = String(u); return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
    () => Brain.runExternal('open-meteo', 'clima', undefined));
  assert.match(url, /latitude=0&longitude=0/);
});

test('runExternal: pokemon sanitiza nome', async () => {
  let url = '';
  await withFetch((u) => { url = String(u); return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'x' }) }); },
    () => Brain.runExternal('pokemon', 'pokemon Mewtwo!', {}));
  assert.ok(url.endsWith('/mewtwo'), url);
});

test('runExternal: wikipedia encoda espacos/caracteres', async () => {
  let url = '';
  await withFetch((u) => { url = String(u); return Promise.resolve({ ok: true, json: () => Promise.resolve({ title: 'x', extract: 'y' }) }); },
    () => Brain.runExternal('wikipedia', 'wikipedia São Paulo FC', {}));
  assert.ok(url.includes('S%C3%A3o'), url);
  assert.ok(url.includes('%20'), url);
});
