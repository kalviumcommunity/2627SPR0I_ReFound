/**
 * The ONLY place a public item shape is built.
 *
 * private_note and everything about claims stay out of it. If a field is added
 * to the items table and it is private, it must not be listed here.
 */
export function toPublicItem(row) {
  return {
    ref: row.ref,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    foundOn: row.found_on,
    status: row.status,
  };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * 2026-02-31 has the right shape and is not a real day. Postgres rejects it, and
 * that rejection used to surface as a 500 from a request that was simply wrong.
 */
function isRealDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Validate the staff registration form. Returns a clean object or throws a 400. */
export function parseItemInput(body, { HttpError }) {
  const text = (value) => (typeof value === 'string' ? value.trim() : '');
  const title = text(body?.title);
  const description = text(body?.description);
  const category = text(body?.category);
  const location = text(body?.location);
  const foundOn = text(body?.foundOn);
  const privateNote = text(body?.privateNote);

  const missing = [
    ['title', title],
    ['description', description],
    ['category', category],
    ['location', location],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new HttpError(400, `These fields are required: ${missing.join(', ')}.`);
  }
  if (foundOn && (!DATE_ONLY.test(foundOn) || !isRealDate(foundOn))) {
    throw new HttpError(400, 'foundOn must be a real date in YYYY-MM-DD form.');
  }
  // The staff form already blocks this; the API is the side that has to enforce it.
  if (foundOn && foundOn > todayISO()) {
    throw new HttpError(400, 'foundOn cannot be in the future.');
  }

  return {
    title,
    description,
    category,
    location,
    foundOn: foundOn || null,
    privateNote: privateNote || null,
  };
}
