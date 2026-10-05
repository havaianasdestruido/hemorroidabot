'use strict';
// Regressao do bug de deploy no GitHub Pages (hospedagem com subpath).
//
// engine.js entregava paths relativos crus ("../vendor/...") ao wllama, que os
// resolve contra document.baseURI (a URL da PAGINA, nao do modulo). Com o site
// publicado em https://<user>.github.io/hemorroidabot/ , "../vendor" subia um
// nivel demais: o worker pedia "<origem>/vendor/wllama/wasm/wllama.wasm",
// recebia a pagina 404 em HTML e o WebAssembly.instantiate() abortava com
// "expected magic word 00 61 73 6d, found 3c 21 44 4f" ("<!DO" de <!DOCTYPE).
//
// O fix: engine.js resolve os recursos com new URL(..., import.meta.url)
// (absolutas, relativas ao modulo). Estes testes travam essa invarianta.
//
// Como testar: engine.js e um modulo ESM de browser (toca window no final), e o
// package.json e commonjs. O truque: copiamos engine.js para src/*.mjs (mesma
// pasta = mesma base de import.meta.url) e importamos com um shim de window.
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');

const SRC_DIR = path.join(__dirname, '..', 'src');
const ENGINE_SRC = path.join(SRC_DIR, 'engine.js');
const SNAPSHOT = path.join(SRC_DIR, 'engine.paths-snapshot.mjs');

// Base com subpath, igual ao deploy real do Pages deste repositorio.
const PAGES_BASE = 'https://havaianasdestruido.github.io/hemorroidabot/';

// Replica o absoluteUrl() do wllama (vendor/wllama/index.js): no browser ele
// resolve o path recebido contra document.baseURI.
function wllamaResolve(assetPath) {
  return new URL(assetPath, PAGES_BASE).href;
}

async function importEngineSnapshot() {
  fs.rmSync(SNAPSHOT, { force: true });
  fs.copyFileSync(ENGINE_SRC, SNAPSHOT);
  try {
    if (!globalThis.window) {
      globalThis.window = { dispatchEvent: function () {} };
    }
    return await import(pathToFileURL(SNAPSHOT).href);
  } finally {
    fs.rmSync(SNAPSHOT, { force: true });
  }
}

describe('engine.js — recursos wllama em hospedagem com subpath', () => {

  test('exporta ENGINE_ASSETS com as 4 URLs absolutas', async () => {
    const { ENGINE_ASSETS } = await importEngineSnapshot();
    assert.ok(ENGINE_ASSETS, 'ENGINE_ASSETS deve ser exportado por engine.js');
    for (const key of ['wllamaJs', 'wllamaWasm', 'compatJs', 'compatWasm']) {
      assert.ok(ENGINE_ASSETS[key], 'falta a chave ' + key);
      const parsed = new URL(ENGINE_ASSETS[key]); // lanca se nao for absoluta
      assert.ok(['file:', 'http:', 'https:'].includes(parsed.protocol),
        key + ' deve ser URL absoluta (module-relative), recebeu: ' + ENGINE_ASSETS[key]);
    }
  });

  test('URLs sobrevivem intactas quando o wllama resolve contra baseURI com subpath', async () => {
    const { ENGINE_ASSETS } = await importEngineSnapshot();
    for (const [key, url] of Object.entries(ENGINE_ASSETS)) {
      assert.strictEqual(wllamaResolve(url), url,
        key + ' e relativo: viraria "' + wllamaResolve(url) + '" (bug do subpath)');
    }
  });

  test('arquivos apontados existem no repo e os .wasm tem magic number 00 61 73 6d', async () => {
    const { ENGINE_ASSETS } = await importEngineSnapshot();
    for (const [key, url] of Object.entries(ENGINE_ASSETS)) {
      assert.strictEqual(new URL(url).protocol, 'file:',
        'import local deveria produzir file: URL para ' + key);
      const filePath = fileURLToPath(url);
      const stat = fs.statSync(filePath);
      assert.ok(stat.isFile() && stat.size > 0, key + ' aponta para arquivo ausente/vazio');
      if (key.toLowerCase().includes('wasm')) {
        const fd = fs.openSync(filePath, 'r');
        try {
          const buf = Buffer.alloc(4);
          fs.readSync(fd, buf, 0, 4, 0);
          assert.deepStrictEqual(
            Array.from(buf),
            [0x00, 0x61, 0x73, 0x6d],
            key + ' nao comeca com magic word de WASM (HTML salvo como .wasm?)'
          );
        } finally {
          fs.closeSync(fd);
        }
      }
    }
  });

  test('memoria do bug: path relativo cru perderia o subpath no deploy', () => {
    // Documenta POR QUE engine.js nao pode entregar "../vendor/..." ao wllama.
    const rel = '../vendor/wllama/wasm/wllama.wasm';
    assert.strictEqual(
      wllamaResolve(rel),
      'https://havaianasdestruido.github.io/vendor/wllama/wasm/wllama.wasm'
    ); // subpath /hemorroidabot/ sumiu -> 404 em HTML -> erro de magic word
  });

  test('import via data: URL (harness de testes) nao explode no top-level', async () => {
    // engine-cache.test.js importa o engine.js como data: URL; nesses modulos
    // import.meta.url nao serve de base (new URL lanca). O modulo deve carregar
    // mesmo assim e cair no fallback de path relativo (comportamento antigo).
    const src = fs.readFileSync(ENGINE_SRC, 'utf8');
    const url = 'data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64');
    if (!globalThis.window) {
      globalThis.window = { dispatchEvent: function () {} };
    }
    const mod = await import(url); // nao deve lancar
    assert.ok(mod.ENGINE_ASSETS, 'ENGINE_ASSETS exportado mesmo via data: URL');
    assert.strictEqual(mod.ENGINE_ASSETS.wllamaWasm, '../vendor/wllama/wasm/wllama.wasm',
      'sem base resolvivel, cai no fallback relativo');
  });

});
