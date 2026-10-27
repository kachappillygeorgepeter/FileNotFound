import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { generateToken, hashToken, hashPassword } from '../src/utils/index.js';
import { SESSION_HEADER_NAME } from '../src/middleware/requireSession.js';

const app = createApp();

describe('Phase 4: Receiver Endpoints', () => {
  let publicToken: string;
  let protectedToken: string;
  let expiredToken: string;
  let exhaustedToken: string;
  let deletedToken: string;

  const validPassword = 'SecretReceiverPassword123';

  beforeAll(async () => {
    // 1. Create a public share (no password)
    publicToken = generateToken();
    await prisma.share.create({
      data: {
        tokenHash: hashToken(publicToken),
        maxDownloads: 3,
        downloadsUsed: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour ahead
        files: {
          create: [
            {
              originalName: 'publicDoc.pdf',
              storedName: 'uuid-public-1',
              sizeBytes: BigInt(5000),
              mimeType: 'application/pdf',
              sha256: 'abc123hash',
            },
          ],
        },
      },
    });

    // 2. Create a password-protected share
    protectedToken = generateToken();
    const passwordHash = await hashPassword(validPassword);
    await prisma.share.create({
      data: {
        tokenHash: hashToken(protectedToken),
        passwordHash,
        maxDownloads: 3,
        downloadsUsed: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        files: {
          create: [
            {
              originalName: 'confidential.docx',
              storedName: 'uuid-confidential-1',
              sizeBytes: BigInt(12345),
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              sha256: 'secretcontenthash',
            },
          ],
        },
      },
    });

    // 3. Create an expired share
    expiredToken = generateToken();
    await prisma.share.create({
      data: {
        tokenHash: hashToken(expiredToken),
        maxDownloads: 3,
        expiresAt: new Date(Date.now() - 1000), // In the past!
      },
    });

    // 4. Create an exhausted share
    exhaustedToken = generateToken();
    await prisma.share.create({
      data: {
        tokenHash: hashToken(exhaustedToken),
        maxDownloads: 2,
        downloadsUsed: 2, // Limit reached!
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // 5. Create a soft-deleted share
    deletedToken = generateToken();
    await prisma.share.create({
      data: {
        tokenHash: hashToken(deletedToken),
        maxDownloads: 3,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        deletedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    const tokens = [publicToken, protectedToken, expiredToken, exhaustedToken, deletedToken];
    for (const token of tokens) {
      if (token) {
        await prisma.share.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
      }
    }
    await prisma.$disconnect();
  });

  describe('1. Shared Resolution & Information Leakage Prevention', () => {
    it('returns exact same generic 404 for non-existent token', async () => {
      const res = await request(app).get('/api/shares/nonExistentToken123');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Share not found or no longer available.');
    });

    it('returns exact same generic 404 for expired share', async () => {
      const res = await request(app).get(`/api/shares/${expiredToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Share not found or no longer available.');
    });

    it('returns exact same generic 404 for exhausted share', async () => {
      const res = await request(app).get(`/api/shares/${exhaustedToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Share not found or no longer available.');
    });

    it('returns exact same generic 404 for soft-deleted share', async () => {
      const res = await request(app).get(`/api/shares/${deletedToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Share not found or no longer available.');
    });
  });

  describe('2. Public Share Lookup', () => {
    it('returns full metadata immediately without password', async () => {
      const res = await request(app).get(`/api/shares/${publicToken}`);

      expect(res.status).toBe(200);
      expect(res.body.passwordRequired).toBe(false);
      expect(res.body.downloadsRemaining).toBe(2); // 3 max - 1 used = 2
      expect(res.body.timeRemainingSeconds).toBeGreaterThan(0);
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].originalName).toBe('publicDoc.pdf');
      expect(res.body.files[0].sizeBytes).toBe('5000');
    });
  });

  describe('3. Password Protected Share Lookup & Verification', () => {
    it('lookup returns ONLY { passwordRequired: true } without files or counts', async () => {
      const res = await request(app).get(`/api/shares/${protectedToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ passwordRequired: true });
      expect(res.body.files).toBeUndefined();
      expect(res.body.timeRemainingSeconds).toBeUndefined();
      expect(res.body.downloadsRemaining).toBeUndefined();
    });

    it('verify rejects wrong password with 401 and no metadata', async () => {
      const res = await request(app)
        .post(`/api/shares/${protectedToken}/verify`)
        .send({ password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Incorrect password.');
      expect(res.body.files).toBeUndefined();
      expect(res.body.sessionToken).toBeUndefined();
    });

    it('verify succeeds with correct password, issues session and returns metadata', async () => {
      const res = await request(app)
        .post(`/api/shares/${protectedToken}/verify`)
        .send({ password: validPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessionToken');
      expect(res.body).toHaveProperty('sessionExpiresAt');
      expect(res.body.passwordRequired).toBe(false);
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].originalName).toBe('confidential.docx');

      // Verify cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/access_session_token=/);

      const sessionToken = res.body.sessionToken;

      // Access protected metadata endpoint with session header
      const metaRes = await request(app)
        .get(`/api/shares/${protectedToken}/metadata`)
        .set(SESSION_HEADER_NAME, sessionToken);

      expect(metaRes.status).toBe(200);
      expect(metaRes.body.files[0].originalName).toBe('confidential.docx');
    });

    it('rejects protected metadata endpoint without session', async () => {
      const res = await request(app).get(`/api/shares/${protectedToken}/metadata`);

      expect(res.status).toBe(401);
      expect(res.body.passwordRequired).toBe(true);
    });

    it('rejects protected metadata endpoint with invalid session', async () => {
      const res = await request(app)
        .get(`/api/shares/${protectedToken}/metadata`)
        .set(SESSION_HEADER_NAME, 'bogus_session_token');

      expect(res.status).toBe(401);
      expect(res.body.passwordRequired).toBe(true);
    });
  });
});
