import { assertConfig, config } from './config.js';
import { createApp } from './app.js';
import { closePool } from './db.js';

assertConfig();

const server = createApp().listen(config.port, () => {
  console.log(`ReFound API listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  });
}
