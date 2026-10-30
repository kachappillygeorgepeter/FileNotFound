export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
  passwordRequired?: boolean;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: string;
    server: string;
  };
}

