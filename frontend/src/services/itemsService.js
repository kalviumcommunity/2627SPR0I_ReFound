// Items + claims service (student side) — FRONTEND MOCK.
// Swap each function body for a fetch() call when the public API exists.

import { CATEGORY_COLORS, ITEMS } from "../data/items.js";
import { KEYS, read, wait, write } from "./mockDb.js";

export const CATEGORIES = Object.keys(CATEGORY_COLORS).sort();

export const colorFor = (category) => CATEGORY_COLORS[category] ?? "marker";

export function formatDate(iso) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Every item, INCLUDING the staff-only privateNote. Only the staff service may
 * use this directly — student-facing functions must go through toPublicItem().
 */
export function loadAllItems() {
  const overrides = read(KEYS.itemStatus, {});
  return [...read(KEYS.items, []), ...ITEMS].map((item) => ({
    ...item,
    status: overrides[item.ref] ?? item.status ?? "available",
  }));
}

/** Mirrors toPublicItem() in backend/src/lib/items.js — privateNote is never included. */
export function toPublicItem(item) {
  return {
    ref: item.ref,
    title: item.title,
    description: item.description,
    category: item.category,
    location: item.location,
    foundOn: item.foundOn,
    status: item.status,
  };
}

export function listLocations() {
  return [...new Set(loadAllItems().map((i) => i.location))].sort();
}

/** Public search. Every keyword must match somewhere in the item's public fields. */
export async function searchItems({ q = "", category = "", location = "" } = {}) {
  // TODO(backend): GET /api/items?q=&category=&location=
  await wait(250);
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return loadAllItems()
    .filter((item) => item.status !== "handed_over")
    .filter((item) => {
      if (category && item.category !== category) return false;
      if (location && item.location !== location) return false;
      const haystack = `${item.ref} ${item.title} ${item.description} ${item.category} ${item.location}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    })
    .sort((a, b) => b.foundOn.localeCompare(a.foundOn))
    .map(toPublicItem);
}

export async function getItem(ref) {
  // TODO(backend): GET /api/items/:ref
  await wait(200);
  const item = loadAllItems().find((i) => i.ref.toLowerCase() === String(ref).toLowerCase());
  if (!item) throw new Error("not-found");
  return toPublicItem(item);
}

const displayStatus = (claim) => (claim.handedOverAt ? "returned" : claim.status);

export function findMyClaim(email, ref) {
  const claim = read(KEYS.claims, []).find((c) => c.email === email && c.ref === ref);
  return claim ? { ...claim, status: displayStatus(claim) } : null;
}

export async function getMyClaims(email) {
  // TODO(backend): GET /api/claims/mine
  await wait(200);
  return read(KEYS.claims, [])
    .filter((c) => c.email === email)
    .map((c) => ({ ...c, status: displayStatus(c) }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/** Submit a private ownership claim. Only staff will ever see the answers. */
export async function submitClaim({ item, user, description, identifying, lostOn, lostWhere }) {
  // TODO(backend): POST /api/items/:ref/claims (server checks the user is a signed-in student)
  await wait(600);
  if (!description.trim() || !identifying.trim()) throw new Error("Fill in both description fields.");
  if (findMyClaim(user.email, item.ref)) throw new Error("You've already claimed this item.");
  if (item.status !== "available") throw new Error("This item is no longer open for claims.");

  const claim = {
    id: `CL-${Date.now().toString().slice(-6)}`,
    ref: item.ref,
    itemTitle: item.title,
    category: item.category,
    email: user.email,
    claimantName: user.name,
    claimantStudentId: user.studentId ?? null,
    status: "pending",
    lostOn: lostOn || null,
    lostWhere: lostWhere.trim() || null,
    // Private answers — in the real app these live server-side, staff-only.
    description: description.trim(),
    identifying: identifying.trim(),
    submittedAt: new Date().toISOString(),
  };
  write(KEYS.claims, [...read(KEYS.claims, []), claim]);
  return claim;
}
