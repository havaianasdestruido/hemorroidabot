# AGENTS.md — HemorroidaBot (HBOT)

Instrucoes canonicas para agentes de IA trabalharem neste repositorio.

> **Hierarquia:** este arquivo (AGENTS.md) e a fonte unica da verdade. `CLAUDE.md` e `AI.md` sao apenas ponteiros para ele. Se houver conflito entre arquivos de instrucao, prevalece este.

---

## 1. Sobre o projeto

HemorroidaBot e um assistente "MEGABRAIN" 100% client-side: roda **inteiramente em JS do lado do cliente** (`src/`), sem backend proprio, sem banco de dados e sem servico pago.

- **Modelo de linguagem local (GGUF) executado via WASM** (`wllama`/llama.cpp), vendored em `vendor/`.
- Conversa pelo browser: o usuario pode **ditar** (web speech) ou **digitar**; o bot responde com voz (TTS) e texto.
- Todas as mensagens/UI/comentarios em **pt-BR**; sem acentos em identificadores (ASCII).
- Frase fixa do projeto: "MEGABRAIN so com JS no front-end (e uma IA burra de 8B ou menos)".

## 2. Estrutura do repositorio

```
hemorroidabot/
├─ server.js          # Servidor estatico Node (http nativo). PORT=8080. Serve o diretorio atual (ROOT).
├─ README.md          # Visao geral, lista de ferramentas e legenda de dificuldade (pt-BR).
├─ package.json       # CommonJS (type: "commonjs"). Scripts: serve / test / test:api-live / test:inference.
├─ package-lock.json  # Lockfile (commitado; CI usa `npm ci`).
├─ src/
│  ├─ index.html      # UI plain HTML, minimo de CSS, pt-BR.
│  ├─ app.js          # Glue: mensagens, voz (web speech), TTS, toggle de APIs mortas, engine UI.
│  ├─ brain.js        # NUCLEO: EXTERNAL_TOOLS (keyless, dead:true/false), LOCAL_TOOLS, memoria, roteamento.
│  ├─ models.js       # ModelManager: download de GGUF via HuggingFace + Cache Storage.
│  └─ engine.js       # Engine WASM (wllama/llama.cpp). Carga/chat/inferencia, streaming onToken.
├─ test/
│  ├─ *.test.js       # Suites node:test (rodadas por `npm test`).
│  ├─ harness.js      # Carrega JS de browser num sandbox Node (vm) p/ testar o brain.
│  ├─ api-live.suite.js   # Suite live (usa --raw flag).
│  └─ inference.suite.js  # Suite de inferencia WASM (so com modelo em cache).
├─ tools/
│  └─ *.js            # 47 clientes de APIs externas keyless/keyless-friendly (um por ferramenta).
├─ .github/
│  ├─ workflows/      # ci.yml, label.yml, pages.yml (deploy com gate de testes).
│  └─ labeler.yml     # config do labeler.
└─ vendor/
   ├─ wllama/         # library WASM + compat. **NAO editar manualmente.**
   └─ wllama-compat/  # shims de compatibilidade. **NAO editar manualmente.**
```

## 3. Arquitetura e fluxo de dados

```
[navegador]
  index.html + app.js (UI, voz, TTS)
        │  usam o objeto exportado por brain.js (window.Brain)
        v
  brain.js
     ├─ EXTERNAL_TOOLS : registro de APIs externas keyless (sem auth), com
     │     chave `dead:true/false` (toggle de APIs mortas) e gate CORS-friendly.
     │  - inclui chave: getDeadTools()/isDeadToolsEnabled() controlam visibilidade.
     ├─ LOCAL_TOOLS    : ferramentas locais (calculator, uuid, timestamp,
     │     base64, json-formatter, text-counter, color-converter...).
     ├─ memoria        : historico em localStorage.
     ├─ roteamento     : heuristica de intencao (local → externa → modelo).
     └─ engine WASM    : dispatch para engine.js (wllama) p/ gerar texto com o modelo.
```

Fluxo de uma mensagem:
1. Usuario envia texto (digita ou dita) → `app.js`.
2. `handleMessage` tenta `Brain.intentLocal(text)`; se casar com ferramenta local, executa e retorna.
3. Senao tenta `Brain.intentExternal(text)`; se casar com API keyless, monta chain/URL e chama `runExternal` (respeitando o toggle de mortas).
4. Nenhum dos acima → gera resposta com o modelo local via `engine.js` (createChatCompletion, streaming).
5. Historico persistido em localStorage; contexto limitado (~40 msgs) e recorte por memoria recente.

## 4. Entry points e comandos

```bash
npm run serve          # `node server.js` → http://localhost:8080 (PORT env, default 8080)
npm test               # suíte completa node:test (`test/*.test.js` + `test/api/*.test.js`)
npm run test:api-live  # suite de APIs ao vivo (usa rede; pode ter flake/rate-limit)
npm run test:inference # suite de inferencia WASM (so com modelo baixado/cache)
node --check <file>    # syntax check (usado pelo CI em src/app.js, brain.js, models.js, server.js)
```

- **Nao ha** comandos de lint/format/typecheck configurados (sem eslint/prettier/tsc). O CI valida por `npm test` + `node --check`.

## 5. Convencoes

- **Idioma:** pt-BR em tudo (mensagens, comentarios, status). Sem acentos em nomes de variaveis/funcoes/arquivos (ASCII).
- **Nomes:** camelCase para JS (`loadModelFromCache`, `getDeadTools`); arquivos em lowercase (ex: `json-formatter.js`); classes em PascalCase (`ModelManager`).
- **DOM/UI:** tudo via `document.getElementById` com ids `-` (ex: `model-select`, `user-input`, `messages`).
- **Vendor:** `vendor/wllama*` sao binarios WASM + lib versionada. **Nao modificar**; referencie via caminho relativo ao JS (ex: `WLLAMA_JS_URL`).

## 6. Regras de dependencias

- **Zero runtime de terceiros fora do vendored:** dependencia publica do projeto + vendored `wllama`. Nao adicione frameworks/pacotes de UI.
- CommonJS (`require`), `type: "commonjs"` em package.json.
- Se adicionar pacote: `npm install <pkg>` commitando `package-lock.json` junto.

## 7. Regras de teste (obrigatorias)

- Toda mudanca em `brain.js`/`app.js` exige suite em `test/` (node:test), idealmente usando `test/harness.js` p/ carregar o JS num sandbox e injetar `localStorage` fake.
- Para toggle de APIs mortas: manter testes que cobrem `getDeadTools()`, `isDeadToolsEnabled()` e visibilidade das tools `dead:true` (off por padrao).
- **O gate e `npm test` verde.** Nunca quebre um teste existente sem atualizalo na mesma mudanca.
- Suites live (`api-live`, `inference`) podem falhar por rede/rate-limit/cache ausente — nao sao gate de merge no CI.

## 8. Erro / seguranca / performance

- **Erros de fetch/externo:** sempre `try/catch` e retorno de string de erro amigavel (pt-BR); nunca deixe promise rejeitada cruzar para a UI.
- **Seguranca:** expressoes do usuario que viram `Function(...)` (ex: calculator) sao sanitizadas (`/[^0-9+\-*/().%\s]/`) antes de avaliar. Preserve essa sanitizacao ao mexer em ferramentas locais.
- **CORS:** APIs externas devem ser CORS-friendly/keyless; nao registre API que o browser nao consiga chamar de front.
- **Memoria/WASM:** engine WASM em worker; respeite COOP/COEP (headers `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` no `server.js`) — removê-los quebra o multithread WASM.
- **Perf:** nao baixe/re-baixe modelos sem Cache Storage; use o cache existente (`models.js`). Streaming via `onToken`.

## 9. Configuracao / ambiente

- **Variavel de ambiente:** apenas `PORT` (default 8080) usada por `server.js`. Nao ha `.env`.
- **Nao ha auth**: todas as APIs externas registradas sao keyless por design (a permanencia desse requisito e importante).
- Armazenamento: `localStorage` (historico e flag de APIs mortas). Cache de modelos via Cache Storage.

## 10. Checklist antes de terminar uma tarefa

- [ ] `npm test` passa (nenhum teste quebrado).
- [ ] Mudancas em `brain.js`/`app.js` com teste cobrindo (harness).
- [ ] Nomes/convencoes seguem a secao 5.
- [ ] Nenhuma dependencia nova desnecessaria; CommonJS; sem tocar em `vendor/`.
- [ ] Se mudou logica de API: verificado CORS-friendly/keyless e toggle de mortas.
- [ ] README/arquivos de docs atualizados quando UI/APIs mudarem.
