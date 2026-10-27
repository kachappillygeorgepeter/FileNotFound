import { prisma } from '../config/db.js';
import {
  generateToken,
  hashToken,
  hashPassword,
  computeFileHash,
  sanitizeFilename,
  parseExpiryOption,
  deleteUploadedFiles,
} from '../utils/index.js';
import { CreateShareInput } from '../middleware/validation.js';

export interface UploadedFileMetadata {
  originalName: string;
  storedName: string;
  filePath: string;
  sizeBytes: number;
  mimeType: string;
}

export interface CreateShareResult {
  shareLink: string;
  rawToken: string;
  expiresAt: string;
  maxDownloads: number;
  fileCount: number;
}

export async function createShareService(
  input: CreateShareInput,
  files: UploadedFileMetadata[],
  clientOrigin: string
): Promise<CreateShareResult> {
  const uploadedDiskPaths = files.map((f) => f.filePath);

  try {
    // 1. Calculate expiry date from parsed option
    const expiresAt = parseExpiryOption(input.expiresIn);

    // 2. Hash password if provided
    let passwordHash: string | null = null;
    if (input.password) {
      passwordHash = await hashPassword(input.password);
    }

    // 3. Compute SHA-256 for all uploaded files
    const fileHashes = await Promise.all(
      files.map(async (file) => ({
        originalName: sanitizeFilename(file.originalName),
        storedName: file.storedName,
        sizeBytes: BigInt(file.sizeBytes),
        mimeType: file.mimeType || 'application/octet-stream',
        sha256: await computeFileHash(file.filePath),
      }))
    );

    // 4. Generate high-entropy 32-byte raw token and its SHA-256 hash
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    // 5. Store share and files in a single atomic database transaction
    await prisma.$transaction(async (tx) => {
      await tx.share.create({
        data: {
          tokenHash,
          passwordHash,
          maxDownloads: input.maxDownloads,
          expiresAt,
          files: {
            create: fileHashes.map((f) => ({
              originalName: f.originalName,
              storedName: f.storedName,
              sizeBytes: f.sizeBytes,
              mimeType: f.mimeType,
              sha256: f.sha256,
            })),
          },
        },
      });
    });

    // 6. Build the share URL for the receiver
    const shareLink = `${clientOrigin.replace(/\/$/, '')}/s/${rawToken}`;

    return {
      shareLink,
      rawToken,
      expiresAt: expiresAt.toISOString(),
      maxDownloads: input.maxDownloads,
      fileCount: files.length,
    };
  } catch (error) {
    // On any error (e.g. database failure), immediately clean up the files on disk
    await deleteUploadedFiles(uploadedDiskPaths);
    throw error;
  }
}
