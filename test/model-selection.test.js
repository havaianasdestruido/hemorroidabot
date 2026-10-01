'use strict';
// Testes da selecao de modelo em app.js (currentSelection / firstGgufFile /
// syncInputsFromSelect). Carrega as funcoes reais do fonte num sandbox com
// inputs mockados — cobre o bug em que o select "conhecido" ignorava sempre
// os campos manuais de repo/arquivo.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const appSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');

function blockRange(text, openIndex) {
  const stack = { '{': 0, '[': 0, '(': 0 };
  const openCh = text[openIndex];
  if (!(openCh in stack)) return null;
  let q = null;
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c in stack) stack[c]++;
    else if (c === '}' && stack['{']) stack['{']--;
    else if (c === ']' && stack['[']) stack['[']--;
    else if (c === ')' && stack['(']) stack['(']--;
    if (stack['{'] === 0 && stack['['] === 0 && stack['('] === 0) {
      return { start: openIndex, end: i };
    }
  }
  return null;
}

function extractFunction(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = re.exec(appSrc);
  assert.ok(m, 'funcao ' + name + ' nao encontrada em app.js');
  const openIdx = appSrc.indexOf('{', m.index);
  const range = blockRange(appSrc, openIdx);
  assert.ok(range, 'nao conseguiu delimitar o corpo de ' + name);
  return appSrc.slice(m.index, range.end + 1);
}

const KNOWN = {
  'qwen-3b': { repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF', file: 'qwen2.5-3b-instruct-q4_k_m.gguf' },
  'qwen-7b': { repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF', file: 'qwen2.5-7b-instruct-q4_k_m.gguf' }
};

function makeModelManager() {
  return {
    findKnown: (id) => KNOWN[id] || null
  };
}

function runCurrentSelection(env) {
  const src = extractFunction('firstGgufFile') + '\n' + extractFunction('currentSelection');
  const fn = new Function(
    'repoInput', 'fileInput', 'currentRepo', 'currentFiles', 'modelSelect', 'ModelManager',
    src + '\nreturn currentSelection();'
  );
  return fn(
    env.repoInput || { value: '' },
    env.fileInput || { value: '' },
    env.currentRepo || null,
    env.currentFiles || [],
    env.modelSelect || { value: 'qwen-3b' },
    env.ModelManager || makeModelManager()
  );
}

test('campos manuais de repo/file vencem o select conhecido', () => {
  // Regressao: antes o findKnown() vinha primeiro e repo/file digitados eram
  // ignorados (todo <option> do select e um modelo conhecido, entao a UI de
  // modelo custom nunca funcionava).
  const sel = runCurrentSelection({
    repoInput: { value: '  backpack-run/SmolLM2-135M-Instruct-GGUF ' },
    fileInput: { value: 'SmolLM2-135M-Instruct-Q4_K_M.gguf' },
    modelSelect: { value: 'qwen-3b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'backpack-run/SmolLM2-135M-Instruct-GGUF',
    file: 'SmolLM2-135M-Instruct-Q4_K_M.gguf'
  });
});

test('campos vazios caem no modelo conhecido do select', () => {
  const sel = runCurrentSelection({
    repoInput: { value: '' },
    fileInput: { value: '   ' },
    modelSelect: { value: 'qwen-7b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF',
    file: 'qwen2.5-7b-instruct-q4_k_m.gguf'
  });
});

test('repo digitado diferente do listing stale NAO usa o .gguf antigo', () => {
  // Regressao: firstGgufFile() vinha do repo listado anteriormente; pares
  // repo-novo + arquivo-antigo terminavam em 404.
  const sel = runCurrentSelection({
    repoInput: { value: 'org/novo-repo' },
    fileInput: { value: '' },
    currentRepo: 'org/repo-velho',
    currentFiles: ['modelo-antigo.gguf', 'README.md'],
    modelSelect: { value: 'qwen-3b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'org/novo-repo',
    // fallback do select conhecido, NUNCA o .gguf da listagem stale
    file: 'qwen2.5-3b-instruct-q4_k_m.gguf'
  });
});

test('repo digitado igual ao repo listado ainda usa o .gguf da listagem', () => {
  const sel = runCurrentSelection({
    repoInput: { value: 'org/listado' },
    fileInput: { value: '' },
    currentRepo: 'org/listado',
    currentFiles: ['README.md', 'sub/model-q4.gguf'],
    modelSelect: { value: 'qwen-3b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'org/listado',
    file: 'sub/model-q4.gguf'
  });
});

test('fallback de arquivo prefere .gguf da listagem (nao README/.gitattributes)', () => {
  const sel = runCurrentSelection({
    repoInput: { value: '' },
    fileInput: { value: '' },
    currentRepo: 'org/listado',
    currentFiles: ['.gitattributes', 'README.md', 'config.json', 'sub/model-q4.gguf', 'outro.gguf'],
    modelSelect: { value: 'qwen-3b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'org/listado',
    file: 'sub/model-q4.gguf'
  });
});

test('repo digitado + listagem anterior sem gguf nao quebra', () => {
  const sel = runCurrentSelection({
    repoInput: { value: 'org/qualquer' },
    fileInput: { value: '' },
    currentRepo: 'org/listado',
    currentFiles: ['README.md'],
    modelSelect: { value: 'qwen-3b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'org/qualquer',
    file: 'qwen2.5-3b-instruct-q4_k_m.gguf'
  });
});

test('repo digitado sem arquivo cai no arquivo do select conhecido', () => {
  const sel = runCurrentSelection({
    repoInput: { value: 'org/novo-repo' },
    fileInput: { value: '' },
    currentFiles: [],
    modelSelect: { value: 'qwen-3b' }
  });
  assert.deepStrictEqual(sel, {
    repo: 'org/novo-repo',
    file: 'qwen2.5-3b-instruct-q4_k_m.gguf'
  });
});

test('select sem modelo conhecido usa apenas campos/listagem', () => {
  const sel = runCurrentSelection({
    repoInput: { value: '' },
    fileInput: { value: '' },
    currentRepo: 'org/x',
    currentFiles: ['a.gguf'],
    modelSelect: { value: 'inexistente' },
    ModelManager: { findKnown: () => null }
  });
  assert.deepStrictEqual(sel, { repo: 'org/x', file: 'a.gguf' });
});

test('syncInputsFromSelect preenche inputs do modelo conhecido', () => {
  const src = extractFunction('syncInputsFromSelect');
  const fn = new Function('repoInput', 'fileInput', 'modelSelect', 'ModelManager', src + '\nreturn syncInputsFromSelect();');
  const repoInput = { value: '' };
  const fileInput = { value: '' };
  fn(repoInput, fileInput, { value: 'qwen-7b' }, makeModelManager());
  assert.strictEqual(repoInput.value, 'Qwen/Qwen2.5-7B-Instruct-GGUF');
  assert.strictEqual(fileInput.value, 'qwen2.5-7b-instruct-q4_k_m.gguf');
});

test('syncInputsFromSelect nao mexe em inputs p/ select desconhecido', () => {
  const src = extractFunction('syncInputsFromSelect');
  const fn = new Function('repoInput', 'fileInput', 'modelSelect', 'ModelManager', src + '\nreturn syncInputsFromSelect();');
  const repoInput = { value: 'digitado/repo' };
  const fileInput = { value: 'digitado.gguf' };
  fn(repoInput, fileInput, { value: 'nao-existe' }, makeModelManager());
  assert.strictEqual(repoInput.value, 'digitado/repo');
  assert.strictEqual(fileInput.value, 'digitado.gguf');
});

test('boot do setupModelDownloadUI sincroniza inputs com o select', () => {
  assert.ok(
    /modelSelect\.addEventListener\(\s*'change'\s*,\s*syncInputsFromSelect\s*\)/.test(appSrc),
    'change do modelSelect deve chamar syncInputsFromSelect'
  );
  assert.ok(
    /syncInputsFromSelect\(\s*\);\s*\/\/ preenche repo\/file/.test(appSrc),
    'syncInputsFromSelect deve rodar no boot p/ preencher repo/file'
  );
});
