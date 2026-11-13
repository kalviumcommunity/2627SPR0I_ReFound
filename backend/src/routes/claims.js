import { Router } from 'express';
import { withTransaction } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const claimsRouter = Router();

const STAFF = ['staff', 'supervisor'];

async function lockClaim(client, id) {
  const { rows } = await client.query(
    `SELECT c.id, c.item_id, c.user_id, c.status,
            i.ref, i.title AS item_title, i.status AS item_status,
            u.name AS claimant_name, u.email AS claimant_email
     FROM claims c
     JOIN items i ON i.id = c.item_id
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1
     FOR UPDATE OF c`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'No claim with that id.');
  return rows[0];
}

// PATCH /api/claims/:id — staff approve or reject a claim.
claimsRouter.patch('/:id', requireAuth(STAFF), async (req, res, next) => {
  try {
    const status = String(req.body?.status ?? '');
    if (!['approved', 'rejected'].includes(status)) {
      throw new HttpError(400, "status must be 'approved' or 'rejected'.");
    }

    const result = await withTransaction(async (client) => {
      const claim = await lockClaim(client, req.params.id);
      if (claim.status !== 'pending') {
        throw new HttpError(409, `This claim was already ${claim.status}.`);
      }

      const { rows } = await client.query(
        `UPDATE claims SET status = $1, reviewed_by = $2, reviewed_at = now()
         WHERE id = $3
         RETURNING id, status, item_id, reviewed_at`,
        [status, req.user.id, claim.id]
      );

      if (status === 'approved') {
        // An approved claim reserves the item, unless it is already spoken for.
        await client.query(
          `UPDATE items SET status = 'claimed' WHERE id = $1 AND status = 'available'`,
          [claim.item_id]
        );
      }

      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
         VALUES ($1, 'claim.reviewed', 'claim', $2, $3)`,
        [req.user.id, String(claim.id),
         { status, ref: claim.ref, title: claim.item_title, claimId: claim.id,
           claimant: claim.claimant_name, claimantEmail: claim.claimant_email }]
      );

      return rows[0];
    });

    res.json({ claim: { id: result.id, status: result.status, reviewedAt: result.reviewed_at } });
  } catch (err) {
    next(err);
  }
});

// POST /api/claims/:id/handover — record the handover after an identity check.
claimsRouter.post('/:id/handover', requireAuth(STAFF), async (req, res, next) => {
  try {
    // Handing an item to someone without checking who they are is the failure this guards.
    if (req.body?.identityChecked !== true) {
      throw new HttpError(400, 'A handover needs a recorded identity check (identityChecked: true).');
    }
    const identityNote = typeof req.body?.identityNote === 'string' ? req.body.identityNote.trim() : null;

    const handover = await withTransaction(async (client) => {
      const claim = await lockClaim(client, req.params.id);
      if (claim.status !== 'approved') {
        throw new HttpError(409, 'Only an approved claim can be handed over.');
      }
      if (claim.item_status === 'handed_over') {
        throw new HttpError(409, 'This item was already handed over.');
      }

      const { rows } = await client.query(
        `INSERT INTO handovers (item_id, claim_id, handed_over_by, identity_checked, identity_note)
         VALUES ($1, $2, $3, true, $4)
         RETURNING id, handed_over_at`,
        [claim.item_id, claim.id, req.user.id, identityNote]
      );

      await client.query(`UPDATE items SET status = 'handed_over' WHERE id = $1`, [claim.item_id]);

      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
         VALUES ($1, 'item.handed_over', 'item', $2, $3)`,
        [req.user.id, String(claim.item_id),
         { ref: claim.ref, title: claim.item_title, claimId: claim.id,
           claimant: claim.claimant_name, identityChecked: true, note: identityNote }]
      );

      return rows[0];
    });

    res.status(201).json({
      handover: { id: handover.id, claimId: Number(req.params.id), handedOverAt: handover.handed_over_at },
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(new HttpError(409, 'This item was already handed over.'));
    }
    next(err);
  }
});
