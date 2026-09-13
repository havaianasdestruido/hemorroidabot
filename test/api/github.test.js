'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const tool = require('../../tools/github');

describe('github tool', () => {
  test('match detects github queries', () => {
    assert.ok(tool.match.test('github do torvalds'));
    assert.ok(tool.match.test('github linus'));
    assert.ok(tool.match.test('perfil no github'));
    assert.ok(tool.match.test('usuario do github'));
  });

  test('match does not collide with other tools', () => {
    assert.strictEqual(tool.match.test('piada'), false);
    assert.strictEqual(tool.match.test('musica'), false);
    assert.strictEqual(tool.match.test('livro'), false);
    assert.strictEqual(tool.match.test('clima'), false);
    assert.strictEqual(tool.match.test('copiloto'), false);
  });

  test('build extracts username from query', () => {
    const url = tool.build('github do torvalds');
    assert.strictEqual(url, 'https://api.github.com/users/torvalds');
  });

  test('build falls back to torvalds', () => {
    const url = tool.build('');
    assert.strictEqual(url, 'https://api.github.com/users/torvalds');
  });

  test('build URL-encodes username', () => {
    const url = tool.build('github do foo bar');
    assert.strictEqual(url, 'https://api.github.com/users/foo%20bar');
  });

  test('parse formats full user data', () => {
    const out = tool.parse({
      login: 'torvalds',
      name: 'Linus Torvalds',
      bio: 'creator of linux',
      public_repos: 7,
      followers: 200000,
      html_url: 'https://github.com/torvalds'
    });
    assert.ok(out.includes('Linus Torvalds'));
    assert.ok(out.includes('creator of linux'));
    assert.ok(out.includes('7'));
    assert.ok(out.includes('200000'));
    assert.ok(out.includes('https://github.com/torvalds'));
  });

  test('parse uses login when name is missing', () => {
    const out = tool.parse({ login: 'octocat' });
    assert.ok(out.includes('octocat'));
    assert.ok(out.includes('sem bio'));
  });

  test('parse fallback when no login', () => {
    assert.doesNotThrow(() => tool.parse({}));
    assert.strictEqual(tool.parse({}), 'Usuario nao encontrado.');
  });

  test('parse fallback on null', () => {
    assert.strictEqual(tool.parse(null), 'Usuario nao encontrado.');
  });

  test('mocked fetch flow', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function() {
      return {
        ok: true,
        json: async function() {
          return {
            login: 'octocat',
            name: 'The Octocat',
            bio: 'mascote do github',
            public_repos: 8,
            followers: 9000,
            html_url: 'https://github.com/octocat'
          };
        }
      };
    };
    try {
      const url = tool.build('github do octocat');
      const res = await fetch(url);
      const data = await res.json();
      const out = tool.parse(data);
      assert.ok(out.includes('The Octocat'));
      assert.ok(out.includes('mascote do github'));
      assert.ok(out.includes('8'));
      assert.ok(out.includes('9000'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
