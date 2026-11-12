export const REF_PREFIX = 'RF-';

/**
 * Format a sequence number as a public reference code.
 * formatRef(149) -> "RF-0149"
 */
export function formatRef(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`formatRef needs a positive integer, received: ${n}`);
  }
  return `${REF_PREFIX}${String(n).padStart(4, '0')}`;
}
