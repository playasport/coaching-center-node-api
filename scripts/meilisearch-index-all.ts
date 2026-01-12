/**
 * Script to re-index all data in Meilisearch
 * Usage: npm run meilisearch:index-all
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { meilisearchIndexing } from '../src/services/meilisearch/indexing.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting Meilisearch full re-indexing...');

    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Configure indices first
    logger.info('Configuring Meilisearch indices...');
    await meilisearchIndexing.configureIndices();
    logger.info('Indices configured');

    // Re-index all data
    logger.info('Re-indexing all data...');
    const results = await meilisearchIndexing.reindexAll();

    logger.info('Re-indexing completed:');
    logger.info(`  Coaching Centers: ${results.coaching_centers.success} success, ${results.coaching_centers.failed} failed`);
    logger.info(`  Sports: ${results.sports.success} success, ${results.sports.failed} failed`);
    logger.info(`  Reels: ${results.reels.success} success, ${results.reels.failed} failed`);
    logger.info(`  Stream Highlights: ${results.stream_highlights.success} success, ${results.stream_highlights.failed} failed`);

    process.exit(0);
  } catch (error) {
    logger.error('Error during re-indexing:', error);
    process.exit(1);
  }
}

main();
