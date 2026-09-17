# HemorróidaBot
[![CI](https://github.com/havaianasdestruido/hemorroidabot/actions/workflows/ci.yml/badge.svg)](https://github.com/havaianasdestruido/hemorroidabot/actions/workflows/ci.yml)

Esse projeto é um exemplo de como você pode fazer um MEGABRAIN só com JS no front-end. (e uma IA burra de 8B ou menos, como `Qwen 2.5 3B/7B, Llama 3.2 3B, Gemma 3 4B etc.`)

Ele é 100% local-side, ou sejs, ele é interamente feito em JS do lado do cliente.

A interface dele é idiotamente simples, é literalmente _plain HTML_, ou seja, o mínimo de CSS.

## Funcionalidade
Você pode ditar / "conversar" com o bot, ou pode digitar com ele.

Você pode alternar entre qual modelo você vai querer usar

## APIs
De forma resumida, eu planejo que o HBOT suporte todos esses serviços abaixo:

> **Legenda de dificuldade:**
> 🟢 Fácil — API simples, GET básico, JSON direto
> 🟡 Média — requer parsing maior ou autenticação leve
> 🟠 Médio-Alto — resposta complexa, multi-endpoint ou rate-limit pesado
> 🔴 Difícil — estrutura complexa, autenticação obrigatória ou múltiplas APIs encadeadas


### 🌐 Web / Informação
- 🟢 DuckDuckGo — API HTML/JSON simples, sem auth
- ✅ 🟢 Wikipedia — REST API direta, sem auth
- 🟡 Wikidata — SPARQL complexo mas sem auth
- 🟠 OpenStreetMap — Nominatim + Overpass exigem queries específicas
- 🟠 Nominatim — rate-limit rigoroso, reverse geocoding preciso
- 🟠 Overpass API — linguagem de query própria, payloads grandes
- ✅ 🟢 Open-Meteo — REST simples, sem auth, JSON direto
- 🟢 Sunrise-Sunset API — GET simples, poucos parâmetros

### ⏱️ Utilidades
- 🟢 WorldTimeAPI — GET simples por timezone
- ✅ 🟢 Frankfurter API — conversão de moedas GET direto
- 🟡 Calendarific — exige API key (gratuita)
- 🟡 APIs públicas de calendários/feriados — variam muito entre países

### 📚 Conhecimento / Pesquisa
- ✅ 🟢 Open Library — REST simples, sem auth
- 🟡 Crossref — JSON direto mas metadados densos
- 🟡 arXiv — Atom/XML, precisa parsear feed
- 🟠 Internet Archive — API extensa, multiplos serviços
- 🟡 OpenAlex — REST simples mas payload grande

### 🎮 Games / Anime
- ✅ 🟢 PokéAPI — REST JSON excelente, sem auth, bem documentada
- ✅ 🟢 Jikan — REST JSON, sem auth, wrapper MAL
- 🟡 AniList — GraphQL, precisa montar queries

### 🎵 Música
- ✅ 🟢 Last.FM — GET simples, sem auth (limitada)
- 🟡 MusicBrainz — rate-limit estrito, formato ISO especial
- ✅ 🟡 ListenBrainz — exige Submission API + auth p/ submissões
- ✅ 🟠 Deezer API — API key obrigatória, CORS restrito no browser
- ✅ 🟢 iTunes Search API — GET simples, sem auth
- 🟢 Lyrics.ovh — GET simples, sem auth (limitada)

### 💻 Desenvolvimento
- ✅ 🟡 GitHub API — rate limit 60/h sem auth, mais com token
- ✅ 🟢 npm Registry API — GET direto, sem auth
- 🟢 PyPI JSON API — JSON direto, sem auth
- 🟡 MDN — API de busca, resposta HTML que precisa parsear
- 🟡 Stack Exchange API — rate limit, precisa de sort/filter
- 🟡 Libraries.io — exige API key

### 🧮 Ferramentas locais
- ✅ 🟢 Calculator — lógica JS pura, sem API externa
- 🟢 Unit Converter — lógica JS pura, sem API externa
- ✅ 🟢 JSON Formatter — lógica JS pura, sem API externa
- ✅ 🟢 Base64 Encoder/Decoder — nativo JS (atob/btoa)
- ✅ 🟢 UUID Generator — `crypto.randomUUID()` nativo
- 🟢 Regex Tester — regex nativo JS
- ✅ 🟢 Timestamp Converter — `Date` nativo JS
- ✅ 🟢 Color Converter — lógica matemática simples
- ✅ 🟢 Text Counter — contagem de chars/palavras, JS puro
