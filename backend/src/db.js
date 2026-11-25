import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

// An idle pooled client can drop — a database restart, a network blip, Render's
// free Postgres waking up. Without a listener that is an unhandled 'error' event
// on the pool and Node terminates the process, so one blip becomes an outage.
pool.on('error', (err) => {
  console.error('Idle database client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);

/** Run fn inside a transaction, rolling back on any throw. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const closePool = () => pool.end();
