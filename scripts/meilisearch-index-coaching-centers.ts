/**
 * Script to re-index coaching centers in Meilisearch
 * Usage: npm run meilisearch:index-coaching-centers
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { meilisearchIndexing } from '../src/services/meilisearch/indexing.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting Meilisearch coaching centers re-indexing...');

    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Re-index coaching centers
    logger.info('Re-indexing coaching centers...');
    const results = await meilisearchIndexing.reindexAllCoachingCenters();

    logger.info(`Re-indexing completed: ${results.success} success, ${results.failed} failed`);

    process.exit(0);
  } catch (error) {
    logger.error('Error during re-indexing:', error);
    process.exit(1);
  }
}

main();
