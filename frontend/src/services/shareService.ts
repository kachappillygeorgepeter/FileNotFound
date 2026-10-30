import { apiClient, parseApiError } from './api';
import {
  CreateSharePayload,
  CreateShareResponse,
  ShareMetadata,
  VerifyPasswordResponse,
  UploadProgress,
} from '../types/share';
import { HealthResponse } from '../types/api';
import * as mockService from './mockService';

// Determine mock mode from environment
const mockSetting = (import.meta.env.VITE_USE_MOCK || 'auto').toLowerCase();

let isBackendKnownOffline = false;

export async function checkBackendHealth(): Promise<HealthResponse | null> {
  try {
    const res = await apiClient.get<HealthResponse>('/api/health', { timeout: 3000 });
    isBackendKnownOffline = false;
    return res.data;
  } catch {
    isBackendKnownOffline = true;
    return null;
  }
}

export function shouldUseMock(): boolean {
  if (mockSetting === 'true') return true;
  if (mockSetting === 'false') return false;
  // 'auto' mode: if backend failed health check or is offline
  return isBackendKnownOffline;
}

/**
 * Initiates upload of files and configuration to POST /api/shares
 */
export async function createShare(
  payload: CreateSharePayload,
  onProgress?: (progress: UploadProgress) => void,
  abortSignal?: AbortSignal
): Promise<CreateShareResponse> {
  if (shouldUseMock()) {
    return mockService.createMockShare(payload, onProgress, abortSignal);
  }

  const formData = new FormData();
  payload.files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('expiresIn', payload.expiresIn);
  formData.append('maxDownloads', payload.maxDownloads.toString());
  if (payload.password?.trim()) {
    formData.append('password', payload.password.trim());
  }

  let startTime = Date.now();
  let lastLoaded = 0;

  try {
    const response = await apiClient.post<CreateShareResponse>('/api/shares', formData, {
      signal: abortSignal,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) return;
        const now = Date.now();
        const elapsedSec = (now - startTime) / 1000;
        const loadedSince = progressEvent.loaded - lastLoaded;
        const speed = elapsedSec > 0 ? loadedSince / Math.max(elapsedSec, 0.1) : 0;

        startTime = now;
        lastLoaded = progressEvent.loaded;

        const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress?.({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage,
          speedBytesPerSec: speed,
        });
      },
    });

    return response.data;
  } catch (error) {
    // If auto mode and network connection failed, seamlessly try mock fallback
    if (mockSetting === 'auto' && !isBackendKnownOffline) {
      const parsed = parseApiError(error);
      if (parsed.status === 0) {
        console.warn('Backend unavailable, falling back to local simulation mode.');
        isBackendKnownOffline = true;
        return mockService.createMockShare(payload, onProgress, abortSignal);
      }
    }
    const err = parseApiError(error);
    throw new Error(err.message);
  }
}

/**
 * Look up a share by token: GET /api/shares/:token
 */
export async function lookupShare(token: string): Promise<ShareMetadata> {
  if (shouldUseMock()) {
    return mockService.lookupMockShare(token);
  }

  try {
    const response = await apiClient.get<ShareMetadata>(`/api/shares/${encodeURIComponent(token)}`);
    return response.data;
  } catch (error) {
    if (mockSetting === 'auto' && !isBackendKnownOffline) {
      const parsed = parseApiError(error);
      if (parsed.status === 0) {
        isBackendKnownOffline = true;
        return mockService.lookupMockShare(token);
      }
    }
    const err = parseApiError(error);
    throw new Error(err.message);
  }
}

/**
 * Verify passkey/password for protected share: POST /api/shares/:token/verify
 */
export async function verifySharePassword(
  token: string,
  password: string
): Promise<VerifyPasswordResponse> {
  if (shouldUseMock()) {
    return mockService.verifyMockPassword(token, password);
  }

  try {
    const response = await apiClient.post<VerifyPasswordResponse>(
      `/api/shares/${encodeURIComponent(token)}/verify`,
      { password }
    );
    return response.data;
  } catch (error) {
    if (mockSetting === 'auto' && !isBackendKnownOffline) {
      const parsed = parseApiError(error);
      if (parsed.status === 0) {
        isBackendKnownOffline = true;
        return mockService.verifyMockPassword(token, password);
      }
    }
    const err = parseApiError(error);
    throw new Error(err.message);
  }
}

/**
 * Fetch authenticated metadata for protected share: GET /api/shares/:token/metadata
 */
export async function getProtectedMetadata(token: string): Promise<ShareMetadata> {
  if (shouldUseMock()) {
    return mockService.lookupMockShare(token);
  }

  try {
    const response = await apiClient.get<ShareMetadata>(
      `/api/shares/${encodeURIComponent(token)}/metadata`
    );
    return response.data;
  } catch (error) {
    const err = parseApiError(error);
    throw new Error(err.message);
  }
}

/**
 * Trigger single file download: GET /api/shares/:token/files/:fileId/download
 */
export async function downloadSingleFile(
  token: string,
  fileId: string,
  fileName: string
): Promise<void> {
  if (shouldUseMock()) {
    return mockService.triggerMockFileDownload(token, fileId);
  }

  try {
    const response = await apiClient.get(
      `/api/shares/${encodeURIComponent(token)}/files/${encodeURIComponent(fileId)}/download`,
      {
        responseType: 'blob',
      }
    );

    // Create browser download anchor
    const contentType = response.headers['content-type'];
    const blob = new Blob([response.data], {
      type: typeof contentType === 'string' ? contentType : 'application/octet-stream',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  } catch (error) {
    if (mockSetting === 'auto' && !isBackendKnownOffline) {
      const parsed = parseApiError(error);
      if (parsed.status === 0) {
        isBackendKnownOffline = true;
        return mockService.triggerMockFileDownload(token, fileId);
      }
    }
    const err = parseApiError(error);
    throw new Error(err.message);
  }
}

/**
 * Trigger download all ZIP: GET /api/shares/:token/download-all
 */
export async function downloadAllZip(token: string): Promise<void> {
  if (shouldUseMock()) {
    return mockService.triggerMockDownloadAll(token);
  }

  try {
    const response = await apiClient.get(
      `/api/shares/${encodeURIComponent(token)}/download-all`,
      {
        responseType: 'blob',
      }
    );

    const blob = new Blob([response.data], {
      type: 'application/zip',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `share_${token.slice(0, 8)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  } catch (error) {
    if (mockSetting === 'auto' && !isBackendKnownOffline) {
      const parsed = parseApiError(error);
      if (parsed.status === 0) {
        isBackendKnownOffline = true;
        return mockService.triggerMockDownloadAll(token);
      }
    }
    const err = parseApiError(error);
    throw new Error(err.message);
  }
}
