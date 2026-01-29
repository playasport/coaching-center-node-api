/**
 * Script to re-index sports in Meilisearch
 * Usage: npm run meilisearch:index-sports
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { meilisearchIndexing } from '../src/services/meilisearch/indexing.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting Meilisearch sports re-indexing...');

    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Re-index sports
    logger.info('Re-indexing sports...');
    const results = await meilisearchIndexing.reindexAllSports();

    logger.info(`Re-indexing completed: ${results.success} success, ${results.failed} failed`);

    process.exit(0);
  } catch (error) {
    logger.error('Error during re-indexing:', error);
    process.exit(1);
  }
}

main();
