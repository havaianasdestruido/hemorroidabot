const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

http.createServer(function(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  urlPath = path.normalize('/' + urlPath);
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch (e) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(ROOT, urlPath);

  if (
    urlPath.indexOf('\u0000') !== -1 ||
    urlPath.indexOf('..') !== -1 ||
    !(filePath === ROOT || filePath.startsWith(ROOT + path.sep))
  ) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    fs.readFile(filePath, function(err, data) {
      if (err) {
        res.writeHead(404);
        res.end('Not found: ' + urlPath);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  } catch (e) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
}).listen(PORT, function() {
  console.log('HemorroidaBot servido em http://localhost:' + PORT + '/');
  console.log('Header COOP/COEP habilitado (necessario para WASM multithread).');
});
