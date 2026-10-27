import { prisma } from '../config/db.js';

export interface ReservationResult {
  success: boolean;
  isNowExhausted?: boolean;
}

/**
 * Executes the atomic download reservation query.
 * Increments `downloadsUsed` by 1 ONLY if:
 * 1. Token hash matches
 * 2. Share is not marked deleted (`deletedAt IS NULL`)
 * 3. Share has not expired (`expiresAt > timezone('UTC', NOW())`)
 * 4. downloadsUsed is strictly less than maxDownloads (`downloadsUsed < maxDownloads`)
 * 
 * In PostgreSQL, this atomic conditional update acts as a row-level mutex:
 * - Exactly one concurrent transaction succeeds when 1 slot remains.
 * - Updated rows = 1: reservation secured.
 * - Updated rows = 0: exhausted, expired, or deleted; rejected immediately.
 */
export async function reserveDownloadSlot(tokenHash: string): Promise<ReservationResult> {
  const updatedCount = await prisma.$executeRaw`
    UPDATE "Share"
    SET "downloadsUsed" = "downloadsUsed" + 1
    WHERE "tokenHash" = ${tokenHash}
      AND "deletedAt" IS NULL
      AND "expiresAt" > timezone('UTC', NOW())
      AND "downloadsUsed" < "maxDownloads"
  `;

  if (updatedCount === 0) {
    return { success: false };
  }

  // Check if this reservation exhausted the share limit
  const share = await prisma.share.findUnique({
    where: { tokenHash },
    select: { downloadsUsed: true, maxDownloads: true },
  });

  const isNowExhausted = share ? share.downloadsUsed >= share.maxDownloads : false;

  return {
    success: true,
    isNowExhausted,
  };
}
