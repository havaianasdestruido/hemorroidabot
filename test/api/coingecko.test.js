const assert = require('node:assert');
const test = require('node:test');

const tool = require('../../tools/coingecko');

global.fetch = async function(url) {
  return {
    ok: true,
    url,
    async json() {
      return { bitcoin: { brl: 350000 } };
    }
  };
};

test('match patterns', () => {
  assert.ok(tool.match.test('preco do bitcoin'));
  assert.ok(tool.match.test('valor do ethereum em dolar'));
  assert.ok(tool.match.test('cotacao do btc'));
  assert.ok(tool.match.test('quanto ta o doge'));
  assert.ok(tool.match.test('preco cripto hoje'));
  assert.ok(tool.match.test('crypto price of litecoin'));
});

test('build url bitcoin usd', () => {
  const url = tool.build('preco do bitcoin em dolar');
  assert.ok(url.includes('ids=bitcoin'));
  assert.ok(url.includes('vs_currencies=usd'));
});

test('build url eth brl', () => {
  const url = tool.build('valor do eth em brl');
  assert.ok(url.includes('ids=ethereum'));
  assert.ok(url.includes('vs_currencies=brl'));
});

test('build url doge eur', () => {
  const url = tool.build('doge em euro');
  assert.ok(url.includes('ids=dogecoin'));
  assert.ok(url.includes('vs_currencies=eur'));
});

test('build default bitcoin brl', () => {
  const url = tool.build('qual o preco da cripto hoje');
  assert.ok(url.includes('ids=bitcoin'));
  assert.ok(url.includes('vs_currencies=brl'));
});

test('parse valid data', () => {
  const out = tool.parse({ bitcoin: { usd: 60000, brl: 350000 } });
  assert.ok(out.includes('1 bitcoin = 60000 USD'));
  assert.ok(out.includes('1 bitcoin = 350000 BRL'));
});

test('parse empty object no throw', () => {
  const out = tool.parse({});
  assert.ok(typeof out === 'string');
});

test('parse null no throw', () => {
  const out = tool.parse(null);
  assert.ok(typeof out === 'string');
});

test('full fetch flow', async () => {
  const url = tool.build('preco do bitcoin em real');
  const res = await fetch(url);
  assert.ok(res.ok);
  const json = await res.json();
  const out = tool.parse(json);
  assert.ok(out.includes('1 bitcoin = 350000 BRL'));
});
