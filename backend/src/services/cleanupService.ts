import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const uploadDir = path.resolve(config.UPLOAD_DIR);

export interface CleanupReport {
  sharesProcessed: number;
  filesDeleted: number;
  sessionsPurged: number;
  orphansRemoved: number;
  errors: number;
}

const BATCH_SIZE = 50;
const ORPHAN_AGE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour old before considered orphan

/**
 * Cleanup Service:
 * Separated cleanly from cron wiring for direct testability.
 * 
 * 1. Finds expired shares (`expiresAt <= NOW()`) or exhausted shares (`downloadsUsed >= maxDownloads`)
 *    where `deletedAt IS NULL`.
 * 2. Deletes associated files on disk in a fault-tolerant manner.
 * 3. Sets `deletedAt = NOW()`, clears `passwordHash`.
 * 4. Purges expired access sessions (`expiresAt <= NOW()`).
 * 5. Sweeps orphaned on-disk files that have no active matching File record.
 */
export async function runCleanup(): Promise<CleanupReport> {
  const report: CleanupReport = {
    sharesProcessed: 0,
    filesDeleted: 0,
    sessionsPurged: 0,
    orphansRemoved: 0,
    errors: 0,
  };

  const now = new Date();

  // 1. Process qualifying shares in small batches
  try {
    const qualifyingShares = await prisma.share.findMany({
      where: {
        deletedAt: null,
        OR: [
          { expiresAt: { lte: now } },
          {
            downloadsUsed: {
              gte: prisma.share.fields.maxDownloads,
            },
          },
        ],
      },
      include: {
        files: true,
      },
      take: BATCH_SIZE,
    });

    for (const share of qualifyingShares) {
      try {
        // Delete all files belonging to this share from storage
        for (const file of share.files) {
          const filePath = path.join(uploadDir, file.storedName);
          try {
            await fs.unlink(filePath);
            report.filesDeleted++;
          } catch (err: unknown) {
            // Fault tolerant: if file is already missing, continue smoothly
            const code = (err as { code?: string })?.code;
            if (code !== 'ENOENT') {
              logger.warn('Failed to delete file from disk during cleanup', {
                fileId: file.id,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }

        // Delete File database records and mark share deleted with cleared password hash
        await prisma.$transaction(async (tx) => {
          await tx.file.deleteMany({
            where: { shareId: share.id },
          });

          await tx.share.update({
            where: { id: share.id },
            data: {
              deletedAt: new Date(),
              passwordHash: null,
            },
          });
        });

        report.sharesProcessed++;
      } catch (shareErr) {
        report.errors++;
        logger.error('Error processing share during cleanup run', {
          shareId: share.id,
          error: shareErr instanceof Error ? shareErr.message : String(shareErr),
        });
      }
    }
  } catch (queryErr) {
    report.errors++;
    logger.error('Failed to query qualifying shares for cleanup', {
      error: queryErr instanceof Error ? queryErr.message : String(queryErr),
    });
  }

  // 2. Purge expired AccessSession rows
  try {
    const deletedSessions = await prisma.accessSession.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });
    report.sessionsPurged = deletedSessions.count;
  } catch (sessionErr) {
    report.errors++;
    logger.error('Failed to purge expired access sessions', {
      error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
    });
  }

  // 3. Orphan disk sweep: sweep files on disk older than 1 hour with no DB record
  try {
    const diskEntries = await fs.readdir(uploadDir).catch(() => []);
    const currentTimeMs = Date.now();

    for (const entry of diskEntries) {
      // Ignore hidden files / directories
      if (entry.startsWith('.')) continue;

      const fullPath = path.join(uploadDir, entry);
      const stat = await fs.stat(fullPath).catch(() => null);

      if (!stat || !stat.isFile()) continue;

      const fileAgeMs = currentTimeMs - stat.mtimeMs;
      if (fileAgeMs > ORPHAN_AGE_THRESHOLD_MS) {
        // Check if there is an active file record with this storedName
        const existsInDb = await prisma.file.findUnique({
          where: { storedName: entry },
          select: { id: true },
        });

        if (!existsInDb) {
          try {
            await fs.unlink(fullPath);
            report.orphansRemoved++;
          } catch {
            // Ignore failure on unlink
          }
        }
      }
    }
  } catch (orphanErr) {
    report.errors++;
    logger.error('Error during disk orphan sweep', {
      error: orphanErr instanceof Error ? orphanErr.message : String(orphanErr),
    });
  }

  logger.info('Cleanup job finished', {
    sharesProcessed: report.sharesProcessed,
    filesDeleted: report.filesDeleted,
    sessionsPurged: report.sessionsPurged,
    orphansRemoved: report.orphansRemoved,
    errors: report.errors,
  });

  return report;
}
