import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ResolvedShare } from '../middleware/resolveShare.js';
import { buildShareMetadata } from '../services/metadataService.js';
import { comparePassword, createAccessSession, logger } from '../utils/index.js';
import { SESSION_COOKIE_NAME } from '../middleware/requireSession.js';

// Constant dummy bcrypt hash used to normalize verification execution time
// and eliminate timing leaks when share does not require a password or is dummy tested
const DUMMY_HASH = '$2a$12$e8kP09h9.12x3V3vG.1Vke.kG28Z6nE8f7k1p9Yq8z6nE8f7k1p9Y';

/**
 * GET /api/shares/:token
 * Lookup endpoint:
 * - If protected by password: returns only { passwordRequired: true }
 * - If not protected: returns full metadata
 */
export async function lookupShareController(req: Request, res: Response): Promise<void> {
  const share = req.share as ResolvedShare;

  if (share.passwordHash) {
    // Zero information disclosure before password verification
    res.status(200).json({ passwordRequired: true });
    return;
  }

  // Not password protected, safe to return full metadata
  const metadata = buildShareMetadata(share);
  res.status(200).json(metadata);
}

/**
 * GET /api/shares/:token/metadata
 * Protected metadata endpoint:
 * - Requires valid session (via requireSessionMiddleware)
 * - Returns full metadata for protected shares
 */
export async function getProtectedMetadataController(req: Request, res: Response): Promise<void> {
  const share = req.share as ResolvedShare;
  const metadata = buildShareMetadata(share);
  res.status(200).json(metadata);
}

/**
 * POST /api/shares/:token/verify
 * Password verification endpoint:
 * - Constant-time execution prevents timing leaks
 * - Issues a 5-minute access session on success
 * - Sets HTTP-only cookie and returns raw session token in JSON response
 */
export async function verifySharePasswordController(req: Request, res: Response): Promise<void> {
  const share = req.share as ResolvedShare;
  const { password } = req.body || {};

  // If share does not have a password
  if (!share.passwordHash) {
    // Run dummy compare to balance timing
    await bcrypt.compare(typeof password === 'string' ? password : '', DUMMY_HASH).catch(() => {});
    const metadata = buildShareMetadata(share);
    res.status(200).json({ ...metadata, message: 'No password required for this share.' });
    return;
  }

  const candidatePassword = typeof password === 'string' ? password : '';
  const isMatch = await comparePassword(candidatePassword, share.passwordHash);

  if (!isMatch) {
    logger.warn('Failed password attempt on share', {
      shareId: share.id,
      ip: req.ip,
    });
    // Return generic error and reveal NO metadata
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  // Password matches: generate session token, store hash in DB with 5-min expiry
  const { sessionToken, expiresAt } = await createAccessSession(share.id);
  logger.info('Password verified successfully, session issued', {
    shareId: share.id,
  });

  // Set HTTP-only cookie for seamless browser handling
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
  });

  // Return raw session token once, along with the unlocked share metadata
  const metadata = buildShareMetadata(share);
  res.status(200).json({
    sessionToken,
    sessionExpiresAt: expiresAt.toISOString(),
    ...metadata,
  });
}
