'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const qrcode = require('../../tools/qrcode');

describe('qrcode tool', () => {

  test('match detects gerar qr code do google.com', () => {
    assert.ok(qrcode.match.test('gerar qr code do google.com'));
  });

  test('match detects fazer qrcode para github', () => {
    assert.ok(qrcode.match.test('fazer qrcode para github'));
  });

  test('match detects qrcode do pix@email.com', () => {
    assert.ok(qrcode.match.test('qrcode do pix@email.com'));
  });

  test('match detects cria um qr code', () => {
    assert.ok(qrcode.match.test('cria um qr code'));
  });

  test('match does NOT match qr alone (too short, no trigger word)', () => {
    assert.strictEqual(qrcode.match.test('qr'), false);
  });

  test('match does NOT match codigo postal (no qr trigger)', () => {
    assert.strictEqual(qrcode.match.test('codigo postal'), false);
  });

  test('build extracts data and URL-encodes google.com', () => {
    const url = qrcode.build('gerar qr code do google.com');
    assert.ok(url.includes('api.qrserver.com/v1/create-qr-code'));
    assert.ok(url.includes('size=300x300'));
    assert.ok(url.includes(encodeURIComponent('google.com')));
  });

  test('build default fallback when no text remains', () => {
    const url = qrcode.build('gerar qr code');
    assert.ok(url.includes('data=' + encodeURIComponent('https://github.com/havaianasdestruido/hemorroidabot')));
  });

  test('build default fallback when query is empty', () => {
    const url = qrcode.build('');
    assert.ok(url.includes('data=' + encodeURIComponent('https://github.com/havaianasdestruido/hemorroidabot')));
  });

  test('build URL-encodes special chars in email', () => {
    const url = qrcode.build('qrcode do pix@email.com');
    assert.ok(url.includes(encodeURIComponent('pix@email.com')));
    assert.strictEqual(url.includes('pix@email.com'), false);
  });

  test('parse {url: ...} returns markdown image', () => {
    const u = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=test';
    const result = qrcode.parse({ url: u });
    assert.ok(result.includes('![QR]('));
    assert.ok(result.includes(u));
  });

  test('parse empty object returns fallback no throw', () => {
    assert.doesNotThrow(() => qrcode.parse({}));
    assert.strictEqual(qrcode.parse({}), 'QR code indisponivel.');
  });

  test('parse null returns fallback no throw', () => {
    assert.doesNotThrow(() => qrcode.parse(null));
    assert.strictEqual(qrcode.parse(null), 'QR code indisponivel.');
  });

  test('parse undefined returns fallback no throw', () => {
    assert.doesNotThrow(() => qrcode.parse(undefined));
  });

  test('parse string URL returns markdown image', () => {
    const u = 'https://example.com/qr.png';
    const result = qrcode.parse(u);
    assert.ok(result.includes('![QR]('));
    assert.ok(result.includes(u));
  });

  test('parse never throws on garbage', () => {
    assert.doesNotThrow(() => qrcode.parse(42));
    assert.doesNotThrow(() => qrcode.parse(true));
    assert.doesNotThrow(() => qrcode.parse([]));
  });

  test('mocked fetch full flow captures build URL and renders markdown', async () => {
    const originalFetch = globalThis.fetch;
    let captured = null;
    globalThis.fetch = async function(u) {
      captured = u;
      return {
        ok: true,
        json: async function() {
          return { url: captured };
        }
      };
    };
    try {
      const query = 'fazer qrcode para github';
      const url = qrcode.build(query);
      assert.ok(url.includes('api.qrserver.com/v1/create-qr-code'));
      assert.ok(url.includes(encodeURIComponent('github')));
      const res = await fetch(url);
      assert.strictEqual(res.ok, true);
      const data = await res.json();
      assert.strictEqual(data.url, url);
      const result = qrcode.parse(data);
      assert.ok(result.startsWith('![QR]('));
      assert.ok(result.includes(url));
      assert.ok(result.endsWith(')'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
