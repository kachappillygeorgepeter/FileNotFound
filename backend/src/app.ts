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
  const configuredOrigins = config.CLIENT_ORIGIN.split(',').map((o) => o.trim());
  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      'https://file-not-found-xt4i.vercel.app',
      'http://localhost:5180',
      'http://localhost:5173',
      'http://127.0.0.1:5180',
      'http://127.0.0.1:5173',
    ])
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          (Boolean(process.env.VERCEL) && origin.endsWith('.vercel.app')) ||
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        ) {
          return callback(null, true);
        }
        callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Parse cookies
  app.use(cookieParser());

  // Global request body size limit for JSON bodies (prevents large payload DoS)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Root diagnostic status endpoint
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'FileNotFound API Gateway',
      status: 'online',
      version: '1.0.0',
      clientOrigin: config.CLIENT_ORIGIN,
      endpoints: {
        health: '/api/health',
        shares: '/api/shares',
      },
    });
  });

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
