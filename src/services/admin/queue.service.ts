import { Queue, Job } from 'bullmq';
import { thumbnailQueue, THUMBNAIL_QUEUE_NAME } from '../../queue/thumbnailQueue';
import { videoProcessingQueue, VIDEO_PROCESSING_QUEUE_NAME } from '../../queue/videoProcessingQueue';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';

export interface QueueStats {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  state: string;
  progress: number | string | boolean | object;
  timestamp: number;
  processedOn?: number | null;
  finishedOn?: number | null;
  failedReason?: string | null;
  returnvalue?: any;
  attemptsMade: number;
  attempts: number;
}

export interface QueueListResponse {
  queues: QueueStats[];
  totalQueues: number;
}

export interface QueueJobsResponse {
  jobs: QueueJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get all queues with their statistics
 */
export const getAllQueues = async (): Promise<QueueListResponse> => {
  try {
    const queues: QueueStats[] = [];

    // Get thumbnail queue stats
    try {
      const [
        thumbnailActive,
        thumbnailWaiting,
        thumbnailCompleted,
        thumbnailFailed,
        thumbnailDelayed,
        thumbnailPaused,
      ] = await Promise.all([
        thumbnailQueue.getActiveCount(),
        thumbnailQueue.getWaitingCount(),
        thumbnailQueue.getCompletedCount(),
        thumbnailQueue.getFailedCount(),
        thumbnailQueue.getDelayedCount(),
        thumbnailQueue.isPaused(),
      ]);

      queues.push({
        name: THUMBNAIL_QUEUE_NAME,
        active: thumbnailActive,
        waiting: thumbnailWaiting,
        completed: thumbnailCompleted,
        failed: thumbnailFailed,
        delayed: thumbnailDelayed,
        paused: thumbnailPaused,
      });
    } catch (error) {
      logger.error('Failed to get thumbnail queue stats', { error });
    }

    // Get video processing queue stats
    try {
      const [
        videoActive,
        videoWaiting,
        videoCompleted,
        videoFailed,
        videoDelayed,
        videoPaused,
      ] = await Promise.all([
        videoProcessingQueue.getActiveCount(),
        videoProcessingQueue.getWaitingCount(),
        videoProcessingQueue.getCompletedCount(),
        videoProcessingQueue.getFailedCount(),
        videoProcessingQueue.getDelayedCount(),
        videoProcessingQueue.isPaused(),
      ]);

      queues.push({
        name: VIDEO_PROCESSING_QUEUE_NAME,
        active: videoActive,
        waiting: videoWaiting,
        completed: videoCompleted,
        failed: videoFailed,
        delayed: videoDelayed,
        paused: videoPaused,
      });
    } catch (error) {
      logger.error('Failed to get video processing queue stats', { error });
    }

    return {
      queues,
      totalQueues: queues.length,
    };
  } catch (error) {
    logger.error('Failed to get all queues', { error });
    throw new ApiError(500, 'Failed to retrieve queue information');
  }
};

/**
 * Get queue by name
 */
const getQueueByName = (queueName: string): Queue => {
  switch (queueName) {
    case THUMBNAIL_QUEUE_NAME:
      return thumbnailQueue;
    case VIDEO_PROCESSING_QUEUE_NAME:
      return videoProcessingQueue;
    default:
      throw new ApiError(404, `Queue not found: ${queueName}`);
  }
};

/**
 * Get jobs from a specific queue
 */
export const getQueueJobs = async (
  queueName: string,
  status: 'active' | 'waiting' | 'completed' | 'failed' | 'delayed' | 'all' = 'all',
  page: number = 1,
  limit: number = 50
): Promise<QueueJobsResponse> => {
  try {
    const queue = getQueueByName(queueName);
    const pageNumber = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNumber - 1) * pageSize;

    let jobs: Job[] = [];
    let total = 0;

    switch (status) {
      case 'active':
        jobs = await queue.getActive();
        total = await queue.getActiveCount();
        break;
      case 'waiting':
        jobs = await queue.getWaiting();
        total = await queue.getWaitingCount();
        break;
      case 'completed':
        jobs = await queue.getCompleted();
        total = await queue.getCompletedCount();
        break;
      case 'failed':
        jobs = await queue.getFailed();
        total = await queue.getFailedCount();
        break;
      case 'delayed':
        jobs = await queue.getDelayed();
        total = await queue.getDelayedCount();
        break;
      case 'all':
      default:
        const [active, waiting, completed, failed, delayed] = await Promise.all([
          queue.getActive(),
          queue.getWaiting(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);
        jobs = [...active, ...waiting, ...completed, ...failed, ...delayed];
        total = jobs.length;
        break;
    }

    // Sort by timestamp (newest first)
    jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Paginate
    const paginatedJobs = jobs.slice(skip, skip + pageSize);

    // Format jobs
    const formattedJobs: QueueJob[] = await Promise.all(
      paginatedJobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id || '',
          name: job.name || '',
          data: job.data,
          state,
          progress: job.progress || 0,
          timestamp: job.timestamp || 0,
          processedOn: job.processedOn || null,
          finishedOn: job.finishedOn || null,
          failedReason: job.failedReason || null,
          returnvalue: job.returnvalue || null,
          attemptsMade: job.attemptsMade || 0,
          attempts: job.opts?.attempts || 0,
        };
      })
    );

    return {
      jobs: formattedJobs,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    logger.error('Failed to get queue jobs', { queueName, status, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to retrieve queue jobs');
  }
};

/**
 * Get a specific job by ID
 */
export const getQueueJob = async (
  queueName: string,
  jobId: string
): Promise<QueueJob | null> => {
  try {
    const queue = getQueueByName(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id || '',
      name: job.name || '',
      data: job.data,
      state,
      progress: job.progress || 0,
      timestamp: job.timestamp || 0,
      processedOn: job.processedOn || null,
      finishedOn: job.finishedOn || null,
      failedReason: job.failedReason || null,
      returnvalue: job.returnvalue || null,
      attemptsMade: job.attemptsMade || 0,
      attempts: job.opts?.attempts || 0,
    };
  } catch (error) {
    logger.error('Failed to get queue job', { queueName, jobId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to retrieve queue job');
  }
};

/**
 * Retry a failed job
 */
export const retryJob = async (queueName: string, jobId: string): Promise<void> => {
  try {
    const queue = getQueueByName(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    await job.retry();

    logger.info('Job retried', { queueName, jobId });
  } catch (error) {
    logger.error('Failed to retry job', { queueName, jobId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to retry job');
  }
};

/**
 * Remove a job
 */
export const removeJob = async (queueName: string, jobId: string): Promise<void> => {
  try {
    const queue = getQueueByName(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    await job.remove();

    logger.info('Job removed', { queueName, jobId });
  } catch (error) {
    logger.error('Failed to remove job', { queueName, jobId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to remove job');
  }
};

/**
 * Pause a queue
 */
export const pauseQueue = async (queueName: string): Promise<void> => {
  try {
    const queue = getQueueByName(queueName);
    await queue.pause();

    logger.info('Queue paused', { queueName });
  } catch (error) {
    logger.error('Failed to pause queue', { queueName, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to pause queue');
  }
};

/**
 * Resume a queue
 */
export const resumeQueue = async (queueName: string): Promise<void> => {
  try {
    const queue = getQueueByName(queueName);
    await queue.resume();

    logger.info('Queue resumed', { queueName });
  } catch (error) {
    logger.error('Failed to resume queue', { queueName, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to resume queue');
  }
};

/**
 * Clean a queue (remove completed/failed jobs)
 */
export const cleanQueue = async (
  queueName: string,
  grace: number = 1000,
  limit: number = 1000
): Promise<number> => {
  try {
    const queue = getQueueByName(queueName);
    
    // Clean completed and failed jobs
    const [completedCleaned, failedCleaned] = await Promise.all([
      queue.clean(grace, limit, 'completed'),
      queue.clean(grace, limit, 'failed'),
    ]);

    const totalCleaned = completedCleaned.length + failedCleaned.length;

    logger.info('Queue cleaned', { queueName, completedCleaned: completedCleaned.length, failedCleaned: failedCleaned.length });

    return totalCleaned;
  } catch (error) {
    logger.error('Failed to clean queue', { queueName, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to clean queue');
  }
};

