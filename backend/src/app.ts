import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { shareRouter } from './routes/share.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Trust first proxy hop (essential for accurate client IP in rate limiters behind reverse proxies)
  app.set('trust proxy', 1);

  // Security headers with Helmet
  app.use(helmet());

  // Strict & flexible CORS policy
  const allowedOrigins = Array.from(
    new Set([
      config.CLIENT_ORIGIN,
      'http://localhost:5180',
      'http://localhost:5173',
      'http://127.0.0.1:5180',
      'http://127.0.0.1:5173',
    ])
  );

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Parse cookies
  app.use(cookieParser());

  // Global request body size limit for JSON bodies (prevents large payload DoS)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api', shareRouter);

  // Catch-all 404 handler for unknown routes
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });

  // Centralized error handler (must be registered last)
  app.use(errorHandler);

  return app;
}
