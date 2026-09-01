# HemorróidaBot
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
1. 🟢 DuckDuckGo — API HTML/JSON simples, sem auth
2. 🟢 Wikipedia — REST API direta, sem auth
3. 🟡 Wikidata — SPARQL complexo mas sem auth
4. 🟠 OpenStreetMap — Nominatim + Overpass exigem queries específicas
5. 🟠 Nominatim — rate-limit rigoroso, reverse geocoding preciso
6. 🟠 Overpass API — linguagem de query própria, payloads grandes
7. 🟢 Open-Meteo — REST simples, sem auth, JSON direto
8. 🟢 Sunrise-Sunset API — GET simples, poucos parâmetros

### ⏱️ Utilidades
9. 🟢 WorldTimeAPI — GET simples por timezone
10. 🟢 Frankfurter API — conversão de moedas GET direto
11. 🟡 Calendarific — exige API key (gratuita)
12. 🟡 APIs públicas de calendários/feriados — variam muito entre países

### 📚 Conhecimento / Pesquisa
13. 🟢 Open Library — REST simples, sem auth
14. 🟡 Crossref — JSON direto mas metadados densos
15. 🟡 arXiv — Atom/XML, precisa parsear feed
16. 🟠 Internet Archive — API extensa, multiplos serviços
17. 🟡 OpenAlex — REST simples mas payload grande

### 🎮 Games / Anime
18. 🟢 PokéAPI — REST JSON excelente, sem auth, bem documentada
19. 🟢 Jikan — REST JSON, sem auth, wrapper MAL
20. 🟡 AniList — GraphQL, precisa montar queries

### 🎵 Música
21. 🟡 MusicBrainz — rate-limit estrito, formato ISO especial
22. 🟡 ListenBrainz — exige Submission API + auth para submissões
23. 🔴 Deezer API — API key obrigatória, CORS restrito no browser
24. 🟢 iTunes Search API — GET simples, sem auth
25. 🟢 Lyrics.ovh — GET simples, sem auth (limitada)

### 💻 Desenvolvimento
26. 🟡 GitHub API — rate limit 60/h sem auth, mais com token
27. 🟢 npm Registry API — GET direto, sem auth
28. 🟢 PyPI JSON API — JSON direto, sem auth
29. 🟡 MDN — API de busca, resposta HTML que precisa parsear
30. 🟡 Stack Exchange API — rate limit, precisa de sort/filter
31. 🟡 Libraries.io — exige API key

### 🧮 Ferramentas locais
32. 🟢 Calculator — lógica JS pura, sem API externa
33. 🟢 Unit Converter — lógica JS pura, sem API externa
34. 🟢 JSON Formatter — lógica JS pura, sem API externa
35. 🟢 Base64 Encoder/Decoder — nativo JS (atob/btoa)
36. 🟢 UUID Generator — `crypto.randomUUID()` nativo
37. 🟢 Regex Tester — regex nativo JS
38. 🟢 Timestamp Converter — `Date` nativo JS
39. 🟢 Color Converter — lógica matemática simples
40. 🟢 Text Counter — contagem de chars/palavras, JS puro
