import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { generateToken, hashToken, hashPassword } from '../src/utils/index.js';

const app = createApp();

describe('Phase 6: Hardening (Rate Limits, Headers, Sanitized Errors)', () => {
  let bruteForceToken: string;

  beforeAll(async () => {
    bruteForceToken = generateToken();
    const passwordHash = await hashPassword('CorrectPassword123');

    await prisma.share.create({
      data: {
        tokenHash: hashToken(bruteForceToken),
        passwordHash,
        maxDownloads: 5,
        downloadsUsed: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    if (bruteForceToken) {
      await prisma.share.deleteMany({
        where: { tokenHash: hashToken(bruteForceToken) },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('1. Security Headers (Helmet & CORS)', () => {
    it('sets standard security headers on responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers).toHaveProperty('strict-transport-security');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('2. Rate Limiting on Password Verification (Brute Force Protection)', () => {
    it('blocks excessive failed password attempts with 429 Too Many Requests after 5 attempts', async () => {
      // First 5 attempts should return 401 Incorrect password
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post(`/api/shares/${bruteForceToken}/verify`)
          .send({ password: `WrongAttempt_${i}` });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked by rate limiter with 429
      const blockedRes = await request(app)
        .post(`/api/shares/${bruteForceToken}/verify`)
        .send({ password: 'AnotherAttempt' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toMatch(/Too many incorrect password attempts/i);
    });
  });

  describe('3. Body Limits & Error Handler Hardening', () => {
    it('rejects malformed JSON with 400 Bad Request and clean error without stack trace', async () => {
      const res = await request(app)
        .post(`/api/shares/${bruteForceToken}/verify`)
        .set('Content-Type', 'application/json')
        .send('{"invalidJson:');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Malformed JSON in request body.');
      expect(res.body.stack).toBeUndefined();
    });

    it('returns clean 404 for non-existent route without revealing internal paths', async () => {
      const res = await request(app).get('/api/undefined_endpoint');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Endpoint not found.');
      expect(res.body.stack).toBeUndefined();
    });
  });
});
