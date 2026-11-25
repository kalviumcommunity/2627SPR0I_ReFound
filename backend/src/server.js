import { assertConfig, config } from './config.js';
import { createApp } from './app.js';
import { closePool } from './db.js';

assertConfig();

const server = createApp().listen(config.port, () => {
  console.log(`ReFound API listening on http://localhost:${config.port}`);
});

let shuttingDown = false;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received — finishing in-flight requests`);

    server.close(async () => {
      await closePool();
      process.exit(0);
    });

    // close() waits for open sockets, and a keep-alive client (the healthcheck is
    // one) can hold one open indefinitely. Drop the idle ones now, and anything
    // still streaming after the grace period, so `docker stop` stays prompt.
    server.closeIdleConnections();
    setTimeout(() => server.closeAllConnections(), 5000).unref();
  });
}
