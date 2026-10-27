export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

const REDACTED_KEYS = new Set([
  'token',
  'rawtoken',
  'sessiontoken',
  'password',
  'passwordhash',
  'tokenhash',
  'sessiontokenhash',
  'authorization',
  'cookie',
  'secret',
  'storedname',
  'filepath',
]);

/**
 * Recursively redacts sensitive keys from log context
 */
function sanitizeContext(data: unknown): unknown {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeContext(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function outputLog(level: LogLevel, event: string, context?: LogContext): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(context ? { context: sanitizeContext(context) } : {}),
  };

  const jsonString = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(jsonString);
  } else if (level === 'warn') {
    console.warn(jsonString);
  } else {
    console.log(jsonString);
  }
}

export const logger = {
  info: (event: string, context?: LogContext) => outputLog('info', event, context),
  warn: (event: string, context?: LogContext) => outputLog('warn', event, context),
  error: (event: string, context?: LogContext) => outputLog('error', event, context),
};
