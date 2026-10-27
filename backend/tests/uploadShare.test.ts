import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { hashToken } from '../src/utils/token.js';
import fs from 'node:fs';
import path from 'node:path';

const app = createApp();

describe('Phase 3: Upload and Share Creation Endpoint (POST /api/shares)', () => {
  const createdTokens: string[] = [];

  afterAll(async () => {
    // Clean up created test shares from DB
    for (const token of createdTokens) {
      const tokenHash = hashToken(token);
      await prisma.share.deleteMany({ where: { tokenHash } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Successfully uploads multiple files with valid options and returns shareLink', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '1h')
      .field('maxDownloads', '3')
      .field('password', 'SecurePass123')
      .attach('files', Buffer.from('Hello file 1 content'), 'file1.txt')
      .attach('files', Buffer.from('Hello file 2 content'), 'file2.txt');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('shareLink');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body.maxDownloads).toBe(3);
    expect(res.body.fileCount).toBe(2);

    // Ensure raw passwords and DB IDs are NEVER returned in the response
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('id');

    // Extract raw token from the link
    const match = res.body.shareLink.match(/\/s\/([A-Za-z0-9_-]+)$/);
    expect(match).not.toBeNull();
    const rawToken = match![1];
    createdTokens.push(rawToken);

    // Verify DB integrity
    const tokenHash = hashToken(rawToken);
    const storedShare = await prisma.share.findUnique({
      where: { tokenHash },
      include: { files: true },
    });

    expect(storedShare).not.toBeNull();
    expect(storedShare?.files).toHaveLength(2);
    expect(storedShare?.passwordHash).not.toBeNull();
    expect(storedShare?.passwordHash).not.toBe('SecurePass123'); // Must be hashed!

    // Verify stored files exist on disk with UUID names, not original names
    for (const file of storedShare!.files) {
      expect(file.storedName).toMatch(/^[0-9a-f-]{36}$/);
      const onDiskPath = path.resolve('./uploads', file.storedName);
      expect(fs.existsSync(onDiskPath)).toBe(true);
      // Clean up test file on disk
      fs.unlinkSync(onDiskPath);
    }
  });

  it('2. Successfully uploads a single file without password', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '10m')
      .field('maxDownloads', '1')
      .attach('files', Buffer.from('Single file test content'), 'document.pdf');

    expect(res.status).toBe(201);
    expect(res.body.maxDownloads).toBe(1);
    expect(res.body.fileCount).toBe(1);

    const match = res.body.shareLink.match(/\/s\/([A-Za-z0-9_-]+)$/);
    const rawToken = match![1];
    createdTokens.push(rawToken);

    const storedShare = await prisma.share.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { files: true },
    });
    expect(storedShare?.passwordHash).toBeNull();

    // Clean up disk
    for (const file of storedShare!.files) {
      const onDiskPath = path.resolve('./uploads', file.storedName);
      if (fs.existsSync(onDiskPath)) fs.unlinkSync(onDiskPath);
    }
  });

  it('3. Rejects request with no files attached', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '1h')
      .field('maxDownloads', '1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No files uploaded/i);
  });

  it('4. Rejects zero-byte files', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '1h')
      .field('maxDownloads', '1')
      .attach('files', Buffer.alloc(0), 'empty.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Empty files/i);
  });

  it('5. Rejects invalid expiry option', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '30m') // Not allowed: only 10m, 1h, 24h
      .field('maxDownloads', '1')
      .attach('files', Buffer.from('Valid content'), 'valid.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid options/i);
    expect(res.body.details).toHaveProperty('expiresIn');
  });

  it('6. Rejects invalid download limits', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '1h')
      .field('maxDownloads', '5') // Not allowed: only 1, 3, 10
      .attach('files', Buffer.from('Valid content'), 'valid.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid options/i);
    expect(res.body.details).toHaveProperty('maxDownloads');
  });

  it('7. Rejects password that is too short (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/shares')
      .field('expiresIn', '1h')
      .field('maxDownloads', '1')
      .field('password', '123')
      .attach('files', Buffer.from('Valid content'), 'valid.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid options/i);
    expect(res.body.details).toHaveProperty('password');
  });

  it('8. Rejects too many files (> 10 files)', async () => {
    let req = request(app).post('/api/shares');
    for (let i = 0; i < 11; i++) {
      req = req.attach('files', Buffer.from(`File content ${i}`), `file${i}.txt`);
    }

    const res = await req
      .field('expiresIn', '1h')
      .field('maxDownloads', '1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Too many files/i);
  });
});
