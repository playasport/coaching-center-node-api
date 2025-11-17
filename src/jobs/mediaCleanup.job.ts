import cron from 'node-cron';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import * as mediaService from '../services/coachingCenterMedia.service';
import { logger } from '../utils/logger';
import { config } from '../config/env';

/**
 * Cleanup job to permanently delete media that has been soft deleted for 6+ months
 * Runs daily at 2 AM
 */
export const startMediaCleanupJob = (): void => {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting media cleanup job - deleting media soft deleted for 6+ months');

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Find all coaching centers with soft-deleted media
      const coachingCenters = await CoachingCenterModel.find({
        is_deleted: false,
        $or: [
          { 'documents.is_deleted': true, 'documents.deletedAt': { $lte: sixMonthsAgo } },
          { 'sport_details.images.is_deleted': true, 'sport_details.images.deletedAt': { $lte: sixMonthsAgo } },
          { 'sport_details.videos.is_deleted': true, 'sport_details.videos.deletedAt': { $lte: sixMonthsAgo } },
        ],
      }).lean();

      let totalDeleted = 0;
      let totalErrors = 0;

      for (const center of coachingCenters) {
        try {
          // Get fresh document to modify
          const coachingCenter = await CoachingCenterModel.findById(center._id);
          if (!coachingCenter) continue;

          let hasChanges = false;

          // Process documents
          if (coachingCenter.documents && Array.isArray(coachingCenter.documents)) {
            const documentsToDelete: number[] = [];

            coachingCenter.documents.forEach((doc, index) => {
              if (doc.is_deleted && doc.deletedAt && doc.deletedAt <= sixMonthsAgo) {
                documentsToDelete.push(index);
              }
            });

            // Delete from S3 and remove from array (reverse order to maintain indices)
            for (let i = documentsToDelete.length - 1; i >= 0; i--) {
              const index = documentsToDelete[i];
              const doc = coachingCenter.documents[index];

              try {
                await mediaService.deleteMediaFile(doc.url);
                coachingCenter.documents.splice(index, 1);
                hasChanges = true;
                totalDeleted++;
                logger.info('Permanently deleted document from S3 and database', {
                  coachingCenterId: center._id.toString(),
                  uniqueId: doc.unique_id,
                  url: doc.url,
                });
              } catch (error) {
                logger.error('Failed to delete document from S3', {
                  coachingCenterId: center._id.toString(),
                  uniqueId: doc.unique_id,
                  url: doc.url,
                  error,
                });
                totalErrors++;
              }
            }

            if (hasChanges && documentsToDelete.length > 0) {
              coachingCenter.markModified('documents');
            }
          }

          // Process sport_details images and videos
          if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
            for (let sportIndex = 0; sportIndex < coachingCenter.sport_details.length; sportIndex++) {
              const sportDetail = coachingCenter.sport_details[sportIndex];

              // Process images
              if (sportDetail.images && Array.isArray(sportDetail.images)) {
                const imagesToDelete: number[] = [];

                sportDetail.images.forEach((img, index) => {
                  if (img.is_deleted && img.deletedAt && img.deletedAt <= sixMonthsAgo) {
                    imagesToDelete.push(index);
                  }
                });

                // Delete from S3 and remove from array (reverse order)
                for (let i = imagesToDelete.length - 1; i >= 0; i--) {
                  const index = imagesToDelete[i];
                  const img = sportDetail.images[index];

                  try {
                    await mediaService.deleteMediaFile(img.url);
                    sportDetail.images.splice(index, 1);
                    hasChanges = true;
                    totalDeleted++;
                    logger.info('Permanently deleted image from S3 and database', {
                      coachingCenterId: center._id.toString(),
                      sportId: sportDetail.sport_id.toString(),
                      uniqueId: img.unique_id,
                      url: img.url,
                    });
                  } catch (error) {
                    logger.error('Failed to delete image from S3', {
                      coachingCenterId: center._id.toString(),
                      sportId: sportDetail.sport_id.toString(),
                      uniqueId: img.unique_id,
                      url: img.url,
                      error,
                    });
                    totalErrors++;
                  }
                }

                if (imagesToDelete.length > 0) {
                  coachingCenter.markModified(`sport_details.${sportIndex}.images`);
                }
              }

              // Process videos (and thumbnails)
              if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                const videosToDelete: number[] = [];

                sportDetail.videos.forEach((video, index) => {
                  if (video.is_deleted && video.deletedAt && video.deletedAt <= sixMonthsAgo) {
                    videosToDelete.push(index);
                  }
                });

                // Delete from S3 and remove from array (reverse order)
                for (let i = videosToDelete.length - 1; i >= 0; i--) {
                  const index = videosToDelete[i];
                  const video = sportDetail.videos[index];

                  try {
                    // Delete video and thumbnail if exists
                    await mediaService.deleteMediaFile(video.url);
                    if (video.thumbnail) {
                      await mediaService.deleteMediaFile(video.thumbnail);
                    }
                    sportDetail.videos.splice(index, 1);
                    hasChanges = true;
                    totalDeleted++;
                    logger.info('Permanently deleted video (and thumbnail) from S3 and database', {
                      coachingCenterId: center._id.toString(),
                      sportId: sportDetail.sport_id.toString(),
                      uniqueId: video.unique_id,
                      videoUrl: video.url,
                      thumbnailUrl: video.thumbnail,
                    });
                  } catch (error) {
                    logger.error('Failed to delete video from S3', {
                      coachingCenterId: center._id.toString(),
                      sportId: sportDetail.sport_id.toString(),
                      uniqueId: video.unique_id,
                      url: video.url,
                      error,
                    });
                    totalErrors++;
                  }
                }

                if (videosToDelete.length > 0) {
                  coachingCenter.markModified(`sport_details.${sportIndex}.videos`);
                }
              }

              // Mark sport_details as modified if any changes were made
              if (hasChanges) {
                coachingCenter.markModified(`sport_details.${sportIndex}`);
              }
            }
          }

          // Save changes if any
          if (hasChanges) {
            await coachingCenter.save({ validateBeforeSave: false });
            logger.info('Coaching center updated after media cleanup', {
              coachingCenterId: center._id.toString(),
            });
          }
        } catch (error) {
          logger.error('Failed to process coaching center for media cleanup', {
            coachingCenterId: center._id.toString(),
            error,
          });
          totalErrors++;
        }
      }

      logger.info('Media cleanup job completed', {
        coachingCentersProcessed: coachingCenters.length,
        totalDeleted,
        totalErrors,
      });
    } catch (error) {
      logger.error('Media cleanup job failed', { error });
    }
  });

  logger.info('Media cleanup cron job scheduled - runs daily at 2 AM');
};

