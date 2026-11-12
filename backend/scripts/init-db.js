// Apply db/schema.sql. Safe to run more than once.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
import { assertConfig } from '../src/config.js';

assertConfig();

const schemaPath = fileURLToPath(new URL('../db/schema.sql', import.meta.url));

try {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Schema applied from db/schema.sql');
} catch (err) {
  console.error('Schema failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
