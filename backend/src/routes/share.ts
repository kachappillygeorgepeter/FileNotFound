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

export const shareRouter = Router();

// POST /api/shares - Upload files and create a new secure share
shareRouter.post('/shares', handleUpload, createShareController);

// GET /api/shares/:token - Receiver lookup endpoint
shareRouter.get('/shares/:token', resolveShareMiddleware, lookupShareController);

// POST /api/shares/:token/verify - Receiver password verification
shareRouter.post('/shares/:token/verify', resolveShareMiddleware, verifySharePasswordController);

// GET /api/shares/:token/metadata - Receiver protected metadata endpoint
shareRouter.get(
  '/shares/:token/metadata',
  resolveShareMiddleware,
  requireSessionMiddleware,
  getProtectedMetadataController
);

// GET /api/shares/:token/files/:fileId/download - Atomic single-file download
shareRouter.get(
  '/shares/:token/files/:fileId/download',
  resolveShareMiddleware,
  requireSessionMiddleware,
  downloadSingleFileController
);

// GET /api/shares/:token/download-all - Atomic download-all ZIP
shareRouter.get(
  '/shares/:token/download-all',
  resolveShareMiddleware,
  requireSessionMiddleware,
  downloadAllZipController
);
