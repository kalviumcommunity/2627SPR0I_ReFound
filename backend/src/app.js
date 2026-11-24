import express from 'express';
import cors from 'cors';
import { HttpError } from './lib/errors.js';
import { query } from './db.js';
import { authRouter } from './routes/auth.js';
import { itemsRouter } from './routes/items.js';
import { claimsRouter } from './routes/claims.js';
import { auditRouter } from './routes/audit.js';
import { staffRouter } from './routes/staff.js';

// libpq connection failures and the "shutting down"/"cannot connect now" codes.
const DB_DOWN_CODES = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH',
  '57P01', '57P03', '08000', '08001', '08003', '08004', '08006',
]);

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Render uses this path as its health check, so it has to fail when the
  // database is gone. Reporting ok without touching it hid a dead database.
  app.get('/api/health', async (req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true, db: 'up' });
    } catch (err) {
      console.error('Health check failed:', err.message);
      res.status(503).json({ ok: false, db: 'down' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/staff', staffRouter);

  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    // The database being unreachable is not our bug, and it is not a 500: it is
    // 503, so a client knows to retry instead of treating the request as broken.
    if (DB_DOWN_CODES.has(err.code)) {
      console.error('Database unavailable:', err.code, err.message);
      return res.status(503).json({ error: 'The database is unavailable right now. Try again shortly.' });
    }
    console.error('Unhandled error:', err);
    // Never leak a stack trace or a database message to the caller.
    res.status(500).json({ error: 'Something went wrong on our side.' });
  });

  return app;
}
