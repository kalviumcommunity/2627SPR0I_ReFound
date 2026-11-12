import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const publicUser = (row) => ({
  name: row.name,
  email: row.email,
  studentId: row.student_id,
  role: row.role,
});

const signToken = (user) =>
  jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// POST /api/auth/signup — students only. Staff accounts come from `npm run seed:staff`.
authRouter.post('/signup', async (req, res, next) => {
  try {
    const name = text(req.body?.name);
    const studentId = text(req.body?.studentId);
    const email = text(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!name) throw new HttpError(400, 'Name is required.');
    if (!email.includes('@')) throw new HttpError(400, 'A valid email is required.');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    // The role is hard-coded: signup can only ever create a student.
    const { rows } = await query(
      `INSERT INTO users (name, student_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'student')
       RETURNING id, name, email, student_id, role`,
      [name, studentId || null, email, passwordHash]
    );
    const user = rows[0];
    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    if (err.code === '23505') {
      return next(new HttpError(409, 'An account with this email already exists. Try logging in.'));
    }
    next(err);
  }
});

// POST /api/auth/login — the returned role is the one in the database.
authRouter.post('/login', async (req, res, next) => {
  try {
    const email = text(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) throw new HttpError(400, 'Email and password are required.');

    const { rows } = await query(
      'SELECT id, name, email, student_id, role, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    // Same message for "no such account" and "wrong password": do not confirm which emails exist.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw new HttpError(401, 'Email or password is incorrect.');

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — lets the frontend check a stored session.
authRouter.get('/me', requireAuth(), (req, res) => {
  res.json({ user: publicUser(req.user) });
});
