'use strict';
// Smoke test REAL das APIs externas (requer internet). Nao roda no CI rapido.
// Uso: npm run test:api-live   (ou: node test/api-live.suite.js)
const { loadScriptFile } = require('./harness');

const loader = loadScriptFile('./brain.js', { session: 'live-api', exposes: ['Brain'] });
const Brain = loader.exposed.Brain;

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

(async function main() {
  const tools = Object.keys(Brain.EXTERNAL_TOOLS);
  const results = [];
  for (const key of tools) {
    const phrase = Brain.externalExampleFor(key);
    const t = Brain.EXTERNAL_TOOLS[key];
    const url = t.build(phrase, { coords: { lat: -23.55, lon: -46.63 } });
    try {
      const data = await fetchJson(url);
      const out = t.parse(data);
      results.push({ key, url, ok: true, out: out });
      console.log('OK  ' + key.padEnd(14) + ' -> ' + out.split('\n')[0]);
    } catch (e) {
      results.push({ key, url, ok: false, out: e.message });
      console.log('FAIL ' + key.padEnd(14) + ' ' + url + ' -> ' + e.message);
    }
  }
  const passed = results.filter((r) => r.ok).length;
  console.log('\n---\n' + passed + '/' + results.length + ' APIs vivas. ' + (results.length - passed) + ' falharam.');
  process.exitCode = passed === results.length ? 0 : 1;
})();