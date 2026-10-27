import { ResolvedShare } from '../middleware/resolveShare.js';

export interface FileMetadataResponse {
  id: string;
  originalName: string;
  sizeBytes: string; // Serialized string to avoid BigInt JSON serialization error
  mimeType: string;
}

export interface ShareMetadataResponse {
  passwordRequired: boolean;
  expiresAt?: string;
  timeRemainingSeconds?: number;
  downloadsRemaining?: number;
  maxDownloads?: number;
  files?: FileMetadataResponse[];
}

/**
 * Builds the safe metadata response for a share.
 * Calculates time remaining and downloads remaining strictly on the server.
 */
export function buildShareMetadata(share: ResolvedShare): ShareMetadataResponse {
  const now = Date.now();
  const timeRemainingSeconds = Math.max(0, Math.floor((share.expiresAt.getTime() - now) / 1000));
  const downloadsRemaining = Math.max(0, share.maxDownloads - share.downloadsUsed);

  return {
    passwordRequired: false,
    expiresAt: share.expiresAt.toISOString(),
    timeRemainingSeconds,
    downloadsRemaining,
    maxDownloads: share.maxDownloads,
    files: share.files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      sizeBytes: f.sizeBytes.toString(),
      mimeType: f.mimeType,
    })),
  };
}
