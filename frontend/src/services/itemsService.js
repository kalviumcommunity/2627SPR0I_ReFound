// Items + claims service — FRONTEND MOCK.
// Swap each function body for a fetch() call when the Express API exists.

import { CATEGORY_COLORS, ITEMS } from "../data/items.js";

const CLAIMS_KEY = "refound.mockClaims";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const CATEGORIES = [...new Set(ITEMS.map((i) => i.category))].sort();
export const LOCATIONS = [...new Set(ITEMS.map((i) => i.location))].sort();

export const colorFor = (category) => CATEGORY_COLORS[category] ?? "marker";

export function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Public search. Every keyword must match somewhere in the item's public fields. */
export async function searchItems({ q = "", category = "", location = "" } = {}) {
  // TODO(backend): GET /api/items?q=&category=&location=
  await wait(250);
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return ITEMS.filter((item) => {
    if (category && item.category !== category) return false;
    if (location && item.location !== location) return false;
    const haystack = `${item.ref} ${item.title} ${item.description} ${item.category} ${item.location}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  }).sort((a, b) => b.foundOn.localeCompare(a.foundOn));
}

export async function getItem(ref) {
  // TODO(backend): GET /api/items/:ref
  await wait(200);
  const item = ITEMS.find((i) => i.ref.toLowerCase() === String(ref).toLowerCase());
  if (!item) throw new Error("not-found");
  return item;
}

function readClaims() {
  try {
    return JSON.parse(localStorage.getItem(CLAIMS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeClaims(claims) {
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  } catch {
    // storage unavailable — claim still shows for this page load
  }
}

export function findMyClaim(email, ref) {
  return readClaims().find((c) => c.email === email && c.ref === ref) ?? null;
}

export async function getMyClaims(email) {
  // TODO(backend): GET /api/claims/mine
  await wait(200);
  return readClaims()
    .filter((c) => c.email === email)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/** Submit a private ownership claim. Only staff will ever see the answers. */
export async function submitClaim({ item, user, description, identifying, lostOn, lostWhere }) {
  // TODO(backend): POST /api/items/:ref/claims (server must check the user is a signed-in student)
  await wait(600);
  if (!description.trim() || !identifying.trim()) throw new Error("Fill in both description fields.");
  if (findMyClaim(user.email, item.ref)) throw new Error("You've already claimed this item.");

  const claim = {
    id: `CL-${Date.now().toString().slice(-6)}`,
    ref: item.ref,
    itemTitle: item.title,
    category: item.category,
    email: user.email,
    status: "pending",
    lostOn: lostOn || null,
    lostWhere: lostWhere.trim() || null,
    // Private answers — in the real app these live server-side, staff-only.
    description: description.trim(),
    identifying: identifying.trim(),
    submittedAt: new Date().toISOString(),
  };
  writeClaims([...readClaims(), claim]);
  return claim;
}
