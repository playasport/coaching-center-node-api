import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

// Queue name
export const MEILISEARCH_INDEXING_QUEUE_NAME = 'meilisearch-indexing';

// Indexing job types
export enum IndexingJobType {
  INDEX_COACHING_CENTER = 'index_coaching_center',
  UPDATE_COACHING_CENTER = 'update_coaching_center',
  DELETE_COACHING_CENTER = 'delete_coaching_center',
  INDEX_SPORT = 'index_sport',
  UPDATE_SPORT = 'update_sport',
  DELETE_SPORT = 'delete_sport',
  INDEX_REEL = 'index_reel',
  UPDATE_REEL = 'update_reel',
  DELETE_REEL = 'delete_reel',
  INDEX_STREAM_HIGHLIGHT = 'index_stream_highlight',
  UPDATE_STREAM_HIGHLIGHT = 'update_stream_highlight',
  DELETE_STREAM_HIGHLIGHT = 'delete_stream_highlight',
}

// Indexing job data interface
export interface MeilisearchIndexingJobData {
  type: IndexingJobType;
  documentId: string;
  timestamp: number;
}

/**
 * Create the Meilisearch indexing queue
 */
export const meilisearchIndexingQueue = new Queue<MeilisearchIndexingJobData>(
  MEILISEARCH_INDEXING_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds delay
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep maximum 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  }
);

/**
 * Enqueue a Meilisearch indexing job
 */
export const enqueueMeilisearchIndexing = async (
  type: IndexingJobType,
  documentId: string
): Promise<void> => {
  if (!config.meilisearch.enabled) {
    return; // Skip if Meilisearch is disabled
  }

  try {
    await meilisearchIndexingQueue.add(
      type,
      {
        type,
        documentId,
        timestamp: Date.now(),
      },
      {
        jobId: `${type}:${documentId}`, // Unique job ID to prevent duplicates
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    logger.debug('Meilisearch indexing job enqueued', {
      type,
      documentId,
    });
  } catch (error) {
    logger.error('Failed to enqueue Meilisearch indexing job', {
      type,
      documentId,
      error: error instanceof Error ? error.message : error,
    });
  }
};
