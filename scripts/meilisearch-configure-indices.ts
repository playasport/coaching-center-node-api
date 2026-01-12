/**
 * Script to configure Meilisearch indices settings
 * Usage: npm run meilisearch:configure
 */

import dotenv from 'dotenv';
import { meilisearchIndexing } from '../src/services/meilisearch/indexing.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Configuring Meilisearch indices...');

    const success = await meilisearchIndexing.configureIndices();

    if (success) {
      logger.info('Meilisearch indices configured successfully');
      process.exit(0);
    } else {
      logger.error('Failed to configure Meilisearch indices');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Error during configuration:', error);
    process.exit(1);
  }
}

main();
