const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'pages.yml'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const REQUIRED_ASSETS = [
  'index.html',
  '.nojekyll',
  'src/app.js',
  'src/brain.js',
  'src/engine.js',
  'src/i18n.js',
  'src/models.js',
  'favicons/dictionary.png',
  'vendor/wllama/index.js',
  'vendor/wllama/wasm/wllama.wasm',
  'vendor/wllama-compat/wllama.js',
  'vendor/wllama-compat/wllama.wasm'
];

describe('build do GitHub Pages', () => {
  it('monta um artefato com todos os recursos usados no navegador', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hemorroidabot-pages-'));
    const output = path.join(tempRoot, 'site');

    try {
      const result = spawnSync(process.execPath, ['scripts/build-pages.js', output], {
        cwd: ROOT,
        encoding: 'utf8'
      });

      assert.equal(result.status, 0, result.stderr || result.stdout);
      for (const relativePath of REQUIRED_ASSETS) {
        const filePath = path.join(output, relativePath);
        assert.ok(fs.existsSync(filePath), relativePath + ' nao foi publicado');
        if (relativePath !== '.nojekyll') {
          assert.ok(fs.statSync(filePath).size > 0, relativePath + ' foi publicado vazio');
        }
      }

      assert.equal(
        fs.readFileSync(path.join(output, 'index.html'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8'),
        'index.html da raiz deve ser a pagina principal de src/'
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('expoe o build no npm e o workflow o executa antes do upload', () => {
    assert.equal(packageJson.scripts['build:pages'], 'node scripts/build-pages.js');
    assert.match(workflow, /run:\s*npm run build:pages/);
    assert.match(workflow, /path:\s*_site/);
  });
});
