import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  MEDIA_MOVE_QUEUE_NAME,
  MediaMoveJobData,
} from './mediaMoveQueue';
import * as commonService from '../services/common/coachingCenterCommon.service';
import { CoachingCenterModel } from '../models/coachingCenter.model';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

// Get concurrency from environment variable (default: 2)
const MEDIA_MOVE_CONCURRENCY = Number(process.env.MEDIA_MOVE_CONCURRENCY || 2);

/**
 * Create worker for processing media move jobs
 * This worker moves files from temp to permanent locations for coaching centers
 */
export const mediaMoveWorker = new Worker<MediaMoveJobData>(
  MEDIA_MOVE_QUEUE_NAME,
  async (job) => {
    try {
      logger.info('Received media move job', {
        jobId: job.id,
        coachingCenterId: job.data.coachingCenterId,
        fileCount: job.data.fileUrls.length,
      });

      const { coachingCenterId, fileUrls } = job.data;

      // Validate required fields
      if (!coachingCenterId || !fileUrls || fileUrls.length === 0) {
        const error = new Error('Missing required fields in job data');
        logger.error('Job data validation failed', {
          coachingCenterId,
          fileCount: fileUrls?.length || 0,
          rawData: job.data,
        });
        throw error;
      }

      logger.info('Starting media move job', {
        coachingCenterId,
        fileCount: fileUrls.length,
      });

      // Fetch the coaching center to get the full object
      const query = commonService.getQueryById(coachingCenterId);
      const coachingCenter = await CoachingCenterModel.findOne(query).lean();

      if (!coachingCenter) {
        const error = new Error(`Coaching center with ID ${coachingCenterId} not found`);
        logger.error('Coaching center not found for media move', {
          coachingCenterId,
        });
        throw error;
      }

      // Move media files to permanent location
      // This function handles all the file moving and database updates
      await commonService.moveMediaFilesToPermanent(coachingCenter as any);

      logger.info('Media move job completed successfully', {
        jobId: job.id,
        coachingCenterId,
        fileCount: fileUrls.length,
      });

      return {
        success: true,
        coachingCenterId,
        filesMoved: fileUrls.length,
      };
    } catch (error) {
      logger.error('Media move job failed', {
        jobId: job.id,
        coachingCenterId: job.data.coachingCenterId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    concurrency: MEDIA_MOVE_CONCURRENCY,
    connection,
  }
);

// Worker event handlers
mediaMoveWorker.on('error', (error) => {
  logger.error('Media move worker error', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });
});

mediaMoveWorker.on('failed', async (job, error) => {
  logger.error('Media move job failed permanently', {
    jobId: job?.id,
    coachingCenterId: job?.data?.coachingCenterId,
    attempts: job?.attemptsMade,
    error: error instanceof Error ? error.message : error,
  });
});

mediaMoveWorker.on('completed', (job) => {
  logger.info('Media move job completed', {
    jobId: job.id,
    coachingCenterId: job.data.coachingCenterId,
    fileCount: job.data.fileUrls.length,
  });
});

mediaMoveWorker.on('stalled', (jobId) => {
  logger.warn('Media move job stalled', { jobId });
});

mediaMoveWorker.on('ready', () => {
  logger.info('Media move worker ready', {
    concurrency: MEDIA_MOVE_CONCURRENCY,
    queueName: MEDIA_MOVE_QUEUE_NAME,
  });
});

mediaMoveWorker.on('closed', () => {
  logger.info('Media move worker closed');
});

/**
 * Close the media move worker gracefully
 */
export const closeMediaMoveWorker = async (): Promise<void> => {
  try {
    await mediaMoveWorker.close();
    logger.info('Media move worker closed successfully');
  } catch (error) {
    logger.error('Error closing media move worker', {
      error: error instanceof Error ? error.message : error,
    });
  }
};
