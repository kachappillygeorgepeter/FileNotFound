import { createApp } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/db.js';
import { startCleanupJob } from './jobs/cleanupJob.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(`Server running in ${config.NODE_ENV} mode`, {
    port: config.PORT,
    origin: config.CLIENT_ORIGIN,
  });
});

// Start scheduled background jobs
const cleanupTask = startCleanupJob();

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  cleanupTask.stop();

  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma disconnected.');
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forcefully terminating server.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
