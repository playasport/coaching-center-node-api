import cron from 'node-cron';
import { StreamHighlightModel } from '../models/streamHighlight.model';
import { ReelModel } from '../models/reel.model';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import { deleteFileFromS3 } from '../services/common/s3.service';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../services/common/s3.service';

/**
 * Extract S3 key from URL
 */
const extractS3Key = (fileUrl: string): string | null => {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return null;
  }

  try {
    // Remove query parameters and fragments
    const urlWithoutQuery = fileUrl.split('?')[0].split('#')[0];
    
    // Try standard format: https://bucket.s3.region.amazonaws.com/key
    if (urlWithoutQuery.includes('.amazonaws.com/')) {
      const urlParts = urlWithoutQuery.split('.amazonaws.com/');
      if (urlParts.length === 2) {
        let key = urlParts[1];
        
        // Decode URL encoding
        try {
          key = decodeURIComponent(key);
        } catch (e) {
          // If decoding fails, use original key
        }
        
        // Remove bucket name if it's in the path (for path-style URLs)
        const bucketMatch = urlWithoutQuery.match(/https?:\/\/([^.]+)\.s3[.-]/);
        if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
          key = key.substring(bucketMatch[1].length + 1);
        }
        
        return key;
      }
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to extract S3 key from URL', { fileUrl, error });
    return null;
  }
};

/**
 * Delete a file from S3 by URL
 */
const deleteS3File = async (fileUrl: string | null | undefined): Promise<boolean> => {
  if (!fileUrl) {
    return false;
  }

  try {
    const key = extractS3Key(fileUrl);
    if (!key) {
      logger.warn('Could not extract S3 key from URL', { fileUrl });
      return false;
    }

    await deleteFileFromS3(fileUrl);
    return true;
  } catch (error) {
    logger.error('Failed to delete file from S3', { fileUrl, error });
    return false;
  }
};

/**
 * Delete all files in a folder (for HLS segments and playlists)
 */
const deleteS3Folder = async (folderPath: string): Promise<number> => {
  try {
    const client = getS3Client();
    if (!client) {
      logger.warn('S3 client not configured. Skipping folder deletion.');
      return 0;
    }

    // Extract folder path from S3 URL or use as-is if it's already a key
    let folderKey = folderPath;
    if (folderPath.includes('.amazonaws.com/')) {
      const key = extractS3Key(folderPath);
      if (!key) {
        logger.warn('Could not extract S3 key from folder path', { folderPath });
        return 0;
      }
      // Extract folder path (remove filename)
      const lastSlash = key.lastIndexOf('/');
      folderKey = lastSlash > 0 ? key.substring(0, lastSlash + 1) : key;
    }

    // Ensure folder path ends with /
    if (!folderKey.endsWith('/')) {
      folderKey += '/';
    }

    let deletedCount = 0;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: config.aws.s3Bucket,
        Prefix: folderKey,
        ContinuationToken: continuationToken,
      });

      const response = await client.send(listCommand);

      if (response.Contents && response.Contents.length > 0) {
        const deleteObjects = response.Contents.map((obj) => ({
          Key: obj.Key!,
        }));

        const deleteCommand = new DeleteObjectsCommand({
          Bucket: config.aws.s3Bucket,
          Delete: {
            Objects: deleteObjects,
            Quiet: true,
          },
        });

        await client.send(deleteCommand);
        deletedCount += deleteObjects.length;
        logger.info('Deleted files from S3 folder', {
          folder: folderKey,
          count: deleteObjects.length,
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return deletedCount;
  } catch (error) {
    logger.error('Failed to delete S3 folder', { folderPath, error });
    return 0;
  }
};

/**
 * Delete all media files associated with a highlight
 */
const deleteHighlightMedia = async (highlight: any): Promise<number> => {
  let deletedCount = 0;

  // Delete main video
  if (highlight.videoUrl) {
    if (await deleteS3File(highlight.videoUrl)) {
      deletedCount++;
    }
  }

  // Delete thumbnail
  if (highlight.thumbnailUrl) {
    if (await deleteS3File(highlight.thumbnailUrl)) {
      deletedCount++;
    }
  }

  // Delete preview
  if (highlight.previewUrl) {
    if (await deleteS3File(highlight.previewUrl)) {
      deletedCount++;
    }
  }

  // Delete master playlist
  if (highlight.masterM3u8Url) {
    if (await deleteS3File(highlight.masterM3u8Url)) {
      deletedCount++;
    }
  }

  // Delete HLS quality playlists and segments
  // Note: We delete the entire quality folder which includes the playlist
  if (highlight.hlsUrls) {
    const qualities = ['240p', '360p', '480p', '720p', '1080p'];
    for (const quality of qualities) {
      const playlistUrl = highlight.hlsUrls[quality];
      if (playlistUrl) {
        // Extract folder path from playlist URL (e.g., highlights/{id}/240p/segments/)
        // The folder deletion will include the playlist file
        const key = extractS3Key(playlistUrl);
        if (key) {
          const lastSlash = key.lastIndexOf('/');
          const folderKey = lastSlash > 0 ? key.substring(0, lastSlash + 1) : key + '/';
          const folderDeletedCount = await deleteS3Folder(folderKey);
          deletedCount += folderDeletedCount;
        }
      }
    }
  }

  // Delete entire highlight folder (this will catch any remaining files like master.m3u8, thumbnail, preview, video)
  // Path must match upload/processing: highlights/playasport-{highlightId}/
  if (highlight.id) {
    const highlightFolder = `highlights/playasport-${highlight.id}/`;
    const folderDeletedCount = await deleteS3Folder(highlightFolder);
    deletedCount += folderDeletedCount;
  }

  return deletedCount;
};

/**
 * Delete all media files associated with a reel
 */
const deleteReelMedia = async (reel: any): Promise<number> => {
  let deletedCount = 0;

  // Delete main video
  if (reel.originalPath) {
    if (await deleteS3File(reel.originalPath)) {
      deletedCount++;
    }
  }

  // Delete thumbnail
  if (reel.thumbnailPath) {
    if (await deleteS3File(reel.thumbnailPath)) {
      deletedCount++;
    }
  }

  // Delete preview
  if (reel.previewUrl) {
    if (await deleteS3File(reel.previewUrl)) {
      deletedCount++;
    }
  }

  // Delete master playlist
  if (reel.masterM3u8Url) {
    if (await deleteS3File(reel.masterM3u8Url)) {
      deletedCount++;
    }
  }

  // Delete HLS quality playlists and segments
  // Note: We delete the entire quality folder which includes the playlist
  if (reel.hlsUrls) {
    const qualities = ['240p', '360p', '480p', '720p', '1080p'];
    for (const quality of qualities) {
      const playlistUrl = reel.hlsUrls[quality];
      if (playlistUrl) {
        // Extract folder path from playlist URL (e.g., reels/{id}/240p/segments/)
        // The folder deletion will include the playlist file
        const key = extractS3Key(playlistUrl);
        if (key) {
          const lastSlash = key.lastIndexOf('/');
          const folderKey = lastSlash > 0 ? key.substring(0, lastSlash + 1) : key + '/';
          const folderDeletedCount = await deleteS3Folder(folderKey);
          deletedCount += folderDeletedCount;
        }
      }
    }
  }

  // Delete entire reel folder (this will catch any remaining files like master.m3u8, thumbnail, preview, video)
  // Path must match upload/processing: reels/playasport-{reelId}/
  if (reel.id) {
    const reelFolder = `reels/playasport-${reel.id}/`;
    const folderDeletedCount = await deleteS3Folder(reelFolder);
    deletedCount += folderDeletedCount;
  }

  return deletedCount;
};

/**
 * Delete all media files associated with a coaching center
 */
const deleteCoachingCenterMedia = async (coachingCenter: any): Promise<number> => {
  let deletedCount = 0;

  // Delete logo
  if (coachingCenter.logo) {
    if (await deleteS3File(coachingCenter.logo)) {
      deletedCount++;
    }
  }

  // Delete documents
  if (coachingCenter.documents && Array.isArray(coachingCenter.documents)) {
    for (const doc of coachingCenter.documents) {
      if (doc.url) {
        if (await deleteS3File(doc.url)) {
          deletedCount++;
        }
      }
    }
  }

  // Delete sport_details images and videos
  if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
    for (const sportDetail of coachingCenter.sport_details) {
      // Delete sport images
      if (sportDetail.images && Array.isArray(sportDetail.images)) {
        for (const image of sportDetail.images) {
          if (image.url) {
            if (await deleteS3File(image.url)) {
              deletedCount++;
            }
          }
        }
      }

      // Delete sport videos and their thumbnails
      if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
        for (const video of sportDetail.videos) {
          // Delete video
          if (video.url) {
            if (await deleteS3File(video.url)) {
              deletedCount++;
            }
          }

          // Delete video thumbnail
          if (video.thumbnail) {
            if (await deleteS3File(video.thumbnail)) {
              deletedCount++;
            }
          }
        }
      }
    }
  }

  return deletedCount;
};

/**
 * Execute permanent deletion job
 * This function can be called directly for testing
 */
export const executePermanentDeleteJob = async (): Promise<void> => {
  try {
    logger.info('Starting permanent deletion job - deleting records soft deleted for 1+ year');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let totalHighlightsDeleted = 0;
    let totalReelsDeleted = 0;
    let totalCoachingCentersDeleted = 0;
    let totalMediaFilesDeleted = 0;
    let totalErrors = 0;

      // Process Highlights
      try {
        const highlights = await StreamHighlightModel.find({
          deletedAt: { $ne: null, $lte: oneYearAgo },
        }).lean();

        logger.info('Found highlights to permanently delete', { count: highlights.length });

        for (const highlight of highlights) {
          try {
            // Delete all media files
            const mediaDeleted = await deleteHighlightMedia(highlight);
            totalMediaFilesDeleted += mediaDeleted;

            // Permanently delete from database
            await StreamHighlightModel.deleteOne({ _id: highlight._id });

            totalHighlightsDeleted++;
            logger.info('Permanently deleted highlight', {
              highlightId: highlight.id,
              mediaFilesDeleted: mediaDeleted,
            });
          } catch (error) {
            logger.error('Failed to permanently delete highlight', {
              highlightId: highlight.id,
              error,
            });
            totalErrors++;
          }
        }
      } catch (error) {
        logger.error('Failed to process highlights for permanent deletion', { error });
        totalErrors++;
      }

      // Process Reels
      try {
        const reels = await ReelModel.find({
          deletedAt: { $ne: null, $lte: oneYearAgo },
        }).lean();

        logger.info('Found reels to permanently delete', { count: reels.length });

        for (const reel of reels) {
          try {
            // Delete all media files
            const mediaDeleted = await deleteReelMedia(reel);
            totalMediaFilesDeleted += mediaDeleted;

            // Permanently delete from database
            await ReelModel.deleteOne({ _id: reel._id });

            totalReelsDeleted++;
            logger.info('Permanently deleted reel', {
              reelId: reel.id,
              mediaFilesDeleted: mediaDeleted,
            });
          } catch (error) {
            logger.error('Failed to permanently delete reel', {
              reelId: reel.id,
              error,
            });
            totalErrors++;
          }
        }
      } catch (error) {
        logger.error('Failed to process reels for permanent deletion', { error });
        totalErrors++;
      }

      // Process Coaching Centers
      try {
        const coachingCenters = await CoachingCenterModel.find({
          deletedAt: { $ne: null, $lte: oneYearAgo },
        }).lean();

        logger.info('Found coaching centers to permanently delete', { count: coachingCenters.length });

        for (const coachingCenter of coachingCenters) {
          try {
            // Delete all media files
            const mediaDeleted = await deleteCoachingCenterMedia(coachingCenter);
            totalMediaFilesDeleted += mediaDeleted;

            // Permanently delete from database
            await CoachingCenterModel.deleteOne({ _id: coachingCenter._id });

            totalCoachingCentersDeleted++;
            logger.info('Permanently deleted coaching center', {
              coachingCenterId: coachingCenter.id || coachingCenter._id.toString(),
              mediaFilesDeleted: mediaDeleted,
            });
          } catch (error) {
            logger.error('Failed to permanently delete coaching center', {
              coachingCenterId: coachingCenter.id || coachingCenter._id.toString(),
              error,
            });
            totalErrors++;
          }
        }
      } catch (error) {
        logger.error('Failed to process coaching centers for permanent deletion', { error });
        totalErrors++;
      }

    logger.info('Permanent deletion job completed', {
      highlightsDeleted: totalHighlightsDeleted,
      reelsDeleted: totalReelsDeleted,
      coachingCentersDeleted: totalCoachingCentersDeleted,
      totalMediaFilesDeleted,
      totalErrors,
    });
  } catch (error) {
    logger.error('Permanent deletion job failed', { error });
    throw error;
  }
};

/**
 * Permanent deletion job for soft-deleted records
 * Deletes records that have been soft deleted for more than 1 year
 * Also deletes all associated media files from S3
 * Runs monthly on the 1st at 3 AM
 */
export const startPermanentDeleteJob = (): void => {
  // Run monthly on the 1st at 3 AM
  cron.schedule('0 3 1 * *', async () => {
    await executePermanentDeleteJob();
  });

  logger.info('Permanent deletion cron job scheduled - runs monthly on the 1st at 3 AM');
};

