// Entrega somente os arquivos estáticos listados da aplicação. Não há API ou persistência.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/js/task-rules.js', ['js/task-rules.js', 'text/javascript; charset=utf-8']],
  ['/js/task-storage.js', ['js/task-storage.js', 'text/javascript; charset=utf-8']],
  ['/js/task-view.js', ['js/task-view.js', 'text/javascript; charset=utf-8']],
  ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
]);

module.exports = function createStaticServer() {
  return http.createServer(async (request, response) => {
  const file = files.get(new URL(request.url, 'http://127.0.0.1').pathname);
  if (!file || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await fs.readFile(path.join(root, file[0]));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(500).end();
  }
  });
};
