// Create (or update) one staff account. Staff are never created through the API.
// Usage: STAFF_EMAIL=... STAFF_PASSWORD=... npm run seed:staff
import bcrypt from 'bcryptjs';
import { assertConfig, config } from '../src/config.js';
import { pool } from '../src/db.js';

assertConfig();

const email = (process.env.STAFF_EMAIL ?? '').trim().toLowerCase();
const password = process.env.STAFF_PASSWORD ?? '';
const name = (process.env.STAFF_NAME ?? 'Help Desk').trim();

if (!email.includes('@') || password.length < 8) {
  console.error('Set STAFF_EMAIL and a STAFF_PASSWORD of at least 8 characters.');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, config.bcryptRounds);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'staff')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'staff'
     RETURNING id, email, role`,
    [name, email, hash]
  );
  console.log(`Staff account ready: ${rows[0].email} (role ${rows[0].role}, id ${rows[0].id})`);
} catch (err) {
  console.error('Could not create staff account:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
