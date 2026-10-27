import crypto from 'node:crypto';

/**
 * Constant-time comparison between two strings or buffers.
 * Returns true if inputs are identical, false otherwise, without leaking timing differences.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    // Prevent timing discrepancy of early exit by comparing against itself
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
