import cron from 'node-cron';
import { runCleanup } from '../services/cleanupService.js';
import { logger } from '../utils/logger.js';

let isRunning = false;

/**
 * Initializes the scheduled cleanup worker.
 * Runs every 5 minutes: `* /5 * * * *`
 * Guaranteed non-overlapping: if a run is still in progress, subsequent triggers are skipped.
 */
export function startCleanupJob(): cron.ScheduledTask {
  logger.info('Initializing cleanup job (schedule: every 5 minutes)');

  return cron.schedule('*/5 * * * *', async () => {
    if (isRunning) {
      logger.warn('Previous cleanup run is still executing. Skipping scheduled trigger.');
      return;
    }

    isRunning = true;
    try {
      await runCleanup();
    } catch (err) {
      logger.error('Unexpected error in cleanup job execution', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      isRunning = false;
    }
  });
}
