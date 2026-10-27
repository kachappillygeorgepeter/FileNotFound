import { createApp } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/db.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`🚀 Server running in ${config.NODE_ENV} mode on http://localhost:${config.PORT}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Prisma disconnected.');
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
