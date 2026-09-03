'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const html = read('index.html');
const appJs = read('app.js');
const brainJs = read('brain.js');
const engineJs = read('engine.js');
const modelsJs = read('models.js');
const serverJs = read('server.js');
const pkg = JSON.parse(read('package.json'));

function lineAt(text, pos) {
  let n = 1;
  for (let i = 0; i < pos; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

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
    if (c in stack) { stack[c]++; continue; }
    if (c === '}' && stack['{']) stack['{']--;
    else if (c === ']' && stack['[']) stack['[']--;
    else if (c === ')' && stack['(']) stack['(']--;
    if (stack['{'] === 0 && stack['['] === 0 && stack['('] === 0) {
      return { start: openIndex, end: i };
    }
  }
  return null;
}

function objectKeysFrom(text) {
  const keys = [];
  const re = /^\s*([A-Za-z_$][\w$]*)\s*:/gm;
  let m;
  while ((m = re.exec(text)) !== null) keys.push(m[1]);
  return keys;
}

function bareKeysFrom(text) {
  const keys = [];
  const re = /^\s*([A-Za-z_$][\w$]*)\s*,?$/gm;
  let m;
  while ((m = re.exec(text)) !== null) keys.push(m[1]);
  return keys;
}

function quotedColonKeys(text) {
  const keys = [];
  const re = /^\s*['"]([^'"]+)['"]\s*:/gm;
  let m;
  while ((m = re.exec(text)) !== null) keys.push(m[1]);
  return keys;
}

function htmlIds() {
  const s = new Set();
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html)) !== null) s.add(m[1]);
  return s;
}

describe('consistency: DOM ids (app.js <-> index.html)', () => {
  it('every getElementById id in app.js exists in index.html', () => {
    const ids = htmlIds();
    const re = /document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
    const missing = [];
    const seen = new Set();
    let m;
    while ((m = re.exec(appJs)) !== null) {
      seen.add(m[1]);
      if (!ids.has(m[1])) {
        const loc = 'app.js:' + lineAt(appJs, m.index);
        if (!missing.some((v) => v.includes(m[1]))) missing.push(loc + ' getElementById("' + m[1] + '")');
      }
    }
    assert.ok(seen.size > 0, 'no getElementById calls found in app.js (regex may be wrong)');
    assert.deepEqual(missing, [], 'DOM ids used in app.js but missing from index.html:\n' + missing.join('\n'));
  });

  it('identifiers wired via addEventListener resolve to existing ids', () => {
    const ids = htmlIds();
    const idByVar = {};
    const assignRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = assignRe.exec(appJs)) !== null) {
      idByVar[m[1]] = { id: m[2], line: lineAt(appJs, m.index) };
    }
    const problems = [];
    const evRe = /([A-Za-z_$][\w$]*)\.addEventListener\(\s*['"]/g;
    while ((m = evRe.exec(appJs)) !== null) {
      const v = m[1];
      const loc = 'app.js:' + lineAt(appJs, m.index);
      const assoc = idByVar[v];
      if (!assoc) {
        problems.push(loc + ' addEventListener on "' + v + '" not bound via getElementById');
        continue;
      }
      if (!ids.has(assoc.id)) {
        problems.push(loc + ' "' + v + '" -> id="' + assoc.id + '" missing in index.html');
      }
    }
    assert.deepEqual(problems, [], 'addEventListener contract violations:\n' + problems.join('\n'));
  });
});

describe('consistency: window.HemorroidaEngine API surface', () => {
  function engineSurface() {
    const anchor = /window\.HemorroidaEngine\s*=\s*\{/.exec(engineJs);
    assert.ok(anchor, 'engine.js: window.HemorroidaEngine = { ... } not found');
    const openIdx = engineJs.indexOf('{', anchor.index);
    const block = blockRange(engineJs, openIdx);
    assert.ok(block, 'engine.js: cannot parse window.HemorroidaEngine object literal');
    return objectKeysFrom(engineJs.slice(block.start, block.end + 1));
  }

  it('app.js uses only keys exported by window.HemorroidaEngine', () => {
    const surface = engineSurface();
    const used = new Set();
    const directRe = /window\.HemorroidaEngine\.([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = directRe.exec(appJs)) !== null) used.add(m[1]);
    const aliasRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*window\.HemorroidaEngine\b/g;
    const aliases = [];
    while ((m = aliasRe.exec(appJs)) !== null) aliases.push(m[1]);
    for (const a of aliases) {
      const sub = new RegExp('\\b' + a + '\\.([A-Za-z_$][\\w$]*)', 'g');
      let sm;
      while ((sm = sub.exec(appJs)) !== null) used.add(sm[1]);
    }
    const missing = Array.from(used).filter((k) => !surface.includes(k));
    assert.deepEqual(missing, [], 'app.js uses window.HemorroidaEngine keys not exported by engine.js: ' + missing.join(', '));
  });

  it('window.HemorroidaEngine keys stay in sync with named ES exports', () => {
    const surface = engineSurface();
    const em = /export\s*\{([\s\S]*?)\};/.exec(engineJs);
    assert.ok(em, 'engine.js: export { ... } block not found');
    const exported = bareKeysFrom(em[1]);
    assert.deepEqual([...surface].sort(), [...exported].sort());
  });
});

describe('consistency: Brain API (app.js <-> brain.js)', () => {
  function brainExports() {
    const anchor = /return\s*\{/.exec(brainJs);
    assert.ok(anchor, 'brain.js: no "return { ... }" exports found');
    const openIdx = brainJs.indexOf('{', anchor.index);
    const block = blockRange(brainJs, openIdx);
    assert.ok(block, 'brain.js: cannot parse exports object literal');
    return objectKeysFrom(brainJs.slice(block.start, block.end + 1));
  }

  it('every Brain.<method> used in app.js exists in brain.js exports', () => {
    const exported = brainExports();
    const used = new Set();
    const re = /\bBrain\.([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(appJs)) !== null) used.add(m[1]);
    const missing = Array.from(used).filter((k) => !exported.includes(k));
    assert.deepEqual(missing, [], 'app.js calls Brain.' + missing.join(', ') + ' but brain.js does not export it');
  });
});

describe('consistency: brain.js tool registry shape', () => {
  function toolsBlock(varName) {
    const anchor = new RegExp(varName + '\\s*=\\s*\\{').exec(brainJs);
    assert.ok(anchor, varName + ' block not found in brain.js');
    const openIdx = brainJs.indexOf('{', anchor.index);
    const block = blockRange(brainJs, openIdx);
    assert.ok(block, varName + ' object literal could not be parsed');
    return brainJs.slice(block.start, block.end + 1);
  }

  it('every LOCAL_TOOLS key has an exampleFor entry (and a fallback exists)', () => {
    const localBlock = toolsBlock('LOCAL_TOOLS');
    const localKeys = quotedColonKeys(localBlock);
    assert.ok(localKeys.length > 0, 'no LOCAL_TOOLS entries found');
    const exAnchor = /function exampleFor\(tool\)\s*\{\s*const ex\s*=\s*\{/.exec(brainJs);
    assert.ok(exAnchor, 'brain.js: exampleFor static ex map not found');
    const exOpen = brainJs.indexOf('{', exAnchor.index + exAnchor[0].lastIndexOf('{'));
    const exBlock = blockRange(brainJs, exOpen);
    assert.ok(exBlock, 'brain.js: exampleFor ex map could not be parsed');
    const exKeys = quotedColonKeys(brainJs.slice(exBlock.start, exBlock.end + 1));
    const uncovered = localKeys.filter((k) => !exKeys.includes(k));
    assert.deepEqual(uncovered, [], 'LOCAL_TOOLS without exampleFor example: ' + uncovered.join(', '));
    const orphan = exKeys.filter((k) => !localKeys.includes(k));
    assert.deepEqual(orphan, [], 'exampleFor entries with no LOCAL_TOOLS tool: ' + orphan.join(', '));
    assert.ok(
      /return ex\[tool\]\s*\|\|\s*tool/.test(brainJs),
      'exampleFor must keep the fallback "return ex[tool] || tool"'
    );
  });

  it('every EXTERNAL_TOOLS key has desc, match, build and parse', () => {
    const extBlock = toolsBlock('EXTERNAL_TOOLS');
    const extKeys = quotedColonKeys(extBlock);
    assert.ok(extKeys.length > 0, 'no EXTERNAL_TOOLS entries found');
    const problems = [];
    for (const key of extKeys) {
      const anchor = new RegExp("'" + key + "':\\s*\\{").exec(extBlock);
      assert.ok(anchor, 'EXTERNAL_TOOLS entry "' + key + '" not found');
      const openIdx = extBlock.indexOf('{', anchor.index);
      const range = blockRange(extBlock, openIdx);
      assert.ok(range, 'EXTERNAL_TOOLS entry "' + key + '" could not be parsed');
      const entry = extBlock.slice(range.start, range.end + 1);
      for (const prop of ['desc', 'match', 'build', 'parse']) {
        if (!(new RegExp('\\b' + prop + '\\s*:').test(entry))) {
          problems.push(key + ' missing "' + prop + '"');
        }
      }
    }
    assert.deepEqual(problems, [], 'EXTERNAL_TOOLS shape violations:\n' + problems.join('\n'));
  });
});

describe('consistency: voice controls (index.html)', () => {
  it('radio group name="mode" has exactly values text and voice', () => {
    const values = [];
    const inputRe = /<input\b[^>]*>/gi;
    let m;
    while ((m = inputRe.exec(html)) !== null) {
      const tag = m[0];
      if (!/\bname\s*=\s*["']mode["']/.test(tag)) continue;
      const v = /\bvalue\s*=\s*["']([^"']*)["']/.exec(tag);
      values.push(v ? v[1] : null);
    }
    assert.deepEqual(values.sort(), ['text', 'voice']);
  });

  it('checkbox id="tts-chk" and button id="mic-btn" exist', () => {
    const ids = htmlIds();
    assert.ok(ids.has('tts-chk'), 'id="tts-chk" missing from index.html');
    assert.ok(ids.has('mic-btn'), 'id="mic-btn" missing from index.html');
    assert.ok(
      /<input\b[^>]*\btype\s*=\s*["']checkbox["'][^>]*\bid\s*=\s*["']tts-chk["']/.test(html) ||
      /<input\b[^>]*\bid\s*=\s*["']tts-chk["'][^>]*\btype\s*=\s*["']checkbox["']/.test(html),
      'tts-chk must be an <input type="checkbox">'
    );
    assert.ok(/<button\b[^>]*\bid\s*=\s*["']mic-btn["']/.test(html), 'mic-btn must be a <button>');
  });
});

describe('consistency: script load order (index.html)', () => {
  it('models.js -> brain.js -> app.js -> engine.js (module) in order', () => {
    const findScript = (src) => {
      const candidates = [html.indexOf('src="' + src + '"'), html.indexOf("src='" + src + "'")];
      for (const i of candidates) if (i >= 0) return i;
      return -1;
    };
    const modelIdx = findScript('models.js');
    const brainIdx = findScript('brain.js');
    const appIdx = findScript('app.js');
    const engineIdx = findScript('engine.js');
    assert.ok(modelIdx >= 0 && brainIdx >= 0 && appIdx >= 0 && engineIdx >= 0, 'one of models.js/brain.js/app.js/engine.js not loaded by index.html');
    assert.ok(modelIdx < brainIdx, 'models.js must load before brain.js');
    assert.ok(brainIdx < appIdx, 'brain.js must load before app.js');
    assert.ok(appIdx < engineIdx, 'app.js must load before engine.js');
  });
});

describe('consistency: removed API dead-references in app.js (BLOCKER if found)', () => {
  it('app.js contains ZERO occurrences of API_REGISTRY and handleLocalTool', () => {
    const hits = [];
    const re = /\b(API_REGISTRY|handleLocalTool)\b/g;
    let m;
    while ((m = re.exec(appJs)) !== null) {
      hits.push('app.js:' + lineAt(appJs, m.index) + ' referencing "' + m[1] + '"');
    }
    assert.deepEqual(hits, [], 'DEAD REFERENCES TO REMOVED API FOUND (app.js must be fixed by a human):\n' + hits.join('\n'));
  });
});

describe('consistency: models.js KNOWN_MODELS integrity', () => {
  function knownModels() {
    const anchor = /KNOWN_MODELS\s*=\s*\[/.exec(modelsJs);
    assert.ok(anchor, 'models.js: KNOWN_MODELS array not found');
    const openIdx = modelsJs.indexOf('[', anchor.index);
    const block = blockRange(modelsJs, openIdx);
    assert.ok(block, 'models.js: KNOWN_MODELS array could not be parsed');
    const arr = modelsJs.slice(block.start + 1, block.end);
    const entries = [];
    let pos = 0;
    while (pos < arr.length) {
      const ob = arr.indexOf('{', pos);
      if (ob < 0) break;
      const r = blockRange(arr, ob);
      if (!r) break;
      entries.push(arr.slice(r.start, r.end + 1));
      pos = r.end + 1;
    }
    return entries;
  }

  it('every entry has id/repo/file, unique ids, and .gguf files', () => {
    const entries = knownModels();
    assert.ok(entries.length > 0, 'KNOWN_MODELS is empty');
    const ids = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const where = 'KNOWN_MODELS[' + i + ']';
      const id = /id\s*:\s*['"]([^'"]+)['"]/.exec(e);
      const repo = /repo\s*:\s*['"]([^'"]+)['"]/.exec(e);
      const file = /file\s*:\s*['"]([^'"]+)['"]/.exec(e);
      assert.ok(id, where + ' missing "id"');
      assert.ok(repo, where + ' (' + (id ? id[1] : '?') + ') missing "repo"');
      assert.ok(file, where + ' (' + (id ? id[1] : '?') + ') missing "file"');
      assert.ok(file[1].toLowerCase().endsWith('.gguf'), where + ' file "' + file[1] + '" must end in .gguf');
      ids.push(id[1]);
    }
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
    assert.deepEqual(dupes, [], 'duplicate KNOWN_MODELS ids: ' + dupes.join(', '));
  });

  it('every <option> value in #model-select has a KNOWN_MODELS entry', () => {
    const entries = knownModels();
    const known = new Set();
    for (const e of entries) {
      const m = /id\s*:\s*['"]([^'"]+)['"]/.exec(e);
      if (m) known.add(m[1]);
    }
    const opts = [];
    const optRe = /<option\b[^>]*\bvalue\s*=\s*["']([^"']*)["'][^>]*>/g;
    let m;
    while ((m = optRe.exec(html)) !== null) opts.push(m[1]);
    const missing = opts.filter((v) => !known.has(v));
    assert.deepEqual(missing, [], 'model-select options without a KNOWN_MODELS entry: ' + missing.join(', '));
  });
});

describe('consistency: index.html fieldset legends', () => {
  it('legends "Desempenho" and "Entrada / Voz" each appear exactly once', () => {
    const legends = [];
    const re = /<legend\b[^>]*>([\s\S]*?)<\/legend\s*>/gi;
    let m;
    while ((m = re.exec(html)) !== null) legends.push(m[1].trim());
    const count = (s) => legends.filter((l) => l === s).length;
    assert.equal(count('Desempenho'), 1, 'legend "Desempenho" count = ' + count('Desempenho') + ' (expected 1); legends found: ' + legends.join(' | '));
    assert.equal(count('Entrada / Voz'), 1, 'legend "Entrada / Voz" count = ' + count('Entrada / Voz') + ' (expected 1); legends found: ' + legends.join(' | '));
  });
});

describe('consistency: package.json', () => {
  it('"test" script uses node --test and is not the default stub', () => {
    const script = (pkg.scripts && pkg.scripts.test) || '';
    assert.ok(script.length > 0, 'package.json lacks a "test" script');
    assert.ok(script.includes('node --test'), 'scripts.test="' + script + '" must contain "node --test"');
    assert.notStrictEqual(script.trim(), 'echo "Error: no test specified"', 'scripts.test is still the default npm stub');
  });

  it('dependencies/devDependencies contain no test framework (zero-build app)', () => {
    const frameworks = ['jest', 'vitest', 'mocha', 'jasmine', 'ava', 'tape', 'karma', 'playwright', 'puppeteer', 'cypress', 'chai', 'sinon', 'supertest', '@testing-library'];
    const all = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    const offenders = Object.keys(all).filter((d) => frameworks.some((f) => d === f || d.startsWith(f)));
    assert.deepEqual(offenders, [], 'test frameworks found in dependencies/devDependencies: ' + offenders.join(', '));
  });
});

describe('consistency: server.js MIME map', () => {
  function mimeMap() {
    const anchor = /MIME\s*=\s*\{/.exec(serverJs);
    assert.ok(anchor, 'server.js: MIME map not found');
    const openIdx = serverJs.indexOf('{', anchor.index);
    const block = blockRange(serverJs, openIdx);
    assert.ok(block, 'server.js: MIME object could not be parsed');
    const map = {};
    const re = /^\s*['"](\.[A-Za-z0-9]+)['"]\s*:\s*['"]([^'"]+)['"]/gm;
    const text = serverJs.slice(block.start, block.end + 1);
    let m;
    while ((m = re.exec(text)) !== null) map[m[1]] = m[2];
    assert.ok(Object.keys(map).length > 0, 'server.js: MIME map is empty');
    return map;
  }
  const mime = mimeMap();

  it('.js and .mjs map to text/javascript', () => {
    assert.ok(mime['.js'] && mime['.js'].startsWith('text/javascript'), '.js -> ' + mime['.js']);
    assert.ok(mime['.mjs'] && mime['.mjs'].startsWith('text/javascript'), '.mjs -> ' + mime['.mjs']);
  });

  it('.wasm maps to application/wasm and .html to text/html', () => {
    assert.equal(mime['.wasm'], 'application/wasm', '.wasm -> ' + mime['.wasm']);
    assert.ok(mime['.html'] && mime['.html'].startsWith('text/html'), '.html -> ' + mime['.html']);
  });

  it('reports MIME extensions with no matching project file (informational, not failing)', (t) => {
    const exts = new Set();
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === '.git') continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else exts.add(path.extname(ent.name).toLowerCase());
      }
    };
    walk(ROOT);
    const covered = Object.keys(mime).filter((e) => exts.has(e));
    const uncovered = Object.keys(mime).filter((e) => !exts.has(e));
    t.diagnostic('MIME extensions backed by repo files: ' + covered.join(', '));
    t.diagnostic('MIME extensions with NO matching file in repo (informational): ' + uncovered.join(', '));
  });
});