import { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import archiver from 'archiver';
import { ResolvedShare, GENERIC_SHARE_NOT_FOUND_MSG } from '../middleware/resolveShare.js';
import { reserveDownloadSlot } from '../services/reservationService.js';
import { config } from '../config/env.js';
import { sanitizeFilename } from '../utils/index.js';

const uploadDir = path.resolve(config.UPLOAD_DIR);

/**
 * GET /api/shares/:token/files/:fileId/download
 * Atomic single-file download endpoint:
 * 1. Resolves file within the share's database records (path traversal impossible).
 * 2. Runs the atomic reservation update before any streaming.
 * 3. Streams file directly to client with attachment headers, sanitized name, and no-sniff.
 */
export async function downloadSingleFileController(req: Request, res: Response): Promise<void> {
  const share = req.share as ResolvedShare;
  const fileId = req.params.fileId;

  // 1. Confirm the requested file belongs to this share
  const fileRecord = share.files.find((f) => f.id === fileId);
  if (!fileRecord) {
    res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
    return;
  }

  // 2. Run the atomic reservation query
  const reservation = await reserveDownloadSlot(share.tokenHash);
  if (!reservation.success) {
    res.status(410).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
    return;
  }

  // 3. Resolve disk path from storedName (storedName is UUID created on server)
  const diskPath = path.join(uploadDir, fileRecord.storedName);

  if (!fs.existsSync(diskPath)) {
    // Policy: download is not refunded to prevent security state rollback
    console.error(`File missing on disk for file ID ${fileId}`);
    res.status(404).json({ error: 'File is no longer available on disk.' });
    return;
  }

  const safeOriginalName = sanitizeFilename(fileRecord.originalName);

  // Set hardened download headers
  res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(safeOriginalName)}"; filename*=UTF-8''${encodeURIComponent(safeOriginalName)}`
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', fileRecord.sizeBytes.toString());

  // Stream file directly to response
  const readStream = fs.createReadStream(diskPath);
  readStream.on('error', (err) => {
    console.error('Stream read error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream file.' });
    }
  });

  readStream.pipe(res);
}

/**
 * GET /api/shares/:token/download-all
 * Atomic download-all ZIP endpoint:
 * 1. Verifies share has files.
 * 2. Runs ONE atomic reservation for the entire ZIP (counts as 1 download).
 * 3. Streams dynamically compressed ZIP directly without buffering full ZIP in memory.
 */
export async function downloadAllZipController(req: Request, res: Response): Promise<void> {
  const share = req.share as ResolvedShare;

  if (share.files.length === 0) {
    res.status(404).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
    return;
  }

  // 1. Run the single atomic reservation for the entire ZIP
  const reservation = await reserveDownloadSlot(share.tokenHash);
  if (!reservation.success) {
    res.status(410).json({ error: GENERIC_SHARE_NOT_FOUND_MSG });
    return;
  }

  const zipName = `share_${share.tokenHash.slice(0, 8)}.zip`;

  // Set ZIP streaming headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${zipName}"; filename*=UTF-8''${zipName}`
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const archive = archiver('zip', {
    zlib: { level: 5 }, // Balanced compression speed vs CPU
  });

  archive.on('error', (err) => {
    console.error('Archiver error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP stream.' });
    }
  });

  // Pipe archive data directly to Express response
  archive.pipe(res);

  // Append each file to the ZIP archive using sanitized display names
  // Deduplicate names if multiple files have the exact same original name
  const usedNames = new Set<string>();

  for (const fileRecord of share.files) {
    const diskPath = path.join(uploadDir, fileRecord.storedName);
    if (fs.existsSync(diskPath)) {
      let displayName = sanitizeFilename(fileRecord.originalName);

      if (usedNames.has(displayName)) {
        const ext = path.extname(displayName);
        const base = path.basename(displayName, ext);
        displayName = `${base}_${fileRecord.id.slice(-4)}${ext}`;
      }
      usedNames.add(displayName);

      archive.file(diskPath, { name: displayName });
    }
  }

  await archive.finalize();
}
