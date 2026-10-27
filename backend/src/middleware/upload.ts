import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { generateStoredFilename } from '../utils/index.js';

export const MAX_FILES_PER_SHARE = 10;
export const MAX_FILE_SIZE_BYTES = config.MAX_FILE_SIZE_MB * 1024 * 1024; // 100 MB per file
export const MAX_TOTAL_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB combined limit per share

// Ensure the private uploads directory exists
const uploadDir = path.resolve(config.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage using random UUID names
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // Generate UUID filename with no relation to original name
    cb(null, generateStoredFilename());
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_SHARE,
  },
}).array('files', MAX_FILES_PER_SHARE);

/**
 * Wraps Multer invocation to cleanly catch and format Multer errors
 */
export function handleUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: `File too large. Maximum allowed size per file is ${config.MAX_FILE_SIZE_MB} MB.`,
        });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          error: `Too many files. Maximum allowed is ${MAX_FILES_PER_SHARE} files per share.`,
        });
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({
          error: `Unexpected field. Upload files under the field name 'files'.`,
        });
        return;
      }
      res.status(400).json({ error: `Upload error: ${err.message}` });
      return;
    }

    if (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unknown upload error',
      });
      return;
    }

    next();
  });
}
