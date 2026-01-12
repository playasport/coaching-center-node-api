/**
 * Script to re-index reels in Meilisearch
 * Usage: npm run meilisearch:index-reels
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { meilisearchIndexing } from '../src/services/meilisearch/indexing.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting Meilisearch reels re-indexing...');

    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Re-index reels
    logger.info('Re-indexing reels...');
    const results = await meilisearchIndexing.reindexAllReels();

    logger.info(`Re-indexing completed: ${results.success} success, ${results.failed} failed`);

    process.exit(0);
  } catch (error) {
    logger.error('Error during re-indexing:', error);
    process.exit(1);
  }
}

main();
