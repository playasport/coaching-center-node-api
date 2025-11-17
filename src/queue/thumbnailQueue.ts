import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateVideoThumbnail } from '../services/videoThumbnail.service';
import { CoachingCenterModel } from '../models/coachingCenter.model';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

// Queue name
export const THUMBNAIL_QUEUE_NAME = 'thumbnail-generation';

// Thumbnail job data interface
export interface ThumbnailJobData {
  coachingCenterId: string;
  videoUrl: string;
  videoUniqueId?: string;
  sportDetailIndex?: number;
  videoIndex?: number;
}

/**
 * Create the thumbnail generation queue
 */
export const thumbnailQueue = new Queue<ThumbnailJobData>(THUMBNAIL_QUEUE_NAME, {
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
 * Worker to process thumbnail generation jobs
 */
export const thumbnailWorker = new Worker<ThumbnailJobData>(
  THUMBNAIL_QUEUE_NAME,
  async (job: Job<ThumbnailJobData>) => {
    const { coachingCenterId, videoUrl, videoUniqueId, sportDetailIndex, videoIndex } = job.data;

    logger.info('Processing thumbnail generation job', {
      jobId: job.id,
      coachingCenterId,
      videoUrl,
      sportDetailIndex,
      videoIndex,
    });

    try {
      // Generate thumbnail
      const thumbnailUrl = await generateVideoThumbnail(videoUrl);

      logger.info('Thumbnail generated successfully', {
        jobId: job.id,
        coachingCenterId,
        videoUrl,
        thumbnailUrl,
      });

      // Update coaching center document with thumbnail URL
      let updateSuccess = false;

      if (sportDetailIndex !== undefined && videoIndex !== undefined) {
        // Use array positional update with indices
        try {
          const result = await CoachingCenterModel.findByIdAndUpdate(
            coachingCenterId,
            {
              $set: {
                [`sport_details.${sportDetailIndex}.videos.${videoIndex}.thumbnail`]: thumbnailUrl,
              },
            },
            {
              new: true,
              runValidators: false, // Skip validators for performance
            }
          );

          if (result) {
            // Verify the update worked by checking the returned document
            const updatedVideo = result.sport_details?.[sportDetailIndex]?.videos?.[videoIndex];
            
            if (updatedVideo && updatedVideo.thumbnail === thumbnailUrl) {
              updateSuccess = true;
              logger.info('Coaching center updated with thumbnail URL (using indices, verified)', {
                jobId: job.id,
                coachingCenterId,
                thumbnailUrl,
                sportDetailIndex,
                videoIndex,
              });
            } else {
              logger.warn('Update query succeeded but thumbnail not found in returned document', {
                jobId: job.id,
                coachingCenterId,
                sportDetailIndex,
                videoIndex,
                expectedThumbnail: thumbnailUrl,
                actualThumbnail: updatedVideo?.thumbnail,
              });
            }
          } else {
            logger.warn('Coaching center not found for thumbnail update', {
              jobId: job.id,
              coachingCenterId,
              sportDetailIndex,
              videoIndex,
            });
          }
        } catch (updateError) {
          logger.error('Failed to update thumbnail using indices', {
            jobId: job.id,
            coachingCenterId,
            sportDetailIndex,
            videoIndex,
            error: updateError instanceof Error ? updateError.message : updateError,
            stack: updateError instanceof Error ? updateError.stack : undefined,
          });
        }
      }

      // If update with indices failed or indices not provided, try to find by URL/unique_id
      if (!updateSuccess) {
        try {
          // Fetch the document as a Mongoose document (not lean) to enable direct updates
          const coachingCenter = await CoachingCenterModel.findById(coachingCenterId);
          
          if (!coachingCenter) {
            logger.warn('Coaching center not found for thumbnail update', {
              jobId: job.id,
              coachingCenterId,
              videoUrl,
              videoUniqueId,
            });
          } else if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
            // Find the video and update directly in the document
            let found = false;
            
            for (let i = 0; i < coachingCenter.sport_details.length; i++) {
              const sportDetail = coachingCenter.sport_details[i];
              if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                for (let j = 0; j < sportDetail.videos.length; j++) {
                  const video = sportDetail.videos[j];
                  
                  // Match by URL or unique_id
                  if (
                    (video.url === videoUrl || video.url?.includes(videoUrl)) ||
                    (videoUniqueId && video.unique_id === videoUniqueId)
                  ) {
                    try {
                      // Update the video thumbnail directly in the document
                      coachingCenter.sport_details[i].videos[j].thumbnail = thumbnailUrl;
                      
                      // Mark the specific path as modified for Mongoose
                      coachingCenter.markModified(`sport_details.${i}.videos.${j}.thumbnail`);
                      
                      // Save the document
                      await coachingCenter.save({ validateBeforeSave: false });
                      
                      // Verify the update by refetching
                      const updatedDoc = await CoachingCenterModel.findById(coachingCenterId).lean();
                      const updatedVideo = updatedDoc?.sport_details?.[i]?.videos?.[j];
                      
                      if (updatedVideo && updatedVideo.thumbnail === thumbnailUrl) {
                        updateSuccess = true;
                        logger.info('Coaching center updated with thumbnail URL (verified)', {
                          jobId: job.id,
                          coachingCenterId,
                          thumbnailUrl,
                          sportDetailIndex: i,
                          videoIndex: j,
                          videoUrl: video.url,
                          videoUniqueId: video.unique_id,
                        });
                      } else {
                        logger.warn('Thumbnail update saved but verification failed', {
                          jobId: job.id,
                          coachingCenterId,
                          expectedThumbnail: thumbnailUrl,
                          actualThumbnail: updatedVideo?.thumbnail,
                        });
                      }
                      
                      found = true;
                      break;
                    } catch (updateError) {
                      logger.error('Failed to update thumbnail in document', {
                        jobId: job.id,
                        coachingCenterId,
                        sportDetailIndex: i,
                        videoIndex: j,
                        error: updateError instanceof Error ? updateError.message : updateError,
                        stack: updateError instanceof Error ? updateError.stack : undefined,
                      });
                    }
                    
                    if (found) {
                      break;
                    }
                  }
                }
              }
              
              if (found) {
                break;
              }
            }

            if (!found) {
              logger.warn('Could not find video to update thumbnail', {
                jobId: job.id,
                coachingCenterId,
                videoUrl,
                videoUniqueId,
                sportDetailsCount: coachingCenter.sport_details.length,
              });
            }
          } else {
            logger.warn('Coaching center has no sport_details array', {
              jobId: job.id,
              coachingCenterId,
            });
          }
        } catch (findError) {
          logger.error('Failed to find coaching center for thumbnail update', {
            jobId: job.id,
            coachingCenterId,
            error: findError instanceof Error ? findError.message : findError,
            stack: findError instanceof Error ? findError.stack : undefined,
          });
        }
      }

      if (!updateSuccess) {
        logger.error('Thumbnail generated but database update failed', {
          jobId: job.id,
          coachingCenterId,
          videoUrl,
          videoUniqueId,
          thumbnailUrl,
          sportDetailIndex,
          videoIndex,
        });
      }

      return { thumbnailUrl, success: true };
    } catch (error) {
      logger.error('Thumbnail generation job failed', {
        jobId: job.id,
        coachingCenterId,
        videoUrl,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection,
    concurrency: 3, // Process 3 jobs concurrently
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 60000, // per 60 seconds
    },
  }
);

// Worker event handlers
thumbnailWorker.on('completed', (job) => {
  logger.info('Thumbnail generation job completed', {
    jobId: job.id,
    coachingCenterId: job.data.coachingCenterId,
  });
});

thumbnailWorker.on('failed', (job, err) => {
  logger.error('Thumbnail generation job failed', {
    jobId: job?.id,
    coachingCenterId: job?.data?.coachingCenterId,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

thumbnailWorker.on('error', (err) => {
  logger.error('Thumbnail worker error', {
    error: err.message,
    stack: err.stack,
  });
});

/**
 * Add thumbnail generation job to queue
 */
export const enqueueThumbnailGeneration = async (
  coachingCenterId: string,
  videoUrl: string,
  options?: {
    videoUniqueId?: string;
    sportDetailIndex?: number;
    videoIndex?: number;
  }
): Promise<void> => {
  try {
    await thumbnailQueue.add(
      'generate-thumbnail',
      {
        coachingCenterId,
        videoUrl,
        videoUniqueId: options?.videoUniqueId,
        sportDetailIndex: options?.sportDetailIndex,
        videoIndex: options?.videoIndex,
      },
      {
        priority: 1, // Normal priority
      }
    );

    logger.info('Thumbnail generation job added to queue', {
      coachingCenterId,
      videoUrl,
      options,
    });
  } catch (error) {
    logger.error('Failed to enqueue thumbnail generation job', {
      coachingCenterId,
      videoUrl,
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw - queue failures shouldn't break the main flow
  }
};

