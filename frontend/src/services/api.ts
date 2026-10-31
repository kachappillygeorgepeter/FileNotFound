import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../types/api';

// Create dedicated Axios client instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://file-not-found-omega.vercel.app' : ''),
  withCredentials: true, // Needed for HTTP-only access_session_token cookie
  timeout: 60000, // 60s timeout for large uploads
});

// In-memory session token store (for x-session-token header support)
let currentSessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  currentSessionToken = token;
}

export function getSessionToken(): string | null {
  return currentSessionToken;
}

// Request interceptor: inject x-session-token header when available
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (currentSessionToken && !config.headers['x-session-token']) {
      config.headers['x-session-token'] = currentSessionToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Format API error safely without leaking backend stack traces or internal implementation details
export function parseApiError(error: unknown): {
  message: string;
  status?: number;
  passwordRequired?: boolean;
} {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiErrorResponse>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;

    if (data && typeof data === 'object' && 'error' in data && data.error) {
      return {
        message: data.error,
        status,
        passwordRequired: data.passwordRequired,
      };
    }

    if (status === 404 || status === 410) {
      return {
        message: 'Share not found, has expired, or exceeded its download limit.',
        status,
      };
    }

    if (status === 401) {
      return {
        message: 'Authentication required or invalid password.',
        status,
        passwordRequired: true,
      };
    }

    if (status === 413) {
      return {
        message: 'Upload exceeds maximum permitted file size.',
        status,
      };
    }

    if (status === 429) {
      return {
        message: 'Rate limit exceeded. Please wait a moment before trying again.',
        status,
      };
    }

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
      return {
        message: 'Connection timed out. Please check your network.',
        status,
      };
    }

    if (!axiosErr.response) {
      return {
        message: 'Unable to connect to server. Please ensure the backend service is running.',
        status: 0,
      };
    }
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unexpected error occurred. Please try again.' };
}

/**
 * Parses errors where the responseType was 'blob', reading the underlying JSON error if available.
 */
export async function parseBlobError(error: unknown): Promise<{
  message: string;
  status?: number;
  passwordRequired?: boolean;
}> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const json = JSON.parse(text);
      if (json && json.error) {
        return {
          message: json.error,
          status: error.response.status,
          passwordRequired: json.passwordRequired,
        };
      }
    } catch {
      // Fall through to standard parseApiError
    }
  }
  return parseApiError(error);
}
