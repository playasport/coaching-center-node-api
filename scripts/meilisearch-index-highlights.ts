/**
 * Script to re-index stream highlights in Meilisearch
 * Usage: npm run meilisearch:index-highlights
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { meilisearchIndexing } from '../src/services/meilisearch/indexing.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting Meilisearch stream highlights re-indexing...');

    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Re-index stream highlights
    logger.info('Re-indexing stream highlights...');
    const results = await meilisearchIndexing.reindexAllStreamHighlights();

    logger.info(`Re-indexing completed: ${results.success} success, ${results.failed} failed`);

    process.exit(0);
  } catch (error) {
    logger.error('Error during re-indexing:', error);
    process.exit(1);
  }
}

main();
