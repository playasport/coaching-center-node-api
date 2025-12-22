import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { processVideoToHLS } from '../services/common/hlsVideoProcessor.service';
import {
  VIDEO_PROCESSING_QUEUE_NAME,
  VideoProcessingJobData,
} from './videoProcessingQueue';
import {
  StreamHighlightModel,
  VideoProcessingStatus,
} from '../models/streamHighlight.model';
import { ReelModel } from '../models/reel.model';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

// Create worker for processing jobs
export const videoProcessingWorker = new Worker<VideoProcessingJobData>(
  VIDEO_PROCESSING_QUEUE_NAME,
  async (job) => {
    try {
      logger.info('Received video processing job', {
        jobId: job.id,
        data: job.data,
      });

      // Extract job data (BullMQ format)
      const jobData = job.data as VideoProcessingJobData;
      const reelId = jobData.reelId || jobData.highlightId;
      const videoUrl = jobData.videoUrl;
      const folderPath = jobData.folderPath;
      const highlightId = jobData.highlightId;

      // Validate required fields
      if (!reelId || !videoUrl || !folderPath) {
        const error = new Error('Missing required fields in job data');
        logger.error('Job data validation failed', {
          reelId,
          videoUrl,
          folderPath,
          highlightId,
          rawData: job.data,
        });
        throw error;
      }

      logger.info('Starting video processing job', {
        reelId,
        highlightId,
        videoUrl,
        folderPath,
      });

      // Get existing thumbnail URL if highlight or reel exists (to avoid regenerating)
      let existingThumbnailUrl: string | null = null;
      if (highlightId) {
        const existingHighlight = await StreamHighlightModel.findOne({ id: highlightId }).lean();
        if (existingHighlight?.thumbnailUrl) {
          existingThumbnailUrl = existingHighlight.thumbnailUrl;
          logger.info('Found existing thumbnail, will not regenerate', {
            highlightId,
            existingThumbnailUrl,
          });
        }

        // Update highlight videoProcessingStatus to PROCESSING
        await StreamHighlightModel.findOneAndUpdate(
          { id: highlightId },
          { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
          { new: true }
        );
        logger.info('Updated highlight videoProcessingStatus to PROCESSING', { highlightId });
      } else if (reelId) {
        const existingReel = await ReelModel.findOne({ id: reelId }).lean();
        if (existingReel?.thumbnailPath) {
          existingThumbnailUrl = existingReel.thumbnailPath;
          logger.info('Found existing thumbnail, will not regenerate', {
            reelId,
            existingThumbnailUrl,
          });
        }

        // Update reel videoProcessingStatus to PROCESSING
        await ReelModel.findOneAndUpdate(
          { id: reelId },
          { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
          { new: true }
        );
        logger.info('Updated reel videoProcessingStatus to PROCESSING', { reelId });
      }

      // Process the video using our existing function
      // Pass existing thumbnail URL to avoid regenerating if already exists
      const result = await processVideoToHLS(videoUrl, folderPath, reelId, existingThumbnailUrl);

      // Update highlight or reel with processed video URLs and set status to COMPLETED
      if (highlightId) {
        // Construct permanent video URL: highlights/{highlightId}/{highlightId}.mp4
        // Extract file extension from original videoUrl
        const fileExtension = videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
        const permanentVideoUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/highlights/${highlightId}/${highlightId}.${fileExtension}`;
        
        const updateData: any = {
          videoProcessingStatus: VideoProcessingStatus.COMPLETED,
          videoUrl: permanentVideoUrl, // Update to permanent location
          masterM3u8Url: result.masterPlaylistUrl,
          previewUrl: result.previewUrl || undefined,
          duration: result.duration, // Automatically extracted from video
          hlsUrls: {
            '240p': result.qualities.find((q) => q.name === '240p')?.playlistUrl,
            '360p': result.qualities.find((q) => q.name === '360p')?.playlistUrl,
            '480p': result.qualities.find((q) => q.name === '480p')?.playlistUrl,
            '720p': result.qualities.find((q) => q.name === '720p')?.playlistUrl,
            '1080p': result.qualities.find((q) => q.name === '1080p')?.playlistUrl,
          },
        };

        // Only update thumbnailUrl if it was generated (not if existing one was used)
        if (!existingThumbnailUrl && result.thumbnailUrl) {
          updateData.thumbnailUrl = result.thumbnailUrl;
        }

        await StreamHighlightModel.findOneAndUpdate(
          { id: highlightId },
          { $set: updateData },
          { new: true, runValidators: true }
        );
        logger.info('Updated highlight with processed video URLs, permanent videoUrl, and duration', {
          highlightId,
          permanentVideoUrl,
          thumbnailUpdated: !existingThumbnailUrl,
          duration: result.duration,
        });
      } else if (reelId) {
        // Construct permanent video URL: reels/{reelId}/{reelId}.mp4
        // Extract file extension from original videoUrl
        const fileExtension = videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
        const permanentVideoUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/reels/${reelId}/${reelId}.${fileExtension}`;
        
        const updateData: any = {
          videoProcessingStatus: VideoProcessingStatus.COMPLETED,
          originalPath: permanentVideoUrl, // Update to permanent location
          masterM3u8Url: result.masterPlaylistUrl,
          previewUrl: result.previewUrl || undefined,
          hlsUrls: {
            '240p': result.qualities.find((q) => q.name === '240p')?.playlistUrl,
            '360p': result.qualities.find((q) => q.name === '360p')?.playlistUrl,
            '480p': result.qualities.find((q) => q.name === '480p')?.playlistUrl,
            '720p': result.qualities.find((q) => q.name === '720p')?.playlistUrl,
            '1080p': result.qualities.find((q) => q.name === '1080p')?.playlistUrl,
          },
        };

        // Only update thumbnailPath if it was generated (not if existing one was used)
        if (!existingThumbnailUrl && result.thumbnailUrl) {
          updateData.thumbnailPath = result.thumbnailUrl;
        }

        await ReelModel.findOneAndUpdate(
          { id: reelId },
          { $set: updateData },
          { new: true, runValidators: true }
        );
        logger.info('Updated reel with processed video URLs, permanent videoUrl', {
          reelId,
          permanentVideoUrl,
          thumbnailUpdated: !existingThumbnailUrl,
        });
      }

      logger.info('Video processing completed', {
        reelId,
        highlightId,
        result,
      });

      return {
        success: true,
        reelId,
        highlightId,
        result,
      };
    } catch (error) {
      logger.error('Error processing video job', {
        jobId: job.id,
        error: error instanceof Error ? error.message : error,
        data: job.data,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: config.videoProcessing.concurrency, // Number of videos to process simultaneously
  }
);

// Handle worker events
videoProcessingWorker.on('error', (error) => {
  logger.error('Video processing worker error', { error });
});

videoProcessingWorker.on('failed', async (job, error) => {
  logger.error('Video processing job failed', {
    jobId: job?.id,
    error: error instanceof Error ? error.message : error,
    data: job?.data,
  });

  // Update highlight or reel videoProcessingStatus to FAILED
  // Note: This is a fallback - the main error handler in the worker function also updates the status
  if (job?.data) {
    const jobData = job.data as VideoProcessingJobData;
    const highlightId = jobData.highlightId;
    const reelId = jobData.reelId;

    if (highlightId) {
      try {
        await StreamHighlightModel.findOneAndUpdate(
          { id: highlightId },
          { videoProcessingStatus: VideoProcessingStatus.FAILED },
          { new: true }
        );
        logger.info('Updated highlight videoProcessingStatus to FAILED (from failed event)', {
          highlightId,
        });
      } catch (updateError) {
        logger.error('Failed to update highlight status on job failure', {
          highlightId,
          error: updateError,
        });
      }
    } else if (reelId) {
      try {
        await ReelModel.findOneAndUpdate(
          { id: reelId },
          { videoProcessingStatus: VideoProcessingStatus.FAILED },
          { new: true }
        );
        logger.info('Updated reel videoProcessingStatus to FAILED (from failed event)', {
          reelId,
        });
      } catch (updateError) {
        logger.error('Failed to update reel status on job failure', {
          reelId,
          error: updateError,
        });
      }
    }
  }
});

videoProcessingWorker.on('completed', (job) => {
  logger.info('Video processing job completed', {
    jobId: job.id,
    data: job.data,
  });
});

videoProcessingWorker.on('stalled', (jobId) => {
  logger.warn('Video processing job stalled', { jobId });
});

videoProcessingWorker.on('ready', () => {
  logger.info('Video processing worker is ready', {
    queueName: VIDEO_PROCESSING_QUEUE_NAME,
    concurrency: config.videoProcessing.concurrency,
    connection: {
      host: config.redis.host,
      port: config.redis.port,
    },
  });
});

videoProcessingWorker.on('closed', () => {
  logger.warn('Video processing worker has been closed');
});

// Graceful shutdown
export const closeVideoProcessingWorker = async (): Promise<void> => {
  try {
    await videoProcessingWorker.close();
    logger.info('Video processing worker closed successfully');
  } catch (error) {
    logger.error('Error closing video processing worker', { error });
  }
};

