const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

describe('index.html structure', () => {

  const requiredIds = [
    'model-select', 'repo-input', 'file-input',
    'list-btn', 'dl-btn', 'cache-btn', 'load-engine-btn', 'unload-btn',
    'dl-status', 'dl-progress', 'file-list',
    'mic-btn', 'tts-chk', 'perf', 'clear-btn',
    'messages', 'user-input', 'send-btn',
    'tools-grid', 'main-form',
  ];

  for (const id of requiredIds) {
    it(`id="${id}" exists exactly once`, () => {
      const re = new RegExp(`id=["']${id}["']`, 'gi');
      const matches = html.match(re);
      assert.ok(matches, `id="${id}" not found in index.html`);
      assert.equal(matches.length, 1, `id="${id}" appears ${matches.length} times (expected 1)`);
    });
  }

  const moduleScripts = ['src/models.js', 'src/brain.js', 'src/app.js', 'src/engine.js'];

  for (const src of moduleScripts) {
    it(`<script> includes ${src}`, () => {
      const re = new RegExp(`<script[^>]*src=["']${src.replace('/', '\\/')}["']`, 'i');
      assert.ok(re.test(html), `<script src="${src}"> not found`);
    });
  }

  it('engine.js is loaded as type="module"', () => {
    assert.ok(
      /<script[^>]*type=["']module["'][^>]*src=["']src\/engine\.js["']/.test(html) ||
      /<script[^>]*src=["']src\/engine\.js["'][^>]*type=["']module["']/.test(html),
      'engine.js is not loaded as type="module"'
    );
  });

  it('only engine.js is loaded as type="module" (reports non-module scripts)', () => {
    const moduleSrcs = [];
    const plainSrcs = [];
    const globalRe = /<script[^>]*>[\s\S]*?<\/script>/gi;
    let m;
    while ((m = globalRe.exec(html)) !== null) {
      const tag = m[0];
      const srcMatch = /src=["']([^"']+)["']/.exec(tag);
      if (srcMatch) {
        if (/type=["']module["']/.test(tag)) {
          moduleSrcs.push(srcMatch[1]);
        } else {
          plainSrcs.push(srcMatch[1]);
        }
      }
    }
    assert.deepEqual(moduleSrcs, ['src/engine.js']);
    assert.deepEqual(
      plainSrcs.sort(),
      ['src/app.js', 'src/brain.js', 'src/models.js'].sort(),
      `expected src/models.js/src/brain.js/src/app.js as plain scripts; got: ${plainSrcs.join(', ')}`
    );
  });

  it('radio group name="mode" has values text and voice', () => {
    assert.ok(
      html.includes('name="mode"') || html.includes("name='mode'"),
      'radio group name="mode" not found'
    );
    assert.ok(
      /name=["']mode["'][^>]*value=["']text["']/.test(html) ||
      /value=["']text["'][^>]*name=["']mode["']/.test(html),
      'radio value="text" not found'
    );
    assert.ok(
      /name=["']mode["'][^>]*value=["']voice["']/.test(html) ||
      /value=["']voice["'][^>]*name=["']mode["']/.test(html),
      'radio value="voice" not found'
    );
  });

  it('checkbox with id="tts-chk"', () => {
    assert.ok(
      /<input[^>]*type=["']checkbox["'][^>]*id=["']tts-chk["']/.test(html) ||
      /<input[^>]*id=["']tts-chk["'][^>]*type=["']checkbox["']/.test(html),
      'checkbox id="tts-chk" not found'
    );
  });

  const buttonIds = ['mic-btn', 'clear-btn', 'unload-btn'];
  for (const id of buttonIds) {
    it(`button with id="${id}"`, () => {
      const re = new RegExp(`<button[^>]*id=["']${id}["']`, 'i');
      assert.ok(re.test(html), `<button id="${id}"> not found`);
    });
  }

  it('element id="perf" inside fieldset with legend "Desempenho"', () => {
    const fieldsetRe = /<fieldset>([\s\S]*?)<\/fieldset>/gi;
    let found = false;
    let m;
    while ((m = fieldsetRe.exec(html)) !== null) {
      const block = m[1];
      if (/<legend>\s*Desempenho\s*<\/legend>/i.test(block) && /id=["']perf["']/.test(block)) {
        found = true;
        break;
      }
    }
    assert.ok(found, 'id="perf" not found inside a fieldset with legend "Desempenho"');
  });

  it('file-list is a <div>', () => {
    assert.ok(
      /<div[^>]*id=["']file-list["']/.test(html),
      'file-list should be a <div>'
    );
  });

  it('dl-progress is a <progress> element', () => {
    assert.ok(
      /<progress[^>]*id=["']dl-progress["']/.test(html),
      'dl-progress should be a <progress> element'
    );
  });

  it('body uses monospace font', () => {
    assert.ok(
      /font-family:\s*monospace/.test(html),
      'body does not use font-family: monospace'
    );
  });

  it('body has max-width centered layout', () => {
    assert.ok(
      /max-width:\s*\d/.test(html),
      'no max-width rule found in CSS'
    );
    assert.ok(
      /margin:\s*0\s*auto/.test(html),
      'no margin: 0 auto (centered layout) found'
    );
  });
});
