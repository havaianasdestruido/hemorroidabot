// HemorroidaBot Model Manager
// Baixa modelos do HuggingFace e salva em cache no navegador (Cache Storage API).

var ModelManager = (function() {
  var CACHE_NAME = 'hemorroida-models-v1';

  // Modelos conhecidos (repo HF + arquivo .gguf principal sugerido).
  var KNOWN_MODELS = [
    { id: 'qwen-3b',   repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF',  file: 'qwen2.5-3b-instruct-q4_k_m.gguf' },
    { id: 'qwen-7b',   repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF',  file: 'qwen2.5-7b-instruct-q4_k_m.gguf' },
    { id: 'llama-3.2', repo: 'bartowski/Llama-3.2-3B-Instruct-GGUF', file: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf' },
    { id: 'gemma-3',   repo: 'ggml-org/gemma-3-4b-it-GGUF',     file: 'gemma-3-4b-it-Q4_K_M.gguf' },
  ];

  // Abre o cache de modelos (persistente no navegador).
  function openCache() {
    if (!('caches' in window)) {
      throw new Error('Cache API nao suportada neste navegador.');
    }
    return caches.open(CACHE_NAME);
  }

  // Monta URL de download de um arquivo do repo.
  function fileURL(repo, file, revision) {
    var rev = revision || 'main';
    var base = String(repo).replace(/\/+$/, '');
    return 'https://huggingface.co/' + base + '/resolve/' + rev + '/' + file;
  }

  // Verifica se uma URL ja esta em cache (nao precisa baixar de novo).
  function isCached(url) {
    return openCache().then(function(cache) {
      return cache.match(url).then(function(resp) {
        return !!resp;
      });
    });
  }

  // Baixa um arquivo e guarda no cache. Retorna blob com progresso via callback.
  function downloadFile(url, onProgress) {
    return fetch(url, { mode: 'cors' }).then(function(response) {
      if (!response.ok) {
        throw new Error('Falha no download: HTTP ' + response.status);
      }
      var contentLength = +response.headers.get('Content-Length') || 0;
      var reader = response.body.getReader();
      var received = 0;
      var chunks = [];

      function pump() {
        return reader.read().then(function(result) {
          if (result.done) return Promise.resolve(new Blob(chunks));
          chunks.push(result.value);
          received += result.value.length;
          if (onProgress && contentLength) {
            onProgress(received, contentLength);
          }
          return pump();
        });
      }

      return pump();
    }).then(function(blob) {
      return openCache().then(function(cache) {
        var resp = new Response(blob, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
        return cache.put(url, resp).then(function() {
          return blob;
        });
      });
    });
  }

  // Baixa um arquivo do repo (usa cache se ja existir).
  function download(repo, file, revision, onProgress) {
    var url = fileURL(repo, file, revision);
    return isCached(url).then(function(cached) {
      if (cached) {
        return openCache().then(function(cache) {
          return cache.match(url).then(function(resp) { return resp.blob(); });
        });
      }
      return downloadFile(url, onProgress);
    });
  }

  // Lista os arquivos de um modelo no HF via API.
  function listFiles(repo, revision) {
    var rev = revision || 'main';
    var api = 'https://huggingface.co/api/models/' + repo + '/tree/' + rev;
    return fetch(api, { mode: 'cors' }).then(function(r) {
      if (!r.ok) throw new Error('Repo nao encontrado: ' + repo);
      return r.json();
    });
  }

  // Retorna o tamanho em cache de um repo (soma dos blobs).
  function repoCachedSize(repo, files, revision) {
    var urls = files.map(function(f) {
      return fileURL(repo, f, revision);
    });
    return openCache().then(function(cache) {
      return Promise.all(urls.map(function(u) { return cache.match(u); }))
        .then(function(resps) {
          return Promise.all(resps.map(function(r) {
            return r ? r.arrayBuffer() : Promise.resolve(new ArrayBuffer(0));
          })).then(function(bufs) {
            return bufs.reduce(function(a, b) { return a + b.byteLength; }, 0);
          });
        });
    });
  }

  function findKnown(id) {
    for (var i = 0; i < KNOWN_MODELS.length; i++) {
      if (KNOWN_MODELS[i].id === id) return KNOWN_MODELS[i];
    }
    return null;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(i === 0 ? 0 : 2) + ' ' + units[i];
  }

  return {
    knownModels: KNOWN_MODELS,
    findKnown: findKnown,
    formatBytes: formatBytes,
    fileURL: fileURL,
    isCached: isCached,
    download: download,
    downloadFile: downloadFile,
    listFiles: listFiles,
    repoCachedSize: repoCachedSize,
    resolveBase: 'https://huggingface.co'
  };
})();
