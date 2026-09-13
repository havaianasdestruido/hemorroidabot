'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { loadScriptFile, PATH } = require('./harness');

let Brain;
let loader;

beforeEach(() => {
  loader = loadScriptFile('./brain.js', { session: 'shared', exposes: ['Brain'] });
  Brain = loader.exposed.Brain;
});

const APIS = {
  'dog-ceo': {
    phrase: 'me mostra um cachorro',
    mock: { status: 'success', message: 'https://images.dog.ceo/xyz.jpg' },
    expect: ['Cachorro: https://images']
  },
  'catfact': {
    phrase: 'fato sobre gatos',
    mock: { fact: 'Cats sleep a lot.' },
    expect: ['Cats sleep']
  },
  'restcountries': {
    phrase: 'info do pais brasil',
    mock: [{ name: { common: 'Brazil' }, capital: ['Brasília'], region: 'Americas', population: 200000000, flags: { png: 'https://flag' } }],
    expect: ['Brazil', 'Brasília']
  },
  'openlibrary': {
    phrase: 'busca livro hobbit',
    mock: { docs: [{ title: 'The Hobbit', author_name: ['J.R.R. Tolkien'], first_publish_year: 1937, key: '/works/OL1W' }] },
    expect: ['Hobbit']
  },
  'jokeapi': {
    phrase: 'conta uma piada',
    mock: { type: 'single', joke: 'Why so serious?', error: false },
    expect: ['Why so serious?']
  },
  'chucknorris': {
    phrase: 'chuck norris',
    mock: { value: 'Chuck Norris does not sleep. He waits.' },
    expect: ['Chuck Norris']
  },
  'frankfurter': {
    phrase: 'converter 10 real em dolar',
    mock: { base: 'BRL', rates: { USD: 0.18 } },
    expect: ['1 BRL = 0.18 USD']
  },
  'numbersapi': {
    phrase: 'fato sobre o numero 7',
    mock: { text: '7 is a fantastic number.', number: 7 },
    expect: ['7 is a fantastic number']
  },
  'ipapico': {
    phrase: 'qual meu ip',
    mock: { ip: '8.8.8.8', city: 'Mountain View', region: 'California', country_name: 'US', latitude: 37.4, longitude: -122.1, timezone: 'America/Los_Angeles' },
    expect: ['8.8.8.8', 'Mountain View']
  },
  'boredapi': {
    phrase: 'me sugere algo para fazer',
    mock: { activity: 'Water your plants', type: 'relaxation', participants: 1, price: 0 },
    expect: ['Water your plants']
  },
  'agify': {
    phrase: 'qual a idade do jose',
    mock: { name: 'jose', age: 40, count: 1000 },
    expect: ['40']
  },
  'genderize': {
    phrase: 'o nome lucas e masculino ou feminino',
    mock: { name: 'lucas', gender: 'male', probability: 0.98, count: 500 },
    expect: ['masculino']
  },
  'universities': {
    phrase: 'busca universidades do brasil',
    mock: [{ name: 'USP', country: 'Brazil', web_pages: ['https://www.usp.br'], alpha_two_code: 'BR' }],
    expect: ['USP']
  },
  'deezer': {
    phrase: 'busca deezer queen bohemian',
    mock: { data: [{ title: 'Bohemian Rhapsody', artist: { name: 'Queen' }, album: { title: 'A Night at the Opera' }, duration: 354, preview: 'https://x.mp3' }] },
    expect: ['Queen', 'Bohemian Rhapsody']
  },
  'lastfm': {
    phrase: 'ultimo scrobble do rj',
    mock: { payload: { listens: [{ played_at: 1000000000, track_metadata: { track_name: 'Everlong', artist_name: 'Foo Fighters', release_name: 'The Colour and the Shape' } }] } },
    expect: ['Everlong', 'Foo Fighters']
  },
  'wttr': {
    phrase: 'wttr sao paulo',
    mock: { current_condition: [{ temp_C: '25', FeelsLikeC: '27', humidity: '60', windspeedKmph: '10', weatherDesc: [{ value: 'Ensolarado' }] }], nearest_area: [{ areaName: [{ value: 'Sao Paulo' }], country: [{ value: 'Brazil' }] }] },
    expect: ['Clima em', 'Sao Paulo', 'Atual']
  },
  'coingecko': {
    phrase: 'preco do bitcoin',
    mock: { bitcoin: { brl: 250000 } },
    expect: ['1 bitcoin = 250000 BRL']
  },
  'qrcode': {
    phrase: 'qrcode do google',
    mock: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=google',
    expect: ['![QR]']
  },
  'dictionary': {
    phrase: 'definicao de serendipity',
    mock: [{ word: 'serendipity', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'the occurrence of events by chance' }] }] }],
    expect: ['serendipity', 'noun']
  },
  'advice': {
    phrase: 'me da um conselho',
    mock: { slip: { id: 1, advice: 'Sleep well.' } },
    expect: ['Conselho:', 'Sleep well.']
  },
  'trivia': {
    phrase: 'quiz para mim',
    mock: { response_code: 0, results: [{ category: 'Science', question: 'What gas do plants absorb?', correct_answer: 'CO2', incorrect_answers: ['O2'] }] },
    expect: ['Pergunta (Science)', 'Resposta: CO2']
  },
  'kanye': {
    phrase: 'kanye para mim',
    mock: { quote: 'I am the best.' },
    expect: ['Kanye:', 'I am the best.']
  },
  'poetry': {
    phrase: 'poema',
    mock: [{ title: 'No Man Is An Island', author: 'John Donne', lines: ['No man is an island', 'entire of itself.'] }],
    expect: ['No Man Is An Island', 'John Donne']
  },
  'datamuse': {
    phrase: 'sinonimo de feliz',
    mock: [{ word: 'happy' }, { word: 'glad' }, { word: 'cheerful' }],
    expect: ['Sinonimos', 'happy, glad, cheerful']
  },
  'anime': {
    phrase: 'anime naruto',
    mock: { data: [{ title: 'Naruto', score: 8.5, episodes: 220, status: 'Finished', synopsis: 'A young ninja seeks recognition.' }] },
    expect: ['Titulo: Naruto', '8.5/10']
  },
  'starwars': {
    phrase: 'star wars luke',
    mock: { results: [{ name: 'Luke Skywalker', height: '172', mass: '77', gender: 'male', birth_year: '19BBY' }] },
    expect: ['Luke Skywalker', '172']
  },
  'rickandmorty': {
    phrase: 'personagem do rick and morty rick',
    mock: { results: [{ name: 'Rick Sanchez', status: 'Alive', species: 'Human', gender: 'Male', origin: { name: 'Earth (C-137)' }, image: 'https://x/img.png' }] },
    expect: ['Rick Sanchez', 'Alive']
  },
  'recipe': {
    phrase: 'receita de pizza',
    mock: { meals: [{ strMeal: 'Pizza', strCategory: 'Italian', strMealThumb: 'https://x/p.png', strInstructions: 'Make dough. Add toppings. Bake.' }] },
    expect: ['Pizza', 'Italian']
  },
  'github': {
    phrase: 'github do torvalds',
    mock: { login: 'torvalds', name: 'Linus Torvalds', bio: 'creator of linux', public_repos: 7, followers: 200000, html_url: 'https://github.com/torvalds' },
    expect: ['Linus Torvalds', 'creator of linux']
  },
  'randomuser': {
    phrase: 'me da uma pessoa aleatoria',
    mock: { results: [{ name: { first: 'Joao', last: 'Silva' }, email: 'joao@x.com', phone: '1234', location: { city: 'Sao Paulo', country: 'Brazil' }, picture: { thumbnail: 'https://x/t.png' } }] },
    expect: ['Joao', 'joao@x.com']
  },
  'news': {
    phrase: 'noticias tech para mim',
    mock: [857223, 1, 2, 3, 4, 5],
    expect: ['news.ycombinator.com']
  },
  'httppets': {
    phrase: 'qual o status dog 404',
    mock: { status_code: 404, title: 'Not Found', image: 'https://http.dog/404.jpg' },
    expect: ['HTTP 404', 'Not Found']
  },
  'animefacts': {
    phrase: 'fato sobre anime',
    mock: { data: [{ anime_name: 'Naruto', fact: 'Naruto loves ramen.' }] },
    expect: ['Naruto', 'Fato: Naruto loves ramen.']
  },
  'quran': {
    phrase: 'versiculo do corao',
    mock: { data: { editions: [{ edition: { language: 'pt', identifier: 'pt-br' }, surah: { number: 1 }, numberInSurah: 5, text: 'Contigo buscamos ajuda.' }] } },
    expect: ['Surah 1:5', 'Contigo buscamos ajuda.']
  },
  'bible': {
    phrase: 'versiculo da biblia',
    mock: { random_verse: { text: 'O Senhor e o meu pastor.', reference: 'Salmos 23:1', translation_name: 'WEB' } },
    expect: ['Salmos 23:1', 'O Senhor e o meu pastor.']
  },
  'fishwatch': {
    phrase: 'me da info sobre peixe',
    mock: [{ name: 'Tuna', scientific_name: 'Thunnus', harvest_type: 'Wild', habitat: 'Ocean waters of the Atlantic', image_gallery: [{ src: 'https://img.png' }] }],
    expect: ['Nome: Tuna', 'Thunnus', 'https://img.png']
  },
  'dogfacts': {
    phrase: 'me da um fato canino',
    mock: { facts: ['Dogs dream like humans.', 'A dog nose has 300 million receptors.'] },
    expect: ['Fatos sobre caes', 'Dogs dream']
  },
  'jsonplaceholder': {
    phrase: 'me mostra um post do json placeholder',
    mock: { id: 5, title: 'Test post', body: 'This is a body.' },
    expect: ['Post 5', 'Test post']
  },
  'countapi': {
    phrase: 'quantas visitas meu site tem',
    mock: { value: 12345 },
    expect: ['Total de visitas: 12345']
  },
  'fox': {
    phrase: 'me mostra uma raposa',
    mock: { image: 'https://randomfox.ca/images/1.jpg' },
    expect: ['Raposa:', 'https://randomfox.ca']
  },
  'emoji': {
    phrase: 'manda um emoji',
    mock: { name: 'grinning face', category: 'smileys', htmlCode: ['&#128512;'] },
    expect: ['&#128512;', 'grinning face']
  },
  'fruityvice': {
    phrase: 'info sobre fruta banana',
    mock: { name: 'Banana', family: 'Musaceae', nutritions: { calories: 89, sugar: 12.2, carbohydrates: 22.8, protein: 1.1, fat: 0.3 } },
    expect: ['Banana (Musaceae)', 'Calorias: 89']
  },
  'deckofcards': {
    phrase: 'sorteia uma carta',
    mock: { cards: [{ value: 'ACE', suit: 'SPADES', image: 'https://deckofcardsapi.com/static/img/A.png' }], remaining: 51 },
    expect: ['Carta: ACE', 'Restantes: 51']
  },
  'tronalddump': {
    phrase: 'frase do trump',
    mock: { value: 'Nobody knows the system better than me.' },
    expect: ['Tronald Dump:', 'Nobody knows']
  },
  'urban': {
    phrase: 'o que quer dizer na giria glow up',
    mock: { list: [{ word: 'glow up', definition: 'A transformation for the better.', example: 'She had a huge glow up.' }] },
    expect: ['Giria: glow up', 'A transformation']
  },
  'shibe': {
    phrase: 'me mostra um shiba',
    mock: ['https://shibe.online/api/shibes/a.jpg'],
    expect: ['Shiba:', 'shibe.online']
  }
};

async function withFetch(mockFn, run) {
  const orig = loader.ctx.fetch;
  loader.ctx.fetch = mockFn;
  try { return await run(); } finally { loader.ctx.fetch = orig; }
}

describe('central merge: tools/*.js <-> Brain.EXTERNAL_TOOLS', () => {
  for (const name of Object.keys(APIS)) {
    const api = APIS[name];
    test(name + ': source module and Brain entry agree', () => {
      const src = require(path.join(__dirname, '..', 'tools', name + '.js'));
      const entry = Brain.EXTERNAL_TOOLS[name];
      assert.ok(entry, 'Brain.EXTERNAL_TOOLS missing key "' + name + '"');
      assert.strictEqual(entry.desc, src.desc, name + ': desc divergiu do source');
      assert.strictEqual(entry.build(api.phrase, {}), src.build(api.phrase, {}), name + ': build divergiu do source');
      assert.strictEqual(entry.parse(api.mock), src.parse(api.mock), name + ': parse divergiu do source');
    });

    test(name + ': intentExternal roteia para "' + name + '"', () => {
      assert.strictEqual(Brain.intentExternal(api.phrase), name);
    });

    test(name + ': runExternal e2e com fetch mockado', async () => {
      let captured = '';
      const out = await withFetch((u) => {
        captured = String(u);
        return Promise.resolve({ ok: true, json: () => Promise.resolve(api.mock) });
      }, () => Brain.runExternal(name, api.phrase, {}));
      assert.strictEqual(captured, Brain.EXTERNAL_TOOLS[name].build(api.phrase, {}), name + ': URL capturada != build()');
      for (const expected of api.expect) {
        assert.ok(out.indexOf(expected) !== -1, name + ': saida sem "' + expected + '" -> ' + out);
      }
    });
  }
});

describe('central merge: integridade do registro', () => {
  test('todos os keys tools/*.js estao em EXTERNAL_TOOLS', () => {
    const fs = require('node:fs');
    const files = fs.readdirSync(path.join(__dirname, '..', 'tools')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
    const missing = files.filter((f) => !Brain.EXTERNAL_TOOLS[f]);
    assert.deepEqual(missing, [], 'ferramentas ausentes de EXTERNAL_TOOLS: ' + missing.join(', '));
  });

  test('novas tools nao quebraram as 5 originais', () => {
    assert.strictEqual(Brain.intentExternal('clima em sao paulo'), 'open-meteo');
    assert.strictEqual(Brain.intentExternal('quem foi einstein wikipedia'), 'wikipedia');
    assert.strictEqual(Brain.intentExternal('musica do pink floyd'), 'itunes');
    assert.strictEqual(Brain.intentExternal('info pokemon charizard'), 'pokemon');
    assert.strictEqual(Brain.intentExternal('instala lodash npm'), 'npm');
    assert.strictEqual(Brain.intentExternal('bom dia tudo bem'), null);
  });
});