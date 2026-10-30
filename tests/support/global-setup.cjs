const createStaticServer = require('./static-server.cjs');

// Servidor no processo de setup: dispensa encerramento de árvores de processos
// via taskkill no Windows. Uma porta ocupada gera erro, sem reutilizar outro site.
module.exports = async function globalSetup() {
  const server = createStaticServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4173, '127.0.0.1', resolve);
  });
  return async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  };
};
