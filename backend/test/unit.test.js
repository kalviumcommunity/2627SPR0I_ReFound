import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRef } from '../src/lib/ref.js';
import { toPublicItem, parseItemInput } from '../src/lib/items.js';
import { HttpError } from '../src/lib/errors.js';

test('formatRef builds zero-padded reference codes', () => {
  assert.equal(formatRef(149), 'RF-0149');
  assert.equal(formatRef(9), 'RF-0009');
  assert.equal(formatRef(1000), 'RF-1000');
});

test('formatRef refuses anything that is not a positive integer', () => {
  for (const bad of [0, -1, 1.5, '149', null, undefined]) {
    assert.throws(() => formatRef(bad), /positive integer/);
  }
});

test('toPublicItem exposes exactly the public fields', () => {
  const row = {
    id: 7, ref: 'RF-0149', title: 'Silver laptop charger', description: 'USB-C charger.',
    category: 'Electronics', location: 'Library', found_on: '2026-11-11', status: 'available',
    private_note: 'SERIAL-9931 — staff only', registered_by: 3,
  };
  const item = toPublicItem(row);
  assert.deepEqual(Object.keys(item).sort(), ['category', 'description', 'foundOn', 'location', 'ref', 'status', 'title']);
  assert.equal(item.foundOn, '2026-11-11');
  assert.ok(!('private_note' in item));
  assert.ok(!JSON.stringify(item).includes('SERIAL-9931'));
});

test('parseItemInput trims values and defaults optional fields', () => {
  const parsed = parseItemInput({ title: '  Umbrella ', description: 'Red', category: 'Accessories', location: 'Main gate' }, { HttpError });
  assert.equal(parsed.title, 'Umbrella');
  assert.equal(parsed.foundOn, null);
  assert.equal(parsed.privateNote, null);
});

test('parseItemInput rejects missing fields and bad dates', () => {
  assert.throws(() => parseItemInput({ title: 'Umbrella' }, { HttpError }), /required: description, category, location/);
  assert.throws(
    () => parseItemInput({ title: 'a', description: 'b', category: 'c', location: 'd', foundOn: '11-11-2026' }, { HttpError }),
    /YYYY-MM-DD/
  );
});
