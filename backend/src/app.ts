import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { shareRouter } from './routes/share.js';

export function createApp(): Express {
  const app = express();

  // Basic security and parsing middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api', healthRouter);
  app.use('/api', shareRouter);

  // Catch-all 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}
