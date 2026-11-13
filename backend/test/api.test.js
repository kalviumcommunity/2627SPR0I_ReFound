/**
 * Integration tests for the staff slice: auth, item registration, claim review, handover.
 *
 * Needs a real PostgreSQL database — run against one with:
 *   DATABASE_URL=postgres://... JWT_SECRET=<32+ chars> npm test
 *
 * Claim *submission* is the public API (another slice), so these tests insert a
 * claim directly to exercise staff review. Nothing here mocks the database.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
const skip = DATABASE_URL ? false : 'DATABASE_URL is not set — start PostgreSQL and re-run.';

process.env.JWT_SECRET ??= 'test-secret-that-is-definitely-long-enough-32';
process.env.BCRYPT_ROUNDS ??= '4';

let pool, server, baseUrl;

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test('staff slice: auth, registration, review, handover', { skip }, async (t) => {
  const { createApp } = await import('../src/app.js');
  const db = await import('../src/db.js');
  pool = db.pool;

  const schema = await readFile(fileURLToPath(new URL('../db/schema.sql', import.meta.url)), 'utf8');
  await pool.query(schema);
  await pool.query('TRUNCATE audit_log, handovers, claims, items, users RESTART IDENTITY CASCADE');
  await pool.query('ALTER SEQUENCE item_ref_seq RESTART WITH 149');

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const staffEmail = 'staff@campus.edu';
  const supervisorEmail = 'supervisor@campus.edu';
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'staff')`,
    ['Help Desk', staffEmail, await bcrypt.hash('staff-password-1', 4)]
  );
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'supervisor')`,
    ['Campus Supervisor', supervisorEmail, await bcrypt.hash('supervisor-pass-1', 4)]
  );

  let staffToken, studentToken, studentId, itemRef, claimId, secondClaimId, secondItemRef, supervisorToken;

  await t.test('health check answers', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });

  await t.test('signup creates a student, never a staff account', async () => {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Jeevan HD', studentId: 'S2401', email: 'Jeevan@Campus.edu', password: 'student-pass-1', role: 'staff' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'student', 'a signup request must not be able to ask for the staff role');
    assert.equal(res.body.user.email, 'jeevan@campus.edu');
    studentToken = res.body.token;
    studentId = res.body.user;
  });

  await t.test('signup rejects a short password and a duplicate email', async () => {
    const short = await request('/api/auth/signup', { method: 'POST', body: { name: 'X', email: 'x@campus.edu', password: 'short' } });
    assert.equal(short.status, 400);
    const dupe = await request('/api/auth/signup', { method: 'POST', body: { name: 'Y', email: 'jeevan@campus.edu', password: 'student-pass-1' } });
    assert.equal(dupe.status, 409);
  });

  await t.test('login returns the database role and rejects a bad password', async () => {
    const bad = await request('/api/auth/login', { method: 'POST', body: { email: staffEmail, password: 'wrong-password' } });
    assert.equal(bad.status, 401);
    assert.match(bad.body.error, /incorrect/);

    const good = await request('/api/auth/login', { method: 'POST', body: { email: staffEmail, password: 'staff-password-1', role: 'student' } });
    assert.equal(good.status, 200);
    assert.equal(good.body.user.role, 'staff', 'role comes from the database, not the request body');
    staffToken = good.body.token;
  });

  await t.test('registration is refused without a token and to a student', async () => {
    const anon = await request('/api/items', { method: 'POST', body: { title: 'x', description: 'y', category: 'Keys', location: 'Library' } });
    assert.equal(anon.status, 401);

    const asStudent = await request('/api/items', {
      method: 'POST', token: studentToken,
      body: { title: 'x', description: 'y', category: 'Keys', location: 'Library' },
    });
    assert.equal(asStudent.status, 403);
  });

  await t.test('staff registers an item and never sees the private note come back', async () => {
    const res = await request('/api/items', {
      method: 'POST', token: staffToken,
      body: {
        title: 'Silver laptop charger', description: 'USB-C charger with a braided cable.',
        category: 'Electronics', location: 'Library', foundOn: '2026-11-11',
        privateNote: 'SERIAL-9931, staff only',
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.item.ref, 'RF-0149');
    assert.equal(res.body.item.status, 'available');
    assert.equal(res.body.item.foundOn, '2026-11-11');
    assert.ok(!('privateNote' in res.body.item));
    assert.ok(!JSON.stringify(res.body).includes('SERIAL-9931'), 'private note leaked into the response');
    itemRef = res.body.item.ref;
  });

  await t.test('registration validates the form', async () => {
    const missing = await request('/api/items', { method: 'POST', token: staffToken, body: { title: 'Umbrella' } });
    assert.equal(missing.status, 400);
    const badDate = await request('/api/items', {
      method: 'POST', token: staffToken,
      body: { title: 'a', description: 'b', category: 'Keys', location: 'Library', foundOn: '11/11/2026' },
    });
    assert.equal(badDate.status, 400);
  });

  await t.test('claims for an item are staff-only and include the private answers', async () => {
    const { rows } = await pool.query('SELECT id FROM items WHERE ref = $1', [itemRef]);
    const itemId = rows[0].id;
    const { rows: studentRows } = await pool.query('SELECT id FROM users WHERE email = $1', ['jeevan@campus.edu']);
    // Claim submission itself is the public API slice; inserted here to test staff review.
    const inserted = await pool.query(
      `INSERT INTO claims (item_id, user_id, description, identifying, lost_where)
       VALUES ($1, $2, 'My charger, the cable is frayed near the plug.', 'Name written on the plug in blue ink.', 'Library')
       RETURNING id`,
      [itemId, studentRows[0].id]
    );
    claimId = inserted.rows[0].id;

    const asStudent = await request(`/api/items/${itemRef}/claims`, { token: studentToken });
    assert.equal(asStudent.status, 403);

    const asStaff = await request(`/api/items/${itemRef}/claims`, { token: staffToken });
    assert.equal(asStaff.status, 200);
    assert.equal(asStaff.body.claims.length, 1);
    assert.match(asStaff.body.claims[0].answers.identifying, /blue ink/);
    assert.equal(asStaff.body.claims[0].claimant.email, 'jeevan@campus.edu');
  });

  await t.test('handover is refused before a claim is approved', async () => {
    const res = await request(`/api/claims/${claimId}/handover`, { method: 'POST', token: staffToken, body: { identityChecked: true } });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /approved claim/);
  });

  await t.test('staff approves a claim and the item is reserved', async () => {
    const res = await request(`/api/claims/${claimId}`, { method: 'PATCH', token: staffToken, body: { status: 'approved' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.claim.status, 'approved');

    const { rows } = await pool.query('SELECT status FROM items WHERE ref = $1', [itemRef]);
    assert.equal(rows[0].status, 'claimed');

    const again = await request(`/api/claims/${claimId}`, { method: 'PATCH', token: staffToken, body: { status: 'rejected' } });
    assert.equal(again.status, 409, 'a reviewed claim cannot be reviewed twice');
  });

  await t.test('handover needs an identity check, then succeeds once', async () => {
    const unchecked = await request(`/api/claims/${claimId}/handover`, { method: 'POST', token: staffToken, body: { identityChecked: false } });
    assert.equal(unchecked.status, 400);

    const ok = await request(`/api/claims/${claimId}/handover`, {
      method: 'POST', token: staffToken,
      body: { identityChecked: true, identityNote: 'Student ID S2401 checked against the campus card.' },
    });
    assert.equal(ok.status, 201);

    const { rows } = await pool.query('SELECT status FROM items WHERE ref = $1', [itemRef]);
    assert.equal(rows[0].status, 'handed_over');

    const twice = await request(`/api/claims/${claimId}/handover`, { method: 'POST', token: staffToken, body: { identityChecked: true } });
    assert.equal(twice.status, 409);
  });

  await t.test('a rejected claim leaves the item available', async () => {
    const item = await request('/api/items', {
      method: 'POST', token: staffToken,
      body: { title: 'Red umbrella', description: 'Foldable.', category: 'Accessories', location: 'Main gate' },
    });
    assert.equal(item.status, 201);
    secondItemRef = item.body.item.ref;

    const { rows: itemRows } = await pool.query('SELECT id FROM items WHERE ref = $1', [secondItemRef]);
    const { rows: userRows } = await pool.query('SELECT id FROM users WHERE email = $1', ['jeevan@campus.edu']);
    const claim = await pool.query(
      `INSERT INTO claims (item_id, user_id, description, identifying) VALUES ($1, $2, 'Mine', 'Has a sticker') RETURNING id`,
      [itemRows[0].id, userRows[0].id]
    );
    secondClaimId = claim.rows[0].id;

    const rejected = await request(`/api/claims/${secondClaimId}`, { method: 'PATCH', token: staffToken, body: { status: 'rejected' } });
    assert.equal(rejected.status, 200);

    const { rows } = await pool.query('SELECT status FROM items WHERE ref = $1', [secondItemRef]);
    assert.equal(rows[0].status, 'available');
  });

  await t.test('every staff action is written to the audit log', async () => {
    const { rows } = await pool.query(`SELECT action FROM audit_log ORDER BY id`);
    const actions = rows.map((r) => r.action);
    assert.ok(actions.includes('item.registered'));
    assert.ok(actions.includes('claim.reviewed'));
    assert.ok(actions.includes('item.handed_over'));
    assert.equal(actions.filter((a) => a === 'item.registered').length, 2);
  });

  await t.test('the audit history is supervisor-only', async () => {
    const anon = await request('/api/audit');
    assert.equal(anon.status, 401);

    const asStudent = await request('/api/audit', { token: studentToken });
    assert.equal(asStudent.status, 403);

    const asStaff = await request('/api/audit', { token: staffToken });
    assert.equal(asStaff.status, 403, 'a desk volunteer acts on records but does not read the history');

    const login = await request('/api/auth/login', {
      method: 'POST', body: { email: supervisorEmail, password: 'supervisor-pass-1' },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'supervisor');
    supervisorToken = login.body.token;

    const asSupervisor = await request('/api/audit', { token: supervisorToken });
    assert.equal(asSupervisor.status, 200);
    assert.ok(asSupervisor.body.entries.length >= 5);
  });

  await t.test('audit entries carry the fields the logbook renders', async () => {
    const res = await request('/api/audit', { token: supervisorToken });
    const handed = res.body.entries.find((e) => e.action === 'item.handed_over');
    assert.equal(handed.detail.claimant, 'Jeevan HD');
    assert.equal(handed.detail.title, 'Silver laptop charger');
    assert.equal(handed.detail.note, 'Student ID S2401 checked against the campus card.');
    assert.equal(handed.actor.role, 'staff');
    assert.ok(handed.at, 'entry needs a timestamp');

    const registered = res.body.entries.find((e) => e.action === 'item.registered' && e.detail.ref === itemRef);
    assert.equal(registered.detail.title, 'Silver laptop charger');
    assert.equal(registered.detail.location, 'Library');

    const reviewed = res.body.entries.find((e) => e.action === 'claim.reviewed');
    assert.equal(reviewed.detail.claimant, 'Jeevan HD');
    assert.ok(reviewed.detail.status);
  });

  await t.test('the action filter splits claim.reviewed by outcome', async () => {
    const approved = await request('/api/audit?action=claim.approved', { token: supervisorToken });
    assert.equal(approved.status, 200);
    assert.ok(approved.body.entries.length >= 1);
    assert.ok(approved.body.entries.every((e) => e.action === 'claim.reviewed' && e.detail.status === 'approved'));

    const rejected = await request('/api/audit?action=claim.rejected', { token: supervisorToken });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.entries.length, 1);
    assert.ok(rejected.body.entries.every((e) => e.action === 'claim.reviewed' && e.detail.status === 'rejected'));

    const bad = await request('/api/audit?action=nonsense', { token: supervisorToken });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /Unknown action filter/);
  });

  await t.test('audit search, ordering and paging', async () => {
    const byRef = await request(`/api/audit?q=${itemRef}`, { token: supervisorToken });
    assert.equal(byRef.status, 200);
    assert.ok(byRef.body.entries.length >= 3, 'registration, review and handover all name this ref');
    assert.ok(byRef.body.entries.every((e) => e.detail.ref === itemRef));

    const byClaimant = await request('/api/audit?q=Jeevan', { token: supervisorToken });
    assert.ok(byClaimant.body.entries.length >= 1);

    const paged = await request('/api/audit?limit=1', { token: supervisorToken });
    assert.equal(paged.body.entries.length, 1);

    const all = await request('/api/audit', { token: supervisorToken });
    const ids = all.body.entries.map((e) => e.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a), 'newest first');
  });

  await t.test('an unknown route is a clean 404', async () => {
    const res = await request('/api/nope');
    assert.equal(res.status, 404);
  });

  await new Promise((resolve) => server.close(resolve));
  await db.closePool();
});
