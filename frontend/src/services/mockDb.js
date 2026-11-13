// Tiny browser-side "database" for the frontend mocks.
// Student and staff screens share it, so a claim filed as a student shows up
// on the staff desk in the same browser. Removed once the real API is wired in.

export const KEYS = {
  users: "refound.mockUsers",
  claims: "refound.mockClaims",
  items: "refound.mockItems", // items registered by staff
  itemStatus: "refound.mockItemStatus", // status overrides for the seed items
  refSeq: "refound.mockRefSeq",
  audit: "refound.mockAudit", // mirrors the backend audit_log table
};

/** Append an audit entry. Same idea as the INSERT INTO audit_log calls in the backend. */
export function appendAudit({ actor, action, entity, entityId, detail = {} }) {
  const entry = {
    id: `AU-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    at: new Date().toISOString(),
    actor: actor ? { name: actor.name, email: actor.email, role: actor.role } : null,
    action,
    entity,
    entityId,
    detail,
  };
  write(KEYS.audit, [entry, ...read(KEYS.audit, [])]);
  return entry;
}

export function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode) — changes last for this page load only
  }
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const todayISO = () => new Date().toISOString().slice(0, 10);
