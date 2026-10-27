import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { hashToken } from '../utils/token.js';
import { Share, File } from '@prisma/client';

export type ResolvedShare = Share & {
  files: File[];
};

export const GENERIC_SHARE_NOT_FOUND_MSG = 'Share not found or no longer available.';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      share?: ResolvedShare;
    }
  }
}

/**
 * Shared share-resolution middleware.
 * Hashes incoming token and validates that:
 * 1. Share exists
 * 2. Share is not marked deleted
 * 3. Expiry timestamp has not passed (request-time expiry check)
 * 4. Downloads used is strictly less than max downloads
 * 
 * Returns the exact same generic 404 response for all failure cases
 * to prevent leaking whether a token existed or not.
 */
export async function resolveShareMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.params.token;

  if (!token || typeof token !== 'string') {
    res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
    return;
  }

  const tokenHash = hashToken(token);

  try {
    const share = await prisma.share.findUnique({
      where: { tokenHash },
      include: { files: true },
    });

    if (!share) {
      res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
      return;
    }

    // Check deleted flag
    if (share.deletedAt !== null) {
      res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
      return;
    }

    // Check request-time expiration
    if (share.expiresAt.getTime() <= Date.now()) {
      res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
      return;
    }

    // Check download limit exhaustion
    if (share.downloadsUsed >= share.maxDownloads) {
      res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
      return;
    }

    // Attach valid share to request
    req.share = share;
    next();
  } catch (error) {
    console.error('Error resolving share:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
