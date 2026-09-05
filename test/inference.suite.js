/**
 * HemorroidaBot — teste de inferência completa via Playwright.
 *
 * Fluxo:
 *  1. Sobe server.js (PORT=8234) como child process.
 *  2. Abre Chromium headless.
 *  3. Baixa SmolLM2-135M-Instruct-Q4_K_M.gguf para o Cache Storage.
 *  4. Carrega o modelo no wllama (WASM).
 *  5. Roda uma sequência de prompts pelo chat e verifica respostas do bot.
 *  6. Limpa (fecha browser, mata servidor).
 *
 * Rodar:
 *    node test/inference.test.js
 *    (ou) npx playwright test test/inference.test.js
 *
 * Uso da biblioteca: usa @playwright/test (re-exporta chromium). Se não houver
 * Playwright instalado, veja construtores alternativos no início do arquivo.
 */

const { spawn } = require('child_process');
const path = require('path');

// Seleciona o driver do Chromium. Tenta libs em ordem de disponibilidade.
function loadChromium() {
  try { return require('@playwright/test').chromium; } catch (e) {}
  try { return require('playwright').chromium; } catch (e) {}
  try { return require('playwright-core').chromium; } catch (e) {}
  throw new Error(
    'Playwright nao instalado. Rode: npm i -D @playwright/test && npx playwright install chromium'
  );
}

const chromium = loadChromium();

const PORT = 8234;
const BASE = `http://localhost:${PORT}/`;
const REPO = 'backpack-run/SmolLM2-135M-Instruct-GGUF';
const FILE = 'SmolLM2-135M-Instruct-Q4_K_M.gguf';
const Q4_FILE = 'SmolLM2-135M-Instruct-Q4_K_M.gguf';

const PROMPTS = [
  { name: 'saudacao',      text: 'Ola, voce e quem?',                check: (s) => s.length > 0,            desc: 'greeting -> any response' },
  { name: 'matematica',    text: 'Quanto e 2 + 2?',                  check: (s) => /4/.test(s),             desc: 'math -> contain "4"' },
  { name: 'curiosidade',   text: 'Me conte uma curiosidade',         check: (s) => s.length > 0,            desc: 'open-ended -> any response' },
  { name: 'conhecimento',  text: 'O que e IA?',                      check: (s) => s.length > 0,            desc: 'knowledge -> any response' },
  { name: 'uuid',          text: 'Gere um UUID',                     check: (s) => /[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}/.test(s), desc: 'tool -> UUID pattern' },
  { name: 'hora',          text: 'Que horas sao agora?',             check: (s) => /\d/.test(s),            desc: 'tool -> contains numbers' },
];

function pad(str, n) { str = String(str); return str.length >= n ? str : str + ' '.repeat(n - str.length); }

async function main() {
  console.log(`[infra] Carregando Playwright -> chromium (${'v'})`);
  console.log(`[infra] Subindo server.js na porta ${PORT}...`);

  // 1) Sobe o servidor
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  server.on('exit', (code) => console.log(`[infra] Servidor encerrado (code=${code}).`));

  // Espera o servidor responder
  await waitForServer();

  let browser = null;
  let context = null;
  let page = null;

  // Usa um profile persistente em disco p/ ter quota normal do Cache Storage
  // (evita "Quota exceeded" de contextos ephemeral/headless).
  const profileDir = path.join(
    process.env.TEMP || 'C:\\WINDOWS\\TEMP',
    'hemorroida-inference-profile-' + Date.now()
  );

  // Tentativa 1: profile persistente em disco (quota maior p/ ~100MB).
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: ['--disable-features=IsolateOrigins,site-per-process'],
    });
    browser = context.browser();
    page = await context.pages()[0] || await context.newPage();
  } catch (e) {
    console.log('[infra] Falha no launchPersistent, trying launch padrao...');
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  }

  try {
    page.on('console', (msg) => {
      const t = msg.type();
      if (['error', 'warning'].includes(t)) console.log(`[page:${t}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => console.log('[page:pageerror]', err.message));

    // 3) Carrega a página
    console.log(`[passo3] Navegando para ${BASE} ...`);
    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('#send-btn', { timeout: 30000 });
    await page.waitForFunction(() => !!window.HemorroidaEngine, { timeout: 60000 });
    console.log('[passo3] Pagina carregada e engine exposta.');

    // Pequena confirmacao de isolamento (SharedArrayBuffer p/ wllama multithread)
    let hasSAB = false;
    try { hasSAB = await page.evaluate(() => typeof SharedArrayBuffer !== 'undefined'); }
    catch (e) {}
    console.log(`[passo3] SharedArrayBuffer disponivel: ${hasSAB}`);

    // Escrever repo/arquivo na UI (o SmolLM nao esta no select, usa campos manuais)
    await page.fill('#repo-input', REPO);
    await page.fill('#file-input', Q4_FILE);
    // IMPORTANTE: o select padrao ("qwen-3b") e um modelo conhecido; currentSelection()
    // retornaria o Qwen 3B em vez dos campos manuais. Forca um valor nao-conhecido
    // para que o app use repo/file que digitamos.
    await page.evaluate(() => { document.getElementById('model-select').value = 'smol-135m'; });

    // 4) Lista arquivos (opcional, confirma repo valido)
    console.log('[passo4] Listar arquivos (confirmar repo)...');
    await page.click('#list-btn');
    await waitStatusExclude(page, ['Listando'], 60000);
    const listStatus = await page.textContent('#dl-status');
    console.log('[passo4] Status listagem:', listStatus.trim());

    // 5) Download do modelo (~100MB)
    console.log('[passo5] Baixando modelo (Q4_K_M ~100MB)...');
    const dlT0 = Date.now();
    await page.click('#dl-btn');
    const dlOK = await waitStatusContains(page, ['Concluido', 'Erro'], 300000);
    const dlTime = ((Date.now() - dlT0) / 1000).toFixed(1);
    const dlStatus = (await page.textContent('#dl-status')).trim();
    if (!/Concluido/i.test(dlStatus)) {
      console.log(`[passo5] FALHA no download em ${dlTime}s: ${dlStatus}`);
      throw new Error('Download do modelo nao concluiu');
    }
    console.log(`[passo5] Download concluido em ${dlTime}s: ${dlStatus}`);

    // 6) Carrega o modelo no wllama (WASM init + load do .gguf)
    console.log('[passo6] Carregando modelo local (WASM init + load)...');
    const ldT0 = Date.now();
    await page.click('#load-engine-btn');
    const ldOK = await waitStatusContains(page, ['pronto', 'Erro'], 400000);
    const ldTime = ((Date.now() - ldT0) / 1000).toFixed(1);
    const ldStatus = (await page.textContent('#dl-status')).trim();
    if (!/pronto/i.test(ldStatus)) {
      console.log(`[passo6] FALHA ao carregar modelo em ${ldTime}s: ${ldStatus}`);
      throw new Error('Modelo nao carregou');
    }
    console.log(`[passo6] Modelo carregado em ${ldTime}s: ${ldStatus}`);

    const loaded = await page.evaluate(() => window.HemorroidaEngine.isModelLoaded());
    console.log(`[passo6] engine.isModelLoaded() = ${loaded}`);

    // 7) Testes de inferencia
    const results = [];
    for (const p of PROMPTS) {
      const t0 = performance.now();
      let outcome;
      let response = '';
      try {
        response = await sendAndWaitForResponse(page, p.text, 180000);
        const pass = p.check(response);
        outcome = pass ? 'PASS' : 'FAIL';
      } catch (e) {
        outcome = 'FAIL';
        response = `(erro: ${e.message})`;
      }
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      results.push({ name: p.name, text: p.text, pass: outcome, response, secs, check: p.desc });
      console.log(`  [${p.name}] ${outcome} | ${secs}s | len=${response.length} | resp="${truncate(response, 120)}"`);
    }

    // 8) Resumo
    printSummary(results);

  } finally {
    // 9) Cleanup
    if (browser) { try { await browser.close(); } catch (e) {} }
    try { server.kill('SIGKILL'); } catch (e) {}
    try { require('fs').rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
    console.log('[infra] Browser fechado, servidor morto. FIM.');
  }
}

function truncate(s, n) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function printSummary(results) {
  const line = (name, pass, len, secs) =>
    `  | ${pad(name, 14)} | ${pad(pass, 4)} | ${pad(len, 7)} | ${pad(secs, 6)} |`;
  console.log('\n===== SUMARIO =====');
  console.log('  | nome           | status | len(chars) | tempo(s) |');
  console.log('  |' + '-'.repeat(15) + '|' + '-'.repeat(8) + '|' + '-'.repeat(12) + '|' + '-'.repeat(10) + '|');
  for (const r of results) line(r.name, r.pass, r.response.length, r.secs);
  for (const r of results) console.log(`  | ${pad(r.name, 14)} | ${pad(r.pass, 4)} | ${pad(r.response.length, 7)} | ${pad(r.secs, 6)} |`);
  const totalPass = results.filter((r) => r.pass === 'PASS').length;
  console.log(`\n  Total: ${totalPass}/${results.length} PASS`);
  console.log('\n===== RESUMO DETALHADO =====');
  for (const r of results) {
    console.log(`\n[${r.name}] (${r.text})`);
    console.log(`  Status: ${r.pass} | tempo: ${r.secs}s | len: ${r.response.length}`);
    console.log(`  Checagem esperada: ${r.check}`);
    console.log(`  Resposta: ${truncate(r.response, 300)}`);
  }
}

// Envia mensagem e aguarda a resposta do bot.
// Model-response: aparece "Processando..." e some ao concluir (engineRespond).
// Local-tool: responde sincrono, sem "Processando...".
// Retorna o corpo do ultimo pre do bot (pode ser vazio se o modelo nao gerou nada).
async function sendAndWaitForResponse(page, text, timeoutMs) {
  const before = await page.$$eval('#messages pre', (els) => els.length);

  await page.fill('#user-input', text);
  await page.click('#send-btn');

  const deadline = Date.now() + timeoutMs;
  const seenProcessing = { v: false };

  while (Date.now() < deadline) {
    const info = await page.evaluate(() => {
      const preEls = Array.from(document.querySelectorAll('#messages pre'));
      return { count: preEls.length, texts: preEls.map((p) => p.textContent || '') };
    });

    const hasProcessing = info.texts.some((t) => /Processando/.test(t));
    if (hasProcessing) seenProcessing.v = true;

    // Temos pelo menos user + bot?
    if (info.count >= before + 2) {
      if (seenProcessing.v) {
        // resposta do modelo: so conclui quando "Processando" some
        if (!hasProcessing) return lastBotBody(info.texts);
      } else {
        // resposta local: sincrono, nada de Processando jamais -> concluiu
        if (!hasProcessing) return lastBotBody(info.texts);
      }
    }
    await sleep(250);
  }

  // timeout: retorna o que houver
  const info = await page.evaluate(() => Array.from(document.querySelectorAll('#messages pre')).map((p) => p.textContent || ''));
  return lastBotBody(info.texts);
}

function lastBotBody(texts) {
  const bot = texts.filter((t) => !/Processando/.test(t)).pop();
  return stripPrefix(bot || '');
}

function stripPrefix(text) {
  // remove "[HH:MM] <who>: " do inicio
  const m = text.match(/^\[[\d:]+\]\s*[^:]*\s*:\s*([\s\S]*)$/);
  return m ? m[1] : text;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitStatusContains(page, needles, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await page.textContent('#dl-status')).trim();
    for (const n of needles) {
      if (new RegExp(n, 'i').test(s)) return true;
    }
    await sleep(500);
  }
  const s = (await page.textContent('#dl-status')).trim();
  throw new Error(`Status nao atingiu ${needles.join('/')}; ultimo: "${s}"`);
}

// Aguarda ate que #dl-status NÃO contenha nenhum dos "exclude" substrings
// (status atual avancou). Lanca no timeout.
async function waitStatusExclude(page, excludes, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await page.textContent('#dl-status')).trim();
    const stillBusy = excludes.some((x) => new RegExp(x, 'i').test(s));
    if (!stillBusy) return true;
    await sleep(500);
  }
  const s = (await page.textContent('#dl-status')).trim();
  throw new Error(`Status nao saiu de ${excludes.join('/')}; ultimo: "${s}"`);
}

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return;
    } catch (e) {}
    await sleep(300);
  }
  throw new Error('Servidor nao subiu a tempo');
}

// Tenta achar um Chromium de outras instalacoes (fallback manual).
function tryManualChromium() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    require('os').homedir() + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    require('os').homedir() + '\\AppData\\Local\\ms-playwright\\chromium-*\\chrome-win\\chrome.exe',
  ];
  const fs = require('fs');
  const glob = require('path');
  for (const c of candidates) {
    if (!c) continue;
    const expanded = c.replace(/\\\*.*$/, '');
    const found = c.includes('*')
      ? (fs.readdirSync(require('path').dirname(expanded), { withFileTypes: true })
          .filter((d) => d.isDirectory() && d.name.startsWith('chromium-'))
          .map((d) => require('path').join(require('path').dirname(expanded), d.name, 'chrome-win', 'chrome.exe'))
          .find((p) => fs.existsSync(p)))
      : (fs.existsSync(c) ? c : null);
    if (found) {
      console.log('[infra] Chromium encontrado em:', found);
      return chromium.launch({ headless: true, executablePath: found });
    }
  }
  return null;
}

if (require.main === module) {
  main().then(
    () => { process.exit(0); },
    (e) => { console.error('\n[FALHA GERAL]', e && e.stack ? e.stack : e); process.exit(1); }
  );
}

module.exports = { main, sendAndWaitForResponse, stripPrefix };
