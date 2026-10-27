import { Router } from 'express';
import { handleUpload } from '../middleware/upload.js';
import { createShareController } from '../controllers/shareController.js';
import { resolveShareMiddleware } from '../middleware/resolveShare.js';
import { requireSessionMiddleware } from '../middleware/requireSession.js';
import {
  lookupShareController,
  verifySharePasswordController,
  getProtectedMetadataController,
} from '../controllers/receiverController.js';
import {
  downloadSingleFileController,
  downloadAllZipController,
} from '../controllers/downloadController.js';
import {
  uploadRateLimiter,
  verifyPasswordRateLimiter,
  generalRateLimiter,
} from '../middleware/rateLimiter.js';

export const shareRouter = Router();

// POST /api/shares - Upload files and create a new secure share (upload rate limiter)
shareRouter.post('/shares', uploadRateLimiter, handleUpload, createShareController);

// GET /api/shares/:token - Receiver lookup endpoint
shareRouter.get('/shares/:token', generalRateLimiter, resolveShareMiddleware, lookupShareController);

// POST /api/shares/:token/verify - Receiver password verification (strict brute-force limiter)
shareRouter.post(
  '/shares/:token/verify',
  verifyPasswordRateLimiter,
  resolveShareMiddleware,
  verifySharePasswordController
);

// GET /api/shares/:token/metadata - Receiver protected metadata endpoint
shareRouter.get(
  '/shares/:token/metadata',
  generalRateLimiter,
  resolveShareMiddleware,
  requireSessionMiddleware,
  getProtectedMetadataController
);

// GET /api/shares/:token/files/:fileId/download - Atomic single-file download
shareRouter.get(
  '/shares/:token/files/:fileId/download',
  generalRateLimiter,
  resolveShareMiddleware,
  requireSessionMiddleware,
  downloadSingleFileController
);

// GET /api/shares/:token/download-all - Atomic download-all ZIP
shareRouter.get(
  '/shares/:token/download-all',
  generalRateLimiter,
  resolveShareMiddleware,
  requireSessionMiddleware,
  downloadAllZipController
);
