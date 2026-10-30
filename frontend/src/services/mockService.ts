import {
  CreateSharePayload,
  CreateShareResponse,
  ShareMetadata,
  VerifyPasswordResponse,
  UploadProgress,
} from '../types/share';

interface MockShareRecord {
  token: string;
  files: {
    id: string;
    originalName: string;
    sizeBytes: string;
    mimeType: string;
    blob: Blob;
  }[];
  password?: string;
  maxDownloads: number;
  downloadsUsed: number;
  expiresAt: Date;
  createdAt: Date;
}

const mockShares = new Map<string, MockShareRecord>();

// Pre-populate a demo share if wanted
const DEMO_TOKEN = 'demo-secure-sample-token';
mockShares.set(DEMO_TOKEN, {
  token: DEMO_TOKEN,
  files: [
    {
      id: 'file_mock_1',
      originalName: 'Confidential_Architecture_Doc.pdf',
      sizeBytes: '2457600',
      mimeType: 'application/pdf',
      blob: new Blob(['%PDF-1.4 Mock confidential architecture document for FileNotFound'], {
        type: 'application/pdf',
      }),
    },
    {
      id: 'file_mock_2',
      originalName: 'deployment_keys.asc',
      sizeBytes: '1024',
      mimeType: 'text/plain',
      blob: new Blob(['-----BEGIN PGP PUBLIC KEY BLOCK-----\nMock public key\n-----END PGP PUBLIC KEY BLOCK-----'], {
        type: 'text/plain',
      }),
    },
  ],
  password: 'correct-horse-battery',
  maxDownloads: 3,
  downloadsUsed: 0,
  expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
  createdAt: new Date(),
});

function parseDurationMs(duration: string): number {
  if (duration === '10m') return 10 * 60 * 1000;
  if (duration === '24h') return 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000; // default 1h
}

export async function createMockShare(
  payload: CreateSharePayload,
  onProgress?: (progress: UploadProgress) => void,
  abortSignal?: AbortSignal
): Promise<CreateShareResponse> {
  const totalBytes = payload.files.reduce((acc, f) => acc + f.size, 0);

  // Simulate progress
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Upload cancelled by user.');
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
    const loaded = Math.floor((totalBytes * i) / steps);
    onProgress?.({
      loaded,
      total: totalBytes,
      percentage: Math.floor((i / steps) * 100),
      speedBytesPerSec: Math.floor(totalBytes / 0.8),
    });
  }

  // Generate 32-character random token
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

  const durationMs = parseDurationMs(payload.expiresIn);
  const expiresAt = new Date(Date.now() + durationMs);

  const mockFiles = payload.files.map((f, idx) => ({
    id: `file_${Date.now()}_${idx}`,
    originalName: f.name,
    sizeBytes: f.size.toString(),
    mimeType: f.type || 'application/octet-stream',
    blob: f,
  }));

  mockShares.set(token, {
    token,
    files: mockFiles,
    password: payload.password?.trim() || undefined,
    maxDownloads: payload.maxDownloads,
    downloadsUsed: 0,
    expiresAt,
    createdAt: new Date(),
  });

  const origin = window.location.origin;
  const shareLink = `${origin}/s/${token}`;

  return {
    shareLink,
    expiresAt: expiresAt.toISOString(),
    maxDownloads: payload.maxDownloads,
    fileCount: mockFiles.length,
  };
}

export async function lookupMockShare(token: string): Promise<ShareMetadata> {
  await new Promise((r) => setTimeout(r, 120));
  const record = mockShares.get(token);

  if (!record) {
    throw new Error('Share not found or has expired.');
  }

  if (Date.now() > record.expiresAt.getTime()) {
    mockShares.delete(token);
    throw new Error('Share not found or has expired.');
  }

  if (record.downloadsUsed >= record.maxDownloads) {
    mockShares.delete(token);
    throw new Error('Share not found or has expired.');
  }

  // Zero-info disclosure if protected
  if (record.password) {
    return {
      passwordRequired: true,
    };
  }

  const timeRemainingSeconds = Math.max(
    0,
    Math.floor((record.expiresAt.getTime() - Date.now()) / 1000)
  );

  return {
    passwordRequired: false,
    expiresAt: record.expiresAt.toISOString(),
    timeRemainingSeconds,
    downloadsRemaining: record.maxDownloads - record.downloadsUsed,
    maxDownloads: record.maxDownloads,
    files: record.files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
    })),
  };
}

export async function verifyMockPassword(
  token: string,
  password: string
): Promise<VerifyPasswordResponse> {
  await new Promise((r) => setTimeout(r, 200));
  const record = mockShares.get(token);

  if (!record) {
    throw new Error('Share not found or has expired.');
  }

  if (record.password && record.password !== password) {
    throw new Error('Incorrect password.');
  }

  const timeRemainingSeconds = Math.max(
    0,
    Math.floor((record.expiresAt.getTime() - Date.now()) / 1000)
  );

  return {
    passwordRequired: false,
    sessionToken: `mock_session_${Date.now()}`,
    sessionExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    timeRemainingSeconds,
    downloadsRemaining: record.maxDownloads - record.downloadsUsed,
    maxDownloads: record.maxDownloads,
    files: record.files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
    })),
  };
}

export async function triggerMockFileDownload(
  token: string,
  fileId: string
): Promise<void> {
  const record = mockShares.get(token);
  if (!record) throw new Error('Share not found or has expired.');

  if (record.downloadsUsed >= record.maxDownloads) {
    mockShares.delete(token);
    throw new Error('Download limit exhausted.');
  }

  const file = record.files.find((f) => f.id === fileId);
  if (!file) throw new Error('File not found.');

  // Atomic download decrement
  record.downloadsUsed += 1;

  // Trigger browser download via Blob URL
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.originalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function triggerMockDownloadAll(token: string): Promise<void> {
  const record = mockShares.get(token);
  if (!record) throw new Error('Share not found or has expired.');

  if (record.downloadsUsed >= record.maxDownloads) {
    mockShares.delete(token);
    throw new Error('Download limit exhausted.');
  }

  record.downloadsUsed += 1;

  // Create a combined simulated archive blob
  const combinedContent = record.files
    .map((f) => `--- File: ${f.originalName} (${f.sizeBytes} bytes) ---`)
    .join('\n\n');
  const zipBlob = new Blob([combinedContent], { type: 'application/zip' });

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `share_${token.slice(0, 8)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

