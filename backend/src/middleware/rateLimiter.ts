import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * 1. Upload Rate Limiter:
 * Allows 10 uploads per 15 minutes per IP to avoid storage exhaustion.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many upload requests. Please try again after 15 minutes.',
  },
});

/**
 * 2. Password Verification Rate Limiter:
 * Very strict: keyed by IP and share token together.
 * Allows max 5 attempts per 15 minutes per (IP + share token) combination.
 */
export const verifyPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const token = req.params.token || 'unknown-token';
    return `${ip}:${token}`;
  },
  message: {
    error: 'Too many incorrect password attempts. Please try again after 15 minutes.',
  },
});

/**
 * 3. General Lookup & Download Rate Limiter:
 * Moderate limits: 60 requests per minute per IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
});
