// Audit log reader for supervisors — FRONTEND MOCK.
// TODO(backend): GET /api/audit?action=&q= (supervisor only). The backend already
// writes audit_log rows; it does not expose a read endpoint yet.

import { KEYS, read, wait } from "./mockDb.js";

export const ACTIONS = {
  "item.registered": { label: "Item logged", tone: "marker" },
  "claim.submitted": { label: "Claim filed", tone: "sky" },
  "claim.approved": { label: "Claim approved", tone: "ink" },
  "claim.rejected": { label: "Claim rejected", tone: "stamp" },
  "item.handed_over": { label: "Handed over", tone: "rose" },
};

/** "claim.reviewed" entries are split by outcome so they can be filtered separately. */
export const actionKey = (entry) =>
  entry.action === "claim.reviewed" ? `claim.${entry.detail?.status}` : entry.action;

export function describe(entry) {
  const d = entry.detail ?? {};
  const what = d.title ? `${d.title} (${d.ref})` : d.ref ?? entry.entityId;
  switch (actionKey(entry)) {
    case "item.registered":
      return `Logged ${what}, found at ${d.location}.`;
    case "claim.submitted":
      return `Filed claim ${entry.entityId} for ${what}.`;
    case "claim.approved":
      return `Approved claim ${entry.entityId} by ${d.claimant} for ${what}.`;
    case "claim.rejected":
      return `Rejected claim ${entry.entityId} by ${d.claimant} for ${what}.`;
    case "item.handed_over":
      return `Handed ${what} to ${d.claimant} after an ID check${d.note ? ` — “${d.note}”` : ""}.`;
    default:
      return `${entry.action} on ${entry.entity} ${entry.entityId}`;
  }
}

export async function listAudit({ action = "", q = "" } = {}) {
  await wait(200);
  const needle = q.trim().toLowerCase();
  return read(KEYS.audit, []).filter((e) => {
    if (action && actionKey(e) !== action) return false;
    if (!needle) return true;
    const hay = `${e.entityId} ${e.detail?.ref ?? ""} ${e.detail?.title ?? ""} ${e.detail?.claimant ?? ""} ${e.actor?.name ?? ""} ${e.actor?.email ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
}

/** CSV of the given entries, for supervisors to keep or share with administration. */
export function toCsv(entries) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [e.at, e.actor?.name, e.actor?.role, ACTIONS[actionKey(e)]?.label ?? e.action, e.entityId, describe(e)].map(cell).join(",")
  );
  return ["Time,Who,Role,Action,Reference,Details", ...rows].join("\r\n");
}
