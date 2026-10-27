import { prisma } from '../config/db.js';
import { generateToken, hashToken } from './token.js';

export const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface CreateSessionResult {
  sessionToken: string; // Plain token to be returned to the client once
  expiresAt: Date;
}

/**
 * Creates a new access session for a verified share.
 * Generates a random session token, stores ONLY its SHA-256 hash in the database,
 * and returns the raw token to the client.
 */
export async function createAccessSession(shareId: string): Promise<CreateSessionResult> {
  const sessionToken = generateToken();
  const sessionTokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.accessSession.create({
    data: {
      shareId,
      sessionTokenHash,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

/**
 * Verifies if an access session token is valid for a given share:
 * - Computes the hash of the supplied candidate token
 * - Finds matching session record in PostgreSQL
 * - Verifies it belongs to the given share
 * - Checks that expiresAt has not passed
 */
export async function verifyAccessSession(
  shareId: string,
  sessionToken: string
): Promise<boolean> {
  if (!sessionToken || !shareId) {
    return false;
  }

  const sessionTokenHash = hashToken(sessionToken);

  const session = await prisma.accessSession.findUnique({
    where: { sessionTokenHash },
  });

  if (!session) {
    return false;
  }

  if (session.shareId !== shareId) {
    return false;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    return false;
  }

  return true;
}
