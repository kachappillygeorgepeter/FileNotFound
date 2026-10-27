import { Request, Response } from 'express';
import { createShareSchema } from '../middleware/validation.js';
import { createShareService, UploadedFileMetadata } from '../services/shareService.js';
import { MAX_TOTAL_SIZE_BYTES } from '../middleware/upload.js';
import { deleteUploadedFiles, logger } from '../utils/index.js';
import { config } from '../config/env.js';

export async function createShareController(req: Request, res: Response): Promise<void> {
  const multerFiles = (req.files as Express.Multer.File[]) || [];
  const uploadedPaths = multerFiles.map((f) => f.path);

  // 1. Reject empty upload
  if (multerFiles.length === 0) {
    res.status(400).json({ error: 'No files uploaded. At least one file is required.' });
    return;
  }

  // 2. Reject zero-byte files
  const hasZeroByteFile = multerFiles.some((f) => f.size === 0);
  if (hasZeroByteFile) {
    await deleteUploadedFiles(uploadedPaths);
    res.status(400).json({ error: 'Empty files (0 bytes) are not allowed.' });
    return;
  }

  // 3. Reject total combined size cap
  const totalSizeBytes = multerFiles.reduce((acc, f) => acc + f.size, 0);
  if (totalSizeBytes > MAX_TOTAL_SIZE_BYTES) {
    await deleteUploadedFiles(uploadedPaths);
    res.status(400).json({
      error: `Total upload size exceeds limit of ${MAX_TOTAL_SIZE_BYTES / (1024 * 1024)} MB.`,
    });
    return;
  }

  // 4. Validate options payload via Zod
  const validation = createShareSchema.safeParse(req.body);
  if (!validation.success) {
    await deleteUploadedFiles(uploadedPaths);
    res.status(400).json({
      error: 'Invalid options provided',
      details: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const fileMetadata: UploadedFileMetadata[] = multerFiles.map((f) => ({
      originalName: f.originalname,
      storedName: f.filename,
      filePath: f.path,
      sizeBytes: f.size,
      mimeType: f.mimetype,
    }));

    const result = await createShareService(
      validation.data,
      fileMetadata,
      config.CLIENT_ORIGIN
    );

    logger.info('Share created successfully', {
      fileCount: result.fileCount,
      maxDownloads: result.maxDownloads,
      expiresAt: result.expiresAt,
    });

    // Return strictly what the sender needs (no database IDs, no passwords, no stored paths)
    res.status(201).json({
      shareLink: result.shareLink,
      expiresAt: result.expiresAt,
      maxDownloads: result.maxDownloads,
      fileCount: result.fileCount,
    });
  } catch (error) {
    logger.error('Failed to create share', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Failed to create share. Please try again.' });
  }
}
