import { Router } from 'express';
import { query } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const auditRouter = Router();

/**
 * The logbook splits claim.reviewed by its outcome, so it filters on
 * claim.approved / claim.rejected rather than the raw action name.
 */
const ACTION_FILTERS = {
  'item.registered': `a.action = 'item.registered'`,
  'claim.submitted': `a.action = 'claim.submitted'`,
  'claim.approved': `a.action = 'claim.reviewed' AND a.detail->>'status' = 'approved'`,
  'claim.rejected': `a.action = 'claim.reviewed' AND a.detail->>'status' = 'rejected'`,
  'item.handed_over': `a.action = 'item.handed_over'`,
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET /api/audit?action=&q=&limit= — supervisor-only history, newest first.
auditRouter.get('/', requireAuth(['supervisor']), async (req, res, next) => {
  try {
    const action = String(req.query.action ?? '').trim();
    const q = String(req.query.q ?? '').trim();
    const requested = Number(req.query.limit ?? DEFAULT_LIMIT);
    const limit = Math.min(Math.max(Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : DEFAULT_LIMIT, 1), MAX_LIMIT);

    const where = [];
    const params = [];

    if (action) {
      const filter = ACTION_FILTERS[action];
      if (!filter) {
        throw new HttpError(400, `Unknown action filter. Use one of: ${Object.keys(ACTION_FILTERS).join(', ')}.`);
      }
      where.push(filter);
    }

    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(`(a.entity_id ILIKE ${p}
        OR a.detail->>'ref' ILIKE ${p}
        OR a.detail->>'title' ILIKE ${p}
        OR a.detail->>'claimant' ILIKE ${p}
        OR u.name ILIKE ${p}
        OR u.email ILIKE ${p})`);
    }

    params.push(limit);
    const { rows } = await query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at,
              u.name AS actor_name, u.role AS actor_role, u.email AS actor_email
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.id DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({
      entries: rows.map((row) => ({
        id: row.id,
        at: row.created_at,
        actor: { name: row.actor_name, role: row.actor_role, email: row.actor_email },
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        detail: row.detail ?? {},
      })),
    });
  } catch (err) {
    next(err);
  }
});
