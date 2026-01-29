/**
 * Test script for cron jobs
 * This file allows manual testing of cron jobs without waiting for scheduled times
 * 
 * Usage:
 *   npm run test:jobs -- --job=permanent-delete
 *   npm run test:jobs -- --job=media-cleanup
 *   npm run test:jobs -- --job=all
 */

import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { executePermanentDeleteJob } from './permanentDelete.job';
import { executeMediaCleanupJob } from './mediaCleanup.job';

async function runPermanentDeleteJob(): Promise<void> {
  try {
    logger.info('=== Starting Permanent Delete Job Test ===');
    await executePermanentDeleteJob();
    logger.info('=== Permanent Delete Job Test Completed ===');
  } catch (error) {
    logger.error('Permanent delete job test failed', { error });
    throw error;
  }
}

async function runMediaCleanupJob(): Promise<void> {
  try {
    logger.info('=== Starting Media Cleanup Job Test ===');
    await executeMediaCleanupJob();
    logger.info('=== Media Cleanup Job Test Completed ===');
  } catch (error) {
    logger.error('Media cleanup job test failed', { error });
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jobArg = args.find((arg) => arg.startsWith('--job='));
  const jobName = jobArg ? jobArg.split('=')[1] : 'all';

  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    switch (jobName) {
      case 'permanent-delete':
        await runPermanentDeleteJob();
        break;
      case 'media-cleanup':
        await runMediaCleanupJob();
        break;
      case 'all':
        await runPermanentDeleteJob();
        await runMediaCleanupJob();
        break;
      default:
        logger.error('Invalid job name. Use: permanent-delete, media-cleanup, or all');
        process.exit(1);
    }

    logger.info('All job tests completed successfully');
  } catch (error) {
    logger.error('Job test failed', { error });
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runPermanentDeleteJob, runMediaCleanupJob };

