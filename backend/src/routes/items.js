import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { formatRef } from '../lib/ref.js';
import { parseItemInput, toPublicItem } from '../lib/items.js';
import { requireAuth } from '../middleware/auth.js';

export const itemsRouter = Router();

const STAFF = ['staff', 'supervisor'];

const ITEM_COLUMNS = `id, ref, title, description, category, location,
                      found_on::text AS found_on, status`;

// POST /api/items — a volunteer registers a found item.
// Public listing and search (GET /api/items) belong to the public API work.
itemsRouter.post('/', requireAuth(STAFF), async (req, res, next) => {
  try {
    const input = parseItemInput(req.body, { HttpError });

    const item = await withTransaction(async (client) => {
      const { rows: seq } = await client.query(`SELECT nextval('item_ref_seq') AS n`);
      const ref = formatRef(Number(seq[0].n));

      const { rows } = await client.query(
        `INSERT INTO items (ref, title, description, category, location, found_on, private_note, registered_by)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8)
         RETURNING ${ITEM_COLUMNS}`,
        [ref, input.title, input.description, input.category, input.location,
         input.foundOn, input.privateNote, req.user.id]
      );

      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
         VALUES ($1, 'item.registered', 'item', $2, $3)`,
        [req.user.id, String(rows[0].id),
         { ref, title: input.title, category: input.category, location: input.location }]
      );

      return rows[0];
    });

    // The private note is deliberately absent from this response.
    res.status(201).json({ item: toPublicItem(item) });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:ref/claims — staff-only: the private answers, for ownership checks.
itemsRouter.get('/:ref/claims', requireAuth(STAFF), async (req, res, next) => {
  try {
    const { rows: items } = await query('SELECT id, ref, title, status FROM items WHERE ref = $1', [req.params.ref]);
    const item = items[0];
    if (!item) throw new HttpError(404, `No item with reference ${req.params.ref}.`);

    const { rows: claims } = await query(
      `SELECT c.id, c.status, c.description, c.identifying,
              c.lost_on::text AS lost_on, c.lost_where,
              c.created_at, u.name AS claimant_name, u.email AS claimant_email, u.student_id AS claimant_student_id
       FROM claims c
       JOIN users u ON u.id = c.user_id
       WHERE c.item_id = $1
       ORDER BY c.created_at DESC`,
      [item.id]
    );

    res.json({
      item: { ref: item.ref, title: item.title, status: item.status },
      claims: claims.map((c) => ({
        id: c.id,
        status: c.status,
        claimant: { name: c.claimant_name, email: c.claimant_email, studentId: c.claimant_student_id },
        answers: { description: c.description, identifying: c.identifying, lostOn: c.lost_on, lostWhere: c.lost_where },
        submittedAt: c.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});
