'use strict';
// Smoke test REAL das APIs externas (requer internet). Nao roda no CI rapido.
// Uso: npm run test:api-live            (ou: node test/api-live.suite.js)
//      npm run test:api-live:raw        (ou: node test/api-live.suite.js --raw)
//   Com --raw, imprime o CORPO BRUTO (cru) de CADA resposta, alem do resumo.
//   Ute par debugar APIs mortas/instaveis. Opcional: --timeout <ms>.
const { loadScriptFile } = require('./harness');

const loader = loadScriptFile('./brain.js', { session: 'live-api', exposes: ['Brain'] });
const Brain = loader.exposed.Brain;

const RAW = process.argv.indexOf('--raw') !== -1;
const ti = process.argv.indexOf('--timeout');
const TIMEOUT = ti !== -1 && process.argv[ti + 1] ? Number(process.argv[ti + 1]) : 15000;
const SNIPPET_MAX = 200;   // chars do corpo bruto mostrado em todo FAIL
const RAW_MAX = 2000;      // chars do corpo bruto mostrado com --raw

// Faz UMA unica fetch e devolve { raw, data, jsonErr } (corpo bruto cru).
function fetchOnce(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(function() { ctrl.abort(); }, TIMEOUT);
  return fetch(url, { signal: ctrl.signal, mode: 'cors' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function(raw) {
      let data = null;
      let jsonErr = null;
      try { data = JSON.parse(raw); } catch (e) { jsonErr = e.message; }
      return { raw: raw, data: data, jsonErr: jsonErr };
    })
    .finally(function() { clearTimeout(timer); });
}

function snippet(raw, max) {
  if (raw == null) return '(sem corpo)';
  const s = String(raw);
  return s.length > max ? s.slice(0, max) + '\n...[' + (s.length - max) + ' chars a mais]' : s;
}

(async function main() {
  const tools = Object.keys(Brain.EXTERNAL_TOOLS);
  const results = [];
  for (const key of tools) {
    const phrase = Brain.externalExampleFor(key);
    const t = Brain.EXTERNAL_TOOLS[key];
    const url = t.build(phrase, { coords: { lat: -23.55, lon: -46.63 } });
    try {
      const one = await fetchOnce(url);
      if (one.data === null) throw new Error('nao-JSON: ' + one.jsonErr);
      const out = t.parse(one.data);
      results.push({ key, url, ok: true, out: out, raw: one.raw });
      console.log('OK  ' + key.padEnd(14) + ' -> ' + out.split('\n')[0]);
    } catch (e) {
      results.push({ key, url, ok: false, out: e.message, raw: e.curl && e.curl.body ? e.curl.body : '' });
      console.log('FAIL ' + key.padEnd(14) + ' ' + url + ' -> ' + e.message);
    }
  }
  if (RAW) {
    console.log('\n===== CORPO BRUTO (--raw) =====');
    results.forEach(function(r) {
      console.log('\n--- ' + r.key + ' (' + (r.ok ? 'OK' : 'FAIL') + ') ' + r.url + ' ---');
      console.log(snippet(r.raw, RAW_MAX));
    });
  } else {
    console.log('\n===== Sneak peek dos FAIL (corpo bruto, ate ' + SNIPPET_MAX + ' chars) =====');
    results.filter(function(r) { return !r.ok; }).forEach(function(r) {
      console.log('\n--- ' + r.key + ' (' + r.out + ') ---');
      console.log(snippet(r.raw, SNIPPET_MAX));
    });
  }
  const passed = results.filter(function(r) { return r.ok; }).length;
  console.log('\n---\n' + passed + '/' + results.length + ' APIs vivas. ' + (results.length - passed) + ' falharam.');
  process.exitCode = passed === results.length ? 0 : 1;
})();
