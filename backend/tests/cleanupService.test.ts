import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/db.js';
import { runCleanup } from '../src/services/cleanupService.js';
import {
  generateToken,
  hashToken,
  hashPassword,
  createAccessSession,
} from '../src/utils/index.js';
import fs from 'node:fs';
import path from 'node:path';

const uploadDir = path.resolve('./uploads');

describe('Phase 7: Expiry and Scheduled Cleanup Service', () => {
  let expiredShareId: string;
  let expiredStoredFile: string;

  let exhaustedShareId: string;
  let exhaustedStoredFile: string;

  let activeShareId: string;
  let activeStoredFile: string;

  let expiredSessionShareId: string;

  beforeAll(async () => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 1. Create an expired share with file on disk
    expiredStoredFile = `cleanup_test_expired_${Date.now()}`;
    fs.writeFileSync(path.join(uploadDir, expiredStoredFile), 'expired file content');

    const expShare = await prisma.share.create({
      data: {
        tokenHash: hashToken(generateToken()),
        passwordHash: await hashPassword('TemporaryPassword123'),
        maxDownloads: 5,
        downloadsUsed: 0,
        expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
        files: {
          create: [
            {
              originalName: 'expired.txt',
              storedName: expiredStoredFile,
              sizeBytes: BigInt(20),
              mimeType: 'text/plain',
              sha256: 'expHash',
            },
          ],
        },
      },
    });
    expiredShareId = expShare.id;

    // 2. Create an exhausted share with file on disk
    exhaustedStoredFile = `cleanup_test_exhausted_${Date.now()}`;
    fs.writeFileSync(path.join(uploadDir, exhaustedStoredFile), 'exhausted file content');

    const exhShare = await prisma.share.create({
      data: {
        tokenHash: hashToken(generateToken()),
        maxDownloads: 2,
        downloadsUsed: 2, // Limit reached
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        files: {
          create: [
            {
              originalName: 'exhausted.txt',
              storedName: exhaustedStoredFile,
              sizeBytes: BigInt(22),
              mimeType: 'text/plain',
              sha256: 'exhHash',
            },
          ],
        },
      },
    });
    exhaustedShareId = exhShare.id;

    // 3. Create an active share that must NOT be touched by cleanup
    activeStoredFile = `cleanup_test_active_${Date.now()}`;
    fs.writeFileSync(path.join(uploadDir, activeStoredFile), 'active file content');

    const actShare = await prisma.share.create({
      data: {
        tokenHash: hashToken(generateToken()),
        maxDownloads: 5,
        downloadsUsed: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Valid for 1 hour
        files: {
          create: [
            {
              originalName: 'active.txt',
              storedName: activeStoredFile,
              sizeBytes: BigInt(19),
              mimeType: 'text/plain',
              sha256: 'actHash',
            },
          ],
        },
      },
    });
    activeShareId = actShare.id;

    // 4. Create an expired access session row
    const sessShare = await prisma.share.create({
      data: {
        tokenHash: hashToken(generateToken()),
        maxDownloads: 5,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    expiredSessionShareId = sessShare.id;

    // Insert an expired session row directly
    await prisma.accessSession.create({
      data: {
        shareId: sessShare.id,
        sessionTokenHash: hashToken(generateToken()),
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      },
    });
  });

  afterAll(async () => {
    // Cleanup DB
    const shareIds = [expiredShareId, exhaustedShareId, activeShareId, expiredSessionShareId];
    for (const id of shareIds) {
      if (id) {
        await prisma.share.deleteMany({ where: { id } }).catch(() => {});
      }
    }

    // Cleanup remaining active file on disk
    const activePath = path.join(uploadDir, activeStoredFile);
    if (fs.existsSync(activePath)) fs.unlinkSync(activePath);

    await prisma.$disconnect();
  });

  it('1. Successfully cleans up expired and exhausted shares, files, and expired sessions', async () => {
    // Confirm files exist on disk before cleanup
    expect(fs.existsSync(path.join(uploadDir, expiredStoredFile))).toBe(true);
    expect(fs.existsSync(path.join(uploadDir, exhaustedStoredFile))).toBe(true);
    expect(fs.existsSync(path.join(uploadDir, activeStoredFile))).toBe(true);

    // Execute cleanup service
    const report = await runCleanup();

    expect(report.sharesProcessed).toBeGreaterThanOrEqual(2);
    expect(report.filesDeleted).toBeGreaterThanOrEqual(2);
    expect(report.sessionsPurged).toBeGreaterThanOrEqual(1);
    expect(report.errors).toBe(0);

    // 1. Check expired share: physical file removed, marked deletedAt, passwordHash cleared
    expect(fs.existsSync(path.join(uploadDir, expiredStoredFile))).toBe(false);
    const expDb = await prisma.share.findUnique({ where: { id: expiredShareId } });
    expect(expDb?.deletedAt).not.toBeNull();
    expect(expDb?.passwordHash).toBeNull();

    // 2. Check exhausted share: physical file removed, marked deletedAt
    expect(fs.existsSync(path.join(uploadDir, exhaustedStoredFile))).toBe(false);
    const exhDb = await prisma.share.findUnique({ where: { id: exhaustedShareId } });
    expect(exhDb?.deletedAt).not.toBeNull();

    // 3. Check active share: MUST remain completely untouched!
    expect(fs.existsSync(path.join(uploadDir, activeStoredFile))).toBe(true);
    const actDb = await prisma.share.findUnique({
      where: { id: activeShareId },
      include: { files: true },
    });
    expect(actDb?.deletedAt).toBeNull();
    expect(actDb?.files).toHaveLength(1);

    // 4. Check expired session: purged from DB
    const sessionCount = await prisma.accessSession.count({
      where: { shareId: expiredSessionShareId },
    });
    expect(sessionCount).toBe(0);
  });

  it('2. Is idempotent and fault-tolerant: running cleanup again succeeds with 0 errors even if files already deleted', async () => {
    const secondReport = await runCleanup();
    expect(secondReport.errors).toBe(0);
  });
});
