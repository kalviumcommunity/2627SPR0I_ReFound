import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../lib/errors.js';

/**
 * Authenticate a bearer token and, optionally, require a role.
 *
 * The role is re-read from the database on every request. A token only says who
 * the caller is; it never decides what they are allowed to do, and the client
 * cannot promote itself by sending role=staff in a request body.
 */
export function requireAuth(allowedRoles = []) {
  return async function authGuard(req, res, next) {
    try {
      const [scheme, token] = String(req.get('authorization') ?? '').split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new HttpError(401, 'Missing bearer token. Sign in first.');
      }

      let payload;
      try {
        payload = jwt.verify(token, config.jwtSecret);
      } catch {
        throw new HttpError(401, 'Session is invalid or has expired. Sign in again.');
      }

      const { rows } = await query(
        'SELECT id, name, email, student_id, role FROM users WHERE id = $1',
        [payload.sub]
      );
      const user = rows[0];
      if (!user) throw new HttpError(401, 'This account no longer exists.');

      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        throw new HttpError(403, 'This action needs a staff account.');
      }

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
