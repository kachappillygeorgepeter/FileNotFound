import { Router } from 'express';
import { handleUpload } from '../middleware/upload.js';
import { createShareController } from '../controllers/shareController.js';

export const shareRouter = Router();

// POST /api/shares - Upload files and create a new secure share
shareRouter.post('/shares', handleUpload, createShareController);
