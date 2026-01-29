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

// Queue name for media file moves
export const MEDIA_MOVE_QUEUE_NAME = 'media-move-coaching-center';

// Media move job data interface
export interface MediaMoveJobData {
  coachingCenterId: string;
  fileUrls: string[];
  timestamp?: number;
}

/**
 * Create the media move queue
 * This queue handles moving files from temp to permanent locations for coaching centers
 */
export const mediaMoveQueue = new Queue<MediaMoveJobData>(MEDIA_MOVE_QUEUE_NAME, {
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
});

/**
 * Add media move job to queue (non-blocking)
 * The job will be processed by the media move worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export const enqueueMediaMove = async (
  data: MediaMoveJobData
): Promise<void> => {
  // Fire and forget - don't await, process in background
  mediaMoveQueue.add('media-move-coaching-center', {
    coachingCenterId: data.coachingCenterId,
    fileUrls: data.fileUrls,
    timestamp: data.timestamp || Date.now(),
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }).then((job) => {
    logger.info('Media move job added to queue (background)', {
      jobId: job.id,
      coachingCenterId: data.coachingCenterId,
      fileCount: data.fileUrls.length,
    });
  }).catch((error) => {
    // Log error but don't throw - queue failures shouldn't break the main flow
    logger.error('Failed to enqueue media move job (non-blocking)', {
      coachingCenterId: data.coachingCenterId,
      fileCount: data.fileUrls.length,
      error: error instanceof Error ? error.message : error,
    });
  });
};
