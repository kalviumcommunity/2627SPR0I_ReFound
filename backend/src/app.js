import express from 'express';
import cors from 'cors';
import { HttpError } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { itemsRouter } from './routes/items.js';
import { claimsRouter } from './routes/claims.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/claims', claimsRouter);

  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error('Unhandled error:', err);
    // Never leak a stack trace or a database message to the caller.
    res.status(500).json({ error: 'Something went wrong on our side.' });
  });

  return app;
}
