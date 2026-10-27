import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Readable } from 'node:stream';
import {
  generateToken,
  hashToken,
  hashPassword,
  comparePassword,
  timingSafeEqualStrings,
  generateStoredFilename,
  computeFileHash,
  sanitizeFilename,
  parseExpiryOption,
  isValidExpiryOption,
  createAccessSession,
  verifyAccessSession,
} from '../src/utils/index.js';
import { prisma } from '../src/config/db.js';

describe('Phase 2: Core Security Utilities', () => {
  describe('1 & 2. Token Generator & Hasher', () => {
    it('should generate a 43-character base64url token with 32 bytes of entropy', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(typeof token1).toBe('string');
      expect(token1.length).toBe(43); // 32 bytes base64url is 43 chars
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should deterministically produce a 64-character SHA-256 hex hash', () => {
      const token = generateToken();
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('3. Password Hasher & Verifier (bcryptjs)', () => {
    it('should hash a password and verify correctly', async () => {
      const plain = 'SuperSecret123!';
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await comparePassword(plain, hash);
      const isInvalid = await comparePassword('WrongPassword', hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('5. Safe Comparison Helper (timingSafeEqual)', () => {
    it('should return true for identical strings and false for unequal strings', () => {
      expect(timingSafeEqualStrings('exactMatch123', 'exactMatch123')).toBe(true);
      expect(timingSafeEqualStrings('exactMatch123', 'different456')).toBe(false);
      expect(timingSafeEqualStrings('short', 'longerString')).toBe(false);
    });
  });

  describe('6. Stored Filename Generator', () => {
    it('should generate standard UUID v4 filenames independent of original names', () => {
      const name1 = generateStoredFilename();
      const name2 = generateStoredFilename();

      expect(name1).not.toBe(name2);
      expect(name1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('7. File Hash Helper (Streaming SHA-256)', () => {
    it('should correctly hash stream contents without loading all in memory', async () => {
      const content = 'Test file content for checksum verification';
      const stream = Readable.from([Buffer.from(content)]);
      const hash = await computeFileHash(stream);

      // SHA-256 hex digest for 'Test file content for checksum verification'
      expect(hash).toBe('f1070fea6612e07c3d7667b3be3c4098b394a3e506c2bd757158adb56c010ce4');
    });
  });

  describe('8. Filename Sanitizer', () => {
    it('should strip path traversal sequences and illegal characters', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('my:file*name?.txt')).toBe('my_file_name_.txt');
      expect(sanitizeFilename('   .hiddenFile.png  ')).toBe('hiddenFile.png');
      expect(sanitizeFilename('')).toBe('downloaded_file');
    });
  });

  describe('9. Expiry Parser', () => {
    it('should parse 10m, 1h, and 24h into accurate future dates', () => {
      const baseTime = new Date('2026-01-01T12:00:00Z');

      const exp10m = parseExpiryOption('10m', baseTime);
      expect(exp10m.toISOString()).toBe('2026-01-01T12:10:00.000Z');

      const exp1h = parseExpiryOption('1h', baseTime);
      expect(exp1h.toISOString()).toBe('2026-01-01T13:00:00.000Z');

      const exp24h = parseExpiryOption('24h', baseTime);
      expect(exp24h.toISOString()).toBe('2026-01-02T12:00:00.000Z');
    });

    it('should validate allowed options and reject invalid inputs', () => {
      expect(isValidExpiryOption('10m')).toBe(true);
      expect(isValidExpiryOption('1h')).toBe(true);
      expect(isValidExpiryOption('24h')).toBe(true);
      expect(isValidExpiryOption('30m')).toBe(false);
      expect(isValidExpiryOption('7d')).toBe(false);

      expect(() => parseExpiryOption('invalid')).toThrow(/Invalid expiry option/);
    });
  });

  describe('4. Session Helpers (PostgreSQL Integration)', () => {
    let testShareId: string;

    beforeAll(async () => {
      // Create a test share row
      const share = await prisma.share.create({
        data: {
          tokenHash: hashToken(generateToken()),
          maxDownloads: 3,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      testShareId = share.id;
    });

    afterAll(async () => {
      if (testShareId) {
        await prisma.share.delete({ where: { id: testShareId } }).catch(() => {});
      }
      await prisma.$disconnect();
    });

    it('should create a session with 5-minute expiry and store only its hash', async () => {
      const { sessionToken, expiresAt } = await createAccessSession(testShareId);

      expect(typeof sessionToken).toBe('string');
      expect(sessionToken.length).toBe(43);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 4 * 60 * 1000);

      // Verify that plain token is NOT stored, only its hash
      const hash = hashToken(sessionToken);
      const stored = await prisma.accessSession.findUnique({
        where: { sessionTokenHash: hash },
      });
      expect(stored).not.toBeNull();
      expect(stored?.shareId).toBe(testShareId);

      // Verify validation passes
      const isValid = await verifyAccessSession(testShareId, sessionToken);
      expect(isValid).toBe(true);

      // Verify wrong token fails
      const wrongValid = await verifyAccessSession(testShareId, 'wrongToken');
      expect(wrongValid).toBe(false);

      // Verify mismatching share fails
      const otherShareValid = await verifyAccessSession('non-existent-share-id', sessionToken);
      expect(otherShareValid).toBe(false);
    });
  });
});
