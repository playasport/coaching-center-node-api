import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  MEILISEARCH_INDEXING_QUEUE_NAME,
  MeilisearchIndexingJobData,
  IndexingJobType,
} from './meilisearchIndexingQueue';
import { meilisearchIndexing } from '../services/meilisearch/indexing.service';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

/**
 * Worker to process Meilisearch indexing jobs
 */
export const meilisearchIndexingWorker = new Worker<MeilisearchIndexingJobData>(
  MEILISEARCH_INDEXING_QUEUE_NAME,
  async (job: Job<MeilisearchIndexingJobData>) => {
    const { type, documentId } = job.data;

    logger.info('Processing Meilisearch indexing job', {
      jobId: job.id,
      type,
      documentId,
    });

    try {
      // Check if Meilisearch is enabled
      if (!config.meilisearch.enabled) {
        logger.info('Meilisearch is disabled, skipping indexing job', {
          jobId: job.id,
          type,
          documentId,
        });
        return;
      }

      // Process based on job type
      let success = false;

      switch (type) {
        case IndexingJobType.INDEX_COACHING_CENTER:
        case IndexingJobType.UPDATE_COACHING_CENTER:
          success = await meilisearchIndexing.indexCoachingCenter(documentId);
          break;

        case IndexingJobType.DELETE_COACHING_CENTER:
          success = await meilisearchIndexing.deleteCoachingCenter(documentId);
          break;

        case IndexingJobType.INDEX_SPORT:
        case IndexingJobType.UPDATE_SPORT:
          success = await meilisearchIndexing.indexSport(documentId);
          break;

        case IndexingJobType.DELETE_SPORT:
          success = await meilisearchIndexing.deleteSport(documentId);
          break;

        case IndexingJobType.INDEX_REEL:
        case IndexingJobType.UPDATE_REEL:
          success = await meilisearchIndexing.indexReel(documentId);
          break;

        case IndexingJobType.DELETE_REEL:
          success = await meilisearchIndexing.deleteReel(documentId);
          break;

        case IndexingJobType.INDEX_STREAM_HIGHLIGHT:
        case IndexingJobType.UPDATE_STREAM_HIGHLIGHT:
          success = await meilisearchIndexing.indexStreamHighlight(documentId);
          break;

        case IndexingJobType.DELETE_STREAM_HIGHLIGHT:
          success = await meilisearchIndexing.deleteStreamHighlight(documentId);
          break;

        default:
          logger.warn('Unknown indexing job type', {
            jobId: job.id,
            type,
            documentId,
          });
          throw new Error(`Unknown indexing job type: ${type}`);
      }

      if (success) {
        logger.info('Meilisearch indexing job completed successfully', {
          jobId: job.id,
          type,
          documentId,
        });
      } else {
        logger.warn('Meilisearch indexing job completed but returned false', {
          jobId: job.id,
          type,
          documentId,
        });
      }
    } catch (error) {
      logger.error('Meilisearch indexing job failed', {
        jobId: job.id,
        type,
        documentId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    connection,
    concurrency: Number(process.env.MEILISEARCH_INDEXING_CONCURRENCY || 5), // Process 5 jobs concurrently
    limiter: {
      max: 100, // Maximum 100 jobs
      duration: 1000, // Per second
    },
  }
);

// Export function to close worker
export const closeMeilisearchIndexingWorker = async (): Promise<void> => {
  await meilisearchIndexingWorker.close();
};

// Worker event handlers
meilisearchIndexingWorker.on('completed', (job) => {
  logger.debug('Meilisearch indexing job completed', {
    jobId: job.id,
    type: job.data.type,
    documentId: job.data.documentId,
  });
});

meilisearchIndexingWorker.on('failed', (job, err) => {
  logger.error('Meilisearch indexing job failed', {
    jobId: job?.id,
    type: job?.data.type,
    documentId: job?.data.documentId,
    error: err.message,
  });
});

meilisearchIndexingWorker.on('error', (err) => {
  logger.error('Meilisearch indexing worker error', {
    error: err.message,
    stack: err.stack,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down Meilisearch indexing worker...');
  await meilisearchIndexingWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down Meilisearch indexing worker...');
  await meilisearchIndexingWorker.close();
  process.exit(0);
});
