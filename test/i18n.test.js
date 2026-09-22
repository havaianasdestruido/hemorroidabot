'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadScriptFile } = require('./harness');

let I18n;
let storage;

beforeEach(() => {
  const loader = loadScriptFile('./i18n.js', { session: 'i18n', exposes: ['I18n'] });
  I18n = loader.exposed.I18n;
  storage = loader.localStorage;
  I18n.setLocale('pt-BR');
});

test('I18n usa pt-BR por padrao e interpola variaveis', () => {
  assert.equal(I18n.getLocale(), 'pt-BR');
  assert.equal(I18n.t('download.list'), 'Listar arquivos');
  assert.equal(I18n.t('download.files', { count: 2, gguf: 1 }), '2 arquivo(s). 1 GGUF.');
});

test('I18n altera para en-US e persiste a preferencia', () => {
  assert.equal(I18n.setLocale('en-us'), 'en-US');
  assert.equal(I18n.t('download.list'), 'List files');
  assert.equal(I18n.t('app.noModel'), '(No model loaded. Download one and click "Load local model".)');
  assert.equal(storage.getItem('hemorroida-locale'), 'en-US');
});

test('I18n usa pt-BR para locale nao suportado e chave ausente', () => {
  assert.equal(I18n.setLocale('fr-FR'), 'pt-BR');
  assert.equal(I18n.t('missing.key'), 'missing.key');
});
