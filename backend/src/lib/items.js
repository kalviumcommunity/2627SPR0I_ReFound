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
  if (foundOn && !DATE_ONLY.test(foundOn)) {
    throw new HttpError(400, 'foundOn must be a date in YYYY-MM-DD form.');
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
