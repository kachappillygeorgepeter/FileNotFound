import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import {
  generateToken,
  hashToken,
  hashPassword,
  createAccessSession,
} from '../src/utils/index.js';
import { SESSION_HEADER_NAME } from '../src/middleware/requireSession.js';
import fs from 'node:fs';
import path from 'node:path';

const app = createApp();
const uploadDir = path.resolve('./uploads');

describe('Phase 5: Atomic Download & Concurrency Tests', () => {
  let singleLimitToken: string;
  let singleLimitFileId: string;
  let singleStoredName: string;

  let protectedToken: string;
  let protectedFileId: string;
  let protectedStoredName: string;
  let protectedSessionToken: string;

  let multiFileToken: string;
  let multiFileStoredNames: string[] = [];

  beforeAll(async () => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 1. Share limited to exactly 1 download (for concurrency testing)
    singleLimitToken = generateToken();
    singleStoredName = `test_uuid_limit1_${Date.now()}`;
    fs.writeFileSync(path.join(uploadDir, singleStoredName), 'Atomic concurrency test payload');

    const share1 = await prisma.share.create({
      data: {
        tokenHash: hashToken(singleLimitToken),
        maxDownloads: 1,
        downloadsUsed: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        files: {
          create: [
            {
              originalName: 'secret.txt',
              storedName: singleStoredName,
              sizeBytes: BigInt(31),
              mimeType: 'text/plain',
              sha256: 'hash123',
            },
          ],
        },
      },
      include: { files: true },
    });
    singleLimitFileId = share1.files[0].id;

    // 2. Password protected share for download session checks
    protectedToken = generateToken();
    protectedStoredName = `test_uuid_protected_${Date.now()}`;
    fs.writeFileSync(path.join(uploadDir, protectedStoredName), 'Protected payload');

    const passHash = await hashPassword('DownloadSecret123');
    const share2 = await prisma.share.create({
      data: {
        tokenHash: hashToken(protectedToken),
        passwordHash: passHash,
        maxDownloads: 2,
        downloadsUsed: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        files: {
          create: [
            {
              originalName: 'protectedDoc.pdf',
              storedName: protectedStoredName,
              sizeBytes: BigInt(17),
              mimeType: 'application/pdf',
              sha256: 'hashProtected',
            },
          ],
        },
      },
      include: { files: true },
    });
    protectedFileId = share2.files[0].id;

    // Create session for protected share
    const sessionRes = await createAccessSession(share2.id);
    protectedSessionToken = sessionRes.sessionToken;

    // 3. Multi-file share for ZIP testing
    multiFileToken = generateToken();
    const nameA = `test_uuid_zip_a_${Date.now()}`;
    const nameB = `test_uuid_zip_b_${Date.now()}`;
    multiFileStoredNames = [nameA, nameB];
    fs.writeFileSync(path.join(uploadDir, nameA), 'Zip file component 1');
    fs.writeFileSync(path.join(uploadDir, nameB), 'Zip file component 2');

    await prisma.share.create({
      data: {
        tokenHash: hashToken(multiFileToken),
        maxDownloads: 1, // Only 1 download allowed
        downloadsUsed: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        files: {
          create: [
            {
              originalName: 'notes.txt',
              storedName: nameA,
              sizeBytes: BigInt(20),
              mimeType: 'text/plain',
              sha256: 'hashA',
            },
            {
              originalName: 'data.csv',
              storedName: nameB,
              sizeBytes: BigInt(20),
              mimeType: 'text/csv',
              sha256: 'hashB',
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up DB rows
    const tokens = [singleLimitToken, protectedToken, multiFileToken];
    for (const t of tokens) {
      if (t) {
        await prisma.share.deleteMany({ where: { tokenHash: hashToken(t) } }).catch(() => {});
      }
    }

    // Clean up test files from disk
    const allStoredFiles = [singleStoredName, protectedStoredName, ...multiFileStoredNames];
    for (const file of allStoredFiles) {
      const p = path.join(uploadDir, file);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    await prisma.$disconnect();
  });

  describe('1. Single-File Download Security & Headers', () => {
    it('requires session if share is password protected', async () => {
      const res = await request(app).get(
        `/api/shares/${protectedToken}/files/${protectedFileId}/download`
      );

      expect(res.status).toBe(401);
      expect(res.body.passwordRequired).toBe(true);
    });

    it('rejects foreign fileId not belonging to the share', async () => {
      const res = await request(app)
        .get(`/api/shares/${protectedToken}/files/${singleLimitFileId}/download`)
        .set(SESSION_HEADER_NAME, protectedSessionToken);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Share not found or no longer available.');
    });

    it('streams file with correct headers, attachment disposition, and no-sniff', async () => {
      const res = await request(app)
        .get(`/api/shares/${protectedToken}/files/${protectedFileId}/download`)
        .set(SESSION_HEADER_NAME, protectedSessionToken);

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=/);
      expect((res.body as Buffer).toString('utf8')).toBe('Protected payload');

      // Verify downloadsUsed incremented by exactly 1 in DB
      const share = await prisma.share.findUnique({
        where: { tokenHash: hashToken(protectedToken) },
      });
      expect(share?.downloadsUsed).toBe(1);
    });
  });

  describe('2. Atomic Download-All ZIP Stream', () => {
    it('streams ZIP and counts as exactly one download against the limit', async () => {
      const res = await request(app).get(`/api/shares/${multiFileToken}/download-all`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="share_/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');

      // Check DB: downloadsUsed must now be 1
      const share = await prisma.share.findUnique({
        where: { tokenHash: hashToken(multiFileToken) },
      });
      expect(share?.downloadsUsed).toBe(1);

      // Second download must fail because maxDownloads = 1 was reached
      const secondRes = await request(app).get(`/api/shares/${multiFileToken}/download-all`);
      expect([404, 410]).toContain(secondRes.status);
    });
  });

  describe('3. Concurrency Test: 10 Parallel Requests on Share Limited to 1 Download', () => {
    it('guarantees strictly ONE successful download when 10 simultaneous requests compete', async () => {
      // Fire 10 parallel download requests simultaneously
      const requests = Array.from({ length: 10 }, () =>
        request(app).get(`/api/shares/${singleLimitToken}/files/${singleLimitFileId}/download`)
      );

      const results = await Promise.all(requests);

      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 404 || r.status === 410).length;

      // Crucial security guarantee: exactly 1 succeeded, exactly 9 rejected
      expect(successCount).toBe(1);
      expect(rejectedCount).toBe(9);

      // Verify DB count never exceeded 1
      const share = await prisma.share.findUnique({
        where: { tokenHash: hashToken(singleLimitToken) },
      });
      expect(share?.downloadsUsed).toBe(1);
    });
  });
});
