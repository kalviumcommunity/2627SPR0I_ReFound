// Staff desk service — FRONTEND MOCK of Jeevan's staff API (backend/src/routes).
// Each function names the endpoint it stands in for; request and response
// shapes follow the backend so swapping in fetch() is a small change.

import { KEYS, appendAudit, read, todayISO, wait, write } from "./mockDb.js";
import { loadAllItems, toPublicItem } from "./itemsService.js";
import { loadSession } from "../auth/authService.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const formatRef = (n) => `RF-${String(n).padStart(4, "0")}`;

function setItemStatus(ref, status) {
  const registered = read(KEYS.items, []);
  if (registered.some((i) => i.ref === ref)) {
    write(KEYS.items, registered.map((i) => (i.ref === ref ? { ...i, status } : i)));
  } else {
    write(KEYS.itemStatus, { ...read(KEYS.itemStatus, {}), [ref]: status });
  }
}

function findUser(email) {
  return read(KEYS.users, []).find((u) => u.email === email) ?? null;
}

/** Same rules as parseItemInput() in backend/src/lib/items.js. */
export function validateItemInput(input) {
  const errors = {
    title: input.title.trim() ? "" : "Give the item a short name.",
    category: input.category ? "" : "Pick a category.",
    location: input.location.trim() ? "" : "Where was it found?",
    description: input.description.trim() ? "" : "Add a public description.",
    foundOn: "",
  };
  if (input.foundOn && !DATE_ONLY.test(input.foundOn)) errors.foundOn = "Use a valid date.";
  else if (input.foundOn && input.foundOn > todayISO()) errors.foundOn = "That date is in the future.";
  return errors;
}

/** POST /api/items — register a found item and allocate its reference code. */
export async function registerItem(input) {
  await wait(500);
  const seq = read(KEYS.refSeq, 149); // backend sequence also starts at 149
  const item = {
    ref: formatRef(seq),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    location: input.location.trim(),
    foundOn: input.foundOn || todayISO(),
    status: "available",
    privateNote: input.privateNote.trim() || null,
    registeredAt: new Date().toISOString(),
  };
  write(KEYS.refSeq, seq + 1);
  write(KEYS.items, [item, ...read(KEYS.items, [])]);
  appendAudit({
    actor: loadSession(),
    action: "item.registered",
    entity: "item",
    entityId: item.ref,
    detail: { ref: item.ref, title: item.title, category: item.category, location: item.location },
  });
  // Like the API, the response is the PUBLIC shape — the private note is not echoed back.
  return toPublicItem(item);
}

/** Claims with private answers, for the review screen. GET /api/items/:ref/claims per item in the real API. */
export async function listClaims() {
  await wait(250);
  const items = new Map(loadAllItems().map((i) => [i.ref, i]));
  return read(KEYS.claims, [])
    .map((c) => {
      const item = items.get(c.ref);
      const user = findUser(c.email);
      return {
        id: c.id,
        status: c.status,
        handedOverAt: c.handedOverAt ?? null,
        submittedAt: c.submittedAt,
        claimant: {
          name: c.claimantName ?? user?.name ?? "Unknown student",
          email: c.email,
          studentId: c.claimantStudentId ?? user?.studentId ?? null,
        },
        answers: {
          description: c.description,
          identifying: c.identifying,
          lostOn: c.lostOn,
          lostWhere: c.lostWhere,
        },
        item: item
          ? {
              ref: item.ref,
              title: item.title,
              category: item.category,
              location: item.location,
              foundOn: item.foundOn,
              status: item.status,
              privateNote: item.privateNote ?? null,
            }
          : { ref: c.ref, title: c.itemTitle, status: "unknown", privateNote: null },
      };
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function updateClaim(id, patch) {
  const claims = read(KEYS.claims, []);
  const claim = claims.find((c) => c.id === id);
  if (!claim) throw new Error("No claim with that id.");
  write(KEYS.claims, claims.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  return { ...claim, ...patch };
}

/** PATCH /api/claims/:id — approve or reject a pending claim. */
export async function reviewClaim(id, status) {
  await wait(400);
  if (!["approved", "rejected"].includes(status)) throw new Error("Status must be approved or rejected.");
  const current = read(KEYS.claims, []).find((c) => c.id === id);
  if (!current) throw new Error("No claim with that id.");
  if (current.status !== "pending") throw new Error(`This claim was already ${current.status}.`);

  const claim = updateClaim(id, { status, reviewedAt: new Date().toISOString() });
  if (status === "approved") {
    // An approved claim reserves the item, unless it is already spoken for.
    const item = loadAllItems().find((i) => i.ref === claim.ref);
    if (item?.status === "available") setItemStatus(claim.ref, "claimed");
  }
  appendAudit({
    actor: loadSession(),
    action: "claim.reviewed",
    entity: "claim",
    entityId: claim.id,
    detail: { status, ref: claim.ref, title: claim.itemTitle, claimant: claim.claimantName ?? claim.email },
  });
  return { id: claim.id, status: claim.status, reviewedAt: claim.reviewedAt };
}

/** POST /api/claims/:id/handover — needs an approved claim and a recorded identity check. */
export async function recordHandover(id, { identityChecked, identityNote }) {
  await wait(500);
  if (identityChecked !== true) throw new Error("Confirm that you checked the student's ID first.");
  const current = read(KEYS.claims, []).find((c) => c.id === id);
  if (!current) throw new Error("No claim with that id.");
  if (current.status !== "approved") throw new Error("Only an approved claim can be handed over.");
  const item = loadAllItems().find((i) => i.ref === current.ref);
  if (item?.status === "handed_over") throw new Error("This item was already handed over.");

  const handedOverAt = new Date().toISOString();
  updateClaim(id, { handedOverAt, identityNote: identityNote?.trim() || null });
  setItemStatus(current.ref, "handed_over");
  appendAudit({
    actor: loadSession(),
    action: "item.handed_over",
    entity: "item",
    entityId: current.ref,
    detail: {
      ref: current.ref,
      title: current.itemTitle,
      claimId: id,
      claimant: current.claimantName ?? current.email,
      identityChecked: true,
      note: identityNote?.trim() || null,
    },
  });
  return { id: `HO-${Date.now().toString().slice(-6)}`, claimId: id, handedOverAt };
}

/** Numbers for the desk overview (no single endpoint yet — derived from the lists). */
export async function getDeskSummary() {
  const claims = await listClaims();
  const items = loadAllItems();
  return {
    onRack: items.filter((i) => i.status !== "handed_over").length,
    pending: claims.filter((c) => c.status === "pending").length,
    awaitingHandover: claims.filter((c) => c.status === "approved" && !c.handedOverAt).length,
    returned: items.filter((i) => i.status === "handed_over").length,
    queue: claims.filter((c) => c.status === "pending").slice(0, 5),
    recentItems: read(KEYS.items, []).slice(0, 4).map(toPublicItem),
  };
}
