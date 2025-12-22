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

// Queue name - using the same queue name as your video converter server
export const VIDEO_PROCESSING_QUEUE_NAME = 'video-processing-reel';

/**
 * Video processing is now handled by the worker in this project.
 * Set VIDEO_PROCESSING_CONCURRENCY environment variable to control
 * how many videos are processed simultaneously (default: 2).
 * 
 * Example: VIDEO_PROCESSING_CONCURRENCY=3 (processes 3 videos at the same time)
 */

// Video processing job data interface
export interface VideoProcessingJobData {
  highlightId?: string;
  reelId?: string;
  videoUrl: string;
  folderPath: string;
  type: 'highlight' | 'reel';
  timestamp?: number;
}

/**
 * Create the video processing queue
 * This uses the same queue that your video converter server processes
 */
export const videoProcessingQueue = new Queue<VideoProcessingJobData>(VIDEO_PROCESSING_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Add video processing job to queue (non-blocking)
 * The job will be processed by your existing video converter server worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export const enqueueVideoProcessing = async (
  data: VideoProcessingJobData
): Promise<void> => {
  // Generate folder path if not provided
  const folderPath = data.folderPath || 
    (data.type === 'highlight' 
      ? `highlights/${data.highlightId || 'temp'}`
      : `reels/${data.reelId || 'temp'}`);

  // Use reelId for both highlights and reels (as per your video converter server structure)
  const reelId = data.reelId || data.highlightId || '';

  // Fire and forget - don't await, process in background
  videoProcessingQueue.add('video-processing-reel', {
    reelId,
    videoUrl: data.videoUrl,
    folderPath,
    type: data.type,
    highlightId: data.highlightId,
    timestamp: data.timestamp || Date.now(),
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  }).then((job) => {
    logger.info('Video processing job added to queue (background)', {
      jobId: job.id,
      highlightId: data.highlightId,
      reelId: data.reelId,
      videoUrl: data.videoUrl,
      type: data.type,
      folderPath,
    });
  }).catch((error) => {
    // Log error but don't throw - queue failures shouldn't break the main flow
    logger.error('Failed to enqueue video processing job (non-blocking)', {
      highlightId: data.highlightId,
      reelId: data.reelId,
      error: error instanceof Error ? error.message : error,
    });
  });
};
