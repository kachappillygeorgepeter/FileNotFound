import crypto from 'node:crypto';

/**
 * Generates a high-entropy 32-byte URL-safe base64 token.
 * Yields 256 bits of entropy.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Produces a SHA-256 hex digest of any token for safe database storage and lookup.
 * Raw tokens should never be stored in persistent storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
