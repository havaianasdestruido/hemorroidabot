const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const outputArg = process.argv[2] || '_site';
const OUTPUT = path.resolve(ROOT, outputArg);
const SOURCE_DIRS = ['src', 'vendor', 'favicons'];

function pathsOverlap(a, b) {
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}

if (OUTPUT === ROOT || SOURCE_DIRS.some(function(dir) {
  return pathsOverlap(OUTPUT, path.join(ROOT, dir));
})) {
  throw new Error('Diretorio de saida invalido: ' + OUTPUT);
}

fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(OUTPUT, { recursive: true });

SOURCE_DIRS.forEach(function(dir) {
  fs.cpSync(path.join(ROOT, dir), path.join(OUTPUT, dir), { recursive: true });
});

// A pagina da raiz preserva os caminhos usados pelo app (/src, /vendor e /favicons).
fs.copyFileSync(path.join(ROOT, 'src', 'index.html'), path.join(OUTPUT, 'index.html'));
fs.writeFileSync(path.join(OUTPUT, '.nojekyll'), '');

// Falha o build antes do deploy se algum recurso essencial do runtime estiver ausente.
const REQUIRED_ASSETS = [
  'index.html',
  'src/app.js',
  'src/brain.js',
  'src/engine.js',
  'src/i18n.js',
  'src/models.js',
  'vendor/wllama/index.js',
  'vendor/wllama/wasm/wllama.wasm',
  'vendor/wllama-compat/wllama.js',
  'vendor/wllama-compat/wllama.wasm'
];

REQUIRED_ASSETS.forEach(function(relativePath) {
  const filePath = path.join(OUTPUT, relativePath);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error('Recurso obrigatorio ausente ou vazio: ' + relativePath);
  }
});

console.log('Site estatico montado em ' + OUTPUT + ' (' + REQUIRED_ASSETS.length + ' recursos validados).');
