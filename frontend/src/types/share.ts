export type ExpiryOption = '10m' | '1h' | '24h';
export type MaxDownloadsOption = 1 | 3 | 10;

export interface FileMetadata {
  id: string;
  originalName: string;
  sizeBytes: string;
  mimeType: string;
}

export interface ShareMetadata {
  passwordRequired: boolean;
  expiresAt?: string;
  timeRemainingSeconds?: number;
  downloadsRemaining?: number;
  maxDownloads?: number;
  files?: FileMetadata[];
}

export interface CreateSharePayload {
  files: File[];
  expiresIn: ExpiryOption;
  maxDownloads: MaxDownloadsOption;
  password?: string;
}

export interface CreateShareResponse {
  shareLink: string;
  expiresAt: string;
  maxDownloads: number;
  fileCount: number;
}

export interface VerifyPasswordResponse extends ShareMetadata {
  sessionToken: string;
  sessionExpiresAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speedBytesPerSec: number;
}

