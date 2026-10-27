import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler:
 * - Logs internal details and errors structured with logger (no secrets)
 * - Returns clean, safe generic responses to the client
 * - Never returns stack traces to the client
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let clientMessage = 'An unexpected error occurred. Please try again.';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    clientMessage = err.message;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body
    statusCode = 400;
    clientMessage = 'Malformed JSON in request body.';
  } else if (err instanceof Error) {
    if (err.name === 'PayloadTooLargeError') {
      statusCode = 413;
      clientMessage = 'Payload too large.';
    }
  }

  // Internal structured log (never send raw error details or stack traces to client)
  logger.error('Unhandled request error', {
    statusCode,
    errorMessage: err instanceof Error ? err.message : String(err),
  });

  if (!res.headersSent) {
    res.status(statusCode).json({ error: clientMessage });
  }
}
