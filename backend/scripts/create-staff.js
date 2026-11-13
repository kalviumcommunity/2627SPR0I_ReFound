// Create (or update) one staff or supervisor account. Neither is created through the API.
// Usage: STAFF_EMAIL=... STAFF_PASSWORD=... [STAFF_ROLE=supervisor] npm run seed:staff
import bcrypt from 'bcryptjs';
import { assertConfig, config } from '../src/config.js';
import { pool } from '../src/db.js';

assertConfig();

const email = (process.env.STAFF_EMAIL ?? '').trim().toLowerCase();
const password = process.env.STAFF_PASSWORD ?? '';
const name = (process.env.STAFF_NAME ?? 'Help Desk').trim();
const role = (process.env.STAFF_ROLE ?? 'staff').trim();

if (!email.includes('@') || password.length < 8) {
  console.error('Set STAFF_EMAIL and a STAFF_PASSWORD of at least 8 characters.');
  process.exit(1);
}
if (!['staff', 'supervisor'].includes(role)) {
  console.error("STAFF_ROLE must be 'staff' or 'supervisor'.");
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, config.bcryptRounds);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
     RETURNING id, email, role`,
    [name, email, hash, role]
  );
  console.log(`Staff account ready: ${rows[0].email} (role ${rows[0].role}, id ${rows[0].id})`);
} catch (err) {
  console.error('Could not create staff account:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
