import { Request, Response, NextFunction } from 'express';
import { verifyAccessSession } from '../utils/session.js';

export const SESSION_HEADER_NAME = 'x-session-token';
export const SESSION_COOKIE_NAME = 'access_session_token';

/**
 * Middleware that validates the session token for password-protected shares.
 * Accepts session token via 'x-session-token' header or HTTP-only cookie.
 */
export async function requireSessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const share = req.share;

  if (!share) {
    res.status(500).json({ error: 'Share resolution must run before session check.' });
    return;
  }

  // If share doesn't have a password, session is not required
  if (!share.passwordHash) {
    next();
    return;
  }

  // Extract session token from header or cookie
  const headerToken = req.headers[SESSION_HEADER_NAME] as string | undefined;
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const sessionToken = headerToken || cookieToken;

  if (!sessionToken) {
    res.status(401).json({
      error: 'Password verification required to access this share.',
      passwordRequired: true,
    });
    return;
  }

  const isValid = await verifyAccessSession(share.id, sessionToken);

  if (!isValid) {
    res.status(401).json({
      error: 'Access session expired or invalid. Please verify password again.',
      passwordRequired: true,
    });
    return;
  }

  next();
}
