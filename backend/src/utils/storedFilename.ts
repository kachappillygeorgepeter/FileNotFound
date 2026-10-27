import crypto from 'node:crypto';

/**
 * Generates an opaque random UUID-based filename.
 * Guarantees zero leakage of the original filename or path metadata.
 */
export function generateStoredFilename(): string {
  return crypto.randomUUID();
}
