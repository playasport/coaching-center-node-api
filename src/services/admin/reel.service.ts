import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  ReelModel,
  Reel,
  ReelStatus,
} from '../../models/reel.model';
import { VideoProcessingStatus } from '../../models/streamHighlight.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { enqueueVideoProcessing } from '../../queue/videoProcessingQueue';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../common/s3.service';
import { config } from '../../config/env';
import ffmpeg from 'fluent-ffmpeg';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

export interface GetAdminReelsParams {
  page?: number;
  limit?: number;
  status?: ReelStatus;
  videoProcessingStatus?: VideoProcessingStatus;
  userId?: string;
  sportId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminReelListItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailPath: string | null;
  originalPath: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  status: string;
    videoProcessingStatus: string;
  userId: Types.ObjectId;
  sportIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaginatedReelsResult {
  reels: AdminReelListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface CreateReelInput {
  title: string;
  description?: string | null;
  originalPath: string;
  thumbnailPath?: string | null;
  userId: string;
  sportIds?: string[];
}

export interface UpdateReelInput {
  title?: string;
  description?: string | null;
  originalPath?: string;
  thumbnailPath?: string | null;
  userId?: string;
  status?: ReelStatus;
  sportIds?: string[];
}

/**
 * Get all reels for admin with filters and pagination
 */
export const getAllReels = async (
  params: GetAdminReelsParams = {}
): Promise<AdminPaginatedReelsResult> => {
  try {
    const query: any = { deletedAt: null };

    // Filter by status if provided
    if (params.status) {
      query.status = params.status;
    }

    // Filter by videoProcessingStatus if provided
    if (params.videoProcessingStatus) {
      query.videoProcessingStatus = params.videoProcessingStatus;
    }

    // Filter by user if provided
    if (params.userId) {
      if (!Types.ObjectId.isValid(params.userId)) {
        throw new ApiError(400, 'Invalid user ID');
      }
      query.userId = new Types.ObjectId(params.userId);
    }

    // Filter by sport if provided
    if (params.sportId) {
      query.sportIds = params.sportId;
    }

    // Search by title or description
    if (params.search) {
      query.$or = [
        { title: { $regex: params.search, $options: 'i' } },
        { description: { $regex: params.search, $options: 'i' } },
      ];
    }

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    // Sort
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    // Execute query
    const [reels, total] = await Promise.all([
      ReelModel.find(query)
        .populate('userId', 'id firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ReelModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      reels: reels as any,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      },
    };
  } catch (error) {
    logger.error('Failed to get reels', { params, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to get reels');
  }
};

/**
 * Get reel by ID for admin
 */
export const getReelById = async (id: string): Promise<Reel | null> => {
  try {
    const reel = await ReelModel.findOne({ id, deletedAt: null })
      .populate('userId', 'id firstName lastName email')
      .lean();

    return reel as any;
  } catch (error) {
    logger.error('Failed to get reel by ID', { id, error });
    throw new ApiError(500, 'Failed to get reel');
  }
};

/**
 * Create reel by admin
 */
export const createReel = async (
  data: CreateReelInput,
  adminId: string
): Promise<Reel> => {
  try {
    // Validate user ID
    if (!Types.ObjectId.isValid(data.userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    // Note: Video duration validation is now done during upload (when we have the file buffer)
    // This is faster than downloading from S3. If validation wasn't done during upload,
    // we can optionally validate here, but it's recommended to validate during upload.
    // For now, we skip validation here to avoid downloading from S3 unnecessarily.
    // If you need to validate here as well, uncomment the line below:
    // await validateVideoDuration(data.originalPath, 90);

    // Generate reel ID first (we need it for the permanent path)
    const reelId = uuidv4();

    // Move video from temp folder to permanent location BEFORE creating the reel
    // This ensures the reel is created with the correct permanent URL from the start
    let finalVideoUrl = data.originalPath;
    // Check for temp folder: either '/temp/' in URL or '.amazonaws.com/temp/' (S3 key starts with 'temp/')
    const isTempUrl = data.originalPath && (data.originalPath.includes('/temp/') || data.originalPath.includes('.amazonaws.com/temp/'));
    if (isTempUrl) {
      try {
        finalVideoUrl = await moveVideoToPermanentLocation(data.originalPath, reelId);
        logger.info('Video moved from temp to permanent location before reel creation', {
          originalUrl: data.originalPath,
          newUrl: finalVideoUrl,
          reelId,
        });
      } catch (error) {
        logger.error('Failed to move video from temp folder', {
          videoUrl: data.originalPath,
          reelId,
          error: error instanceof Error ? error.message : error,
        });
        // If move fails, throw error - don't create reel with temp URL
        throw new ApiError(500, 'Failed to move video to permanent location. Please try again.');
      }
    }

    // Move thumbnail from temp folder to permanent location if provided
    let finalThumbnailPath = data.thumbnailPath || null;
    if (finalThumbnailPath) {
      const isTempThumbnailUrl = finalThumbnailPath.includes('/temp/') || finalThumbnailPath.includes('.amazonaws.com/temp/');
      if (isTempThumbnailUrl) {
        try {
          finalThumbnailPath = await moveThumbnailToPermanentLocation(finalThumbnailPath, reelId);
          logger.info('Thumbnail moved from temp to permanent location before reel creation', {
            originalUrl: data.thumbnailPath,
            newUrl: finalThumbnailPath,
            reelId,
          });
        } catch (error) {
          logger.error('Failed to move thumbnail from temp folder', {
            thumbnailPath: data.thumbnailPath,
            reelId,
            error: error instanceof Error ? error.message : error,
          });
          // If move fails, throw error - don't create reel with temp URL
          throw new ApiError(500, 'Failed to move thumbnail to permanent location. Please try again.');
        }
      }
    }

    // Create reel with permanent video URL from the start
    const reelData: any = {
      id: reelId, // Set the ID explicitly
      userId: new Types.ObjectId(data.userId),
      title: data.title,
      description: data.description || null,
      originalPath: finalVideoUrl, // Use permanent URL
      thumbnailPath: finalThumbnailPath, // Use permanent URL if moved
      sportIds: data.sportIds || [],
      status: ReelStatus.PENDING, // Default status
      videoProcessingStatus: VideoProcessingStatus.NOT_STARTED, // Video processing not started yet
    };

    // Create reel with permanent URL already set
    const reel = new ReelModel(reelData);
    await reel.save();

    logger.info('Reel created', {
      reelId: reel.id,
      adminId,
      userId: data.userId,
      videoUrl: finalVideoUrl,
    });

    // Enqueue video processing (non-blocking, fire-and-forget)
    // Use the final URL (permanent location if moved from temp)
    enqueueVideoProcessing({
      reelId: reel.id,
      videoUrl: finalVideoUrl, // This is now the permanent URL
      folderPath: `reels/${reel.id}`,
      type: 'reel',
      timestamp: Date.now(),
    })
      .then(() => {
        // Update status to processing when job is successfully enqueued
        return ReelModel.findOneAndUpdate(
          { id: reel.id },
          { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
          { new: true }
        );
      })
      .catch((error) => {
        // Log error but don't block - video processing will be retried by queue system
        logger.error('Failed to enqueue video processing (non-critical)', {
          reelId: reel.id,
          error: error instanceof Error ? error.message : error,
        });
      });

    // Return the reel - it already has the permanent videoUrl
    logger.info('Reel created with permanent videoUrl', {
      reelId: reel.id,
      videoUrl: reel.originalPath,
    });
    return reel.toObject();
  } catch (error) {
    logger.error('Failed to create reel', {
      data,
      adminId,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    // Include the actual error message in the response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(500, `Failed to create reel: ${errorMessage}`);
  }
};

/**
 * Update reel by admin
 */
export const updateReel = async (
  id: string,
  data: UpdateReelInput,
  adminId: string
): Promise<Reel | null> => {
  try {
    const reel = await ReelModel.findOne({ id, deletedAt: null });

    if (!reel) {
      return null;
    }

    // Update fields
    if (data.title !== undefined) {
      reel.title = data.title;
    }
    if (data.description !== undefined) {
      reel.description = data.description;
    }
    if (data.status !== undefined) {
      reel.status = data.status;
    }
    if (data.sportIds !== undefined) {
      reel.sportIds = data.sportIds;
    }
    if (data.thumbnailPath !== undefined) {
      const oldThumbnailPath = reel.thumbnailPath;
      
      // Move thumbnail from temp to permanent location if it's in temp folder
      let finalThumbnailPath = data.thumbnailPath;
      const isTempUrl = data.thumbnailPath !== null && (data.thumbnailPath.includes('/temp/') || data.thumbnailPath.includes('.amazonaws.com/temp/'));
      if (isTempUrl && data.thumbnailPath !== null) {
        try {
          finalThumbnailPath = await moveThumbnailToPermanentLocation(data.thumbnailPath, reel.id);
          logger.info('Thumbnail moved from temp to permanent location during update', {
            originalUrl: data.thumbnailPath,
            newUrl: finalThumbnailPath,
            reelId: reel.id,
          });
        } catch (error) {
          logger.error('Failed to move thumbnail from temp folder during update', {
            thumbnailPath: data.thumbnailPath,
            reelId: reel.id,
            error: error instanceof Error ? error.message : error,
          });
          // Continue with temp URL if move fails
          finalThumbnailPath = data.thumbnailPath;
        }
      }
      
      // Delete old thumbnail file if URL changed and old URL exists
      if (oldThumbnailPath && oldThumbnailPath !== finalThumbnailPath) {
        await deleteS3File(oldThumbnailPath);
      }
      
      reel.thumbnailPath = finalThumbnailPath;
    }

    if (data.originalPath !== undefined) {
      // Validate video duration (max 90 seconds for reels)
      await validateVideoDuration(data.originalPath, 90);

      const oldVideoUrl = reel.originalPath;
      
      // Move video from temp to permanent location if it's in temp folder
      let finalVideoUrl = data.originalPath;
      // Check for temp folder: either '/temp/' in URL or '.amazonaws.com/temp/' (S3 key starts with 'temp/')
      const isTempUrl = data.originalPath && (data.originalPath.includes('/temp/') || data.originalPath.includes('.amazonaws.com/temp/'));
      if (isTempUrl) {
        try {
          finalVideoUrl = await moveVideoToPermanentLocation(data.originalPath, reel.id);
          logger.info('Video moved from temp to permanent location during update', {
            originalUrl: data.originalPath,
            newUrl: finalVideoUrl,
            reelId: reel.id,
          });
        } catch (error) {
          logger.error('Failed to move video from temp folder during update', {
            videoUrl: data.originalPath,
            reelId: reel.id,
            error: error instanceof Error ? error.message : error,
          });
          // Continue with temp URL if move fails
          finalVideoUrl = data.originalPath;
        }
      }

      // Delete old video file if URL changed and old URL exists
      if (oldVideoUrl && oldVideoUrl !== finalVideoUrl) {
        await deleteS3File(oldVideoUrl);
      }

      reel.originalPath = finalVideoUrl;

      // If video URL changed, re-process video (non-blocking)
      if (oldVideoUrl !== finalVideoUrl) {
        reel.videoProcessingStatus = VideoProcessingStatus.NOT_STARTED;
        enqueueVideoProcessing({
          reelId: reel.id,
          videoUrl: finalVideoUrl, // Use permanent URL
          folderPath: `reels/${reel.id}`,
          type: 'reel',
          timestamp: Date.now(),
        })
          .then(() => {
            // Update status to processing when job is successfully enqueued
            return ReelModel.findOneAndUpdate(
              { id: reel.id },
              { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
              { new: true }
            );
          })
          .catch((error) => {
            // Log error but don't block
            logger.error('Failed to enqueue video reprocessing (non-critical)', {
              reelId: reel.id,
              error: error instanceof Error ? error.message : error,
            });
          });
      }
    }
    if (data.userId !== undefined) {
      // Validate user ID
      if (!Types.ObjectId.isValid(data.userId)) {
        throw new ApiError(400, 'Invalid user ID');
      }
      reel.userId = new Types.ObjectId(data.userId);
    }

    await reel.save();

    logger.info('Reel updated', { reelId: id, adminId });

    return reel.toObject();
  } catch (error) {
    logger.error('Failed to update reel', { id, data, adminId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to update reel');
  }
};

/**
 * Delete reel (soft delete)
 */
export const deleteReel = async (id: string, adminId: string): Promise<boolean> => {
  try {
    const reel = await ReelModel.findOne({ id, deletedAt: null });

    if (!reel) {
      return false;
    }

    reel.deletedAt = new Date();
    await reel.save();

    logger.info('Reel deleted', { reelId: id, adminId });

    return true;
  } catch (error) {
    logger.error('Failed to delete reel', { id, adminId, error });
    throw new ApiError(500, 'Failed to delete reel');
  }
};

/**
 * Update reel status
 */
export const updateReelStatus = async (
  id: string,
  status: ReelStatus,
  adminId: string
): Promise<Reel | null> => {
  try {
    const reel = await ReelModel.findOne({ id, deletedAt: null });

    if (!reel) {
      return null;
    }

    reel.status = status;
    await reel.save();

    logger.info('Reel status updated', { reelId: id, status, adminId });

    return reel.toObject();
  } catch (error) {
    logger.error('Failed to update reel status', { id, status, adminId, error });
    throw new ApiError(500, 'Failed to update reel status');
  }
};

/**
 * Reprocess video for a reel
 * This will process the video again regardless of current processing status
 */
export const reprocessReelVideo = async (
  id: string,
  adminId: string
): Promise<{ message: string; reel: Reel }> => {
  try {
    // Find the reel
    const reel = await ReelModel.findOne({ id, deletedAt: null });

    if (!reel) {
      throw new ApiError(404, 'Reel not found');
    }

    // Check if originalPath exists
    if (!reel.originalPath) {
      throw new ApiError(400, 'Reel does not have a video URL to process.');
    }

    logger.info('Attempting to re-enqueue video processing for reel', {
      reelId: id,
      adminId,
      currentVideoUrl: reel.originalPath,
      currentVideoProcessingStatus: reel.videoProcessingStatus,
    });

    // Move video from temp to permanent location if needed before reprocessing
    let finalVideoUrl = reel.originalPath;
    // Check for temp folder: either '/temp/' in URL or '.amazonaws.com/temp/' (S3 key starts with 'temp/')
    const isTempUrl = reel.originalPath && (reel.originalPath.includes('/temp/') || reel.originalPath.includes('.amazonaws.com/temp/'));
    if (isTempUrl) {
      try {
        finalVideoUrl = await moveVideoToPermanentLocation(reel.originalPath, reel.id);
        // Update the reel with the permanent URL
        await ReelModel.findOneAndUpdate(
          { id: reel.id },
          { originalPath: finalVideoUrl },
          { new: true }
        );
        logger.info('Video moved from temp to permanent location during reprocess', {
          originalUrl: reel.originalPath,
          newUrl: finalVideoUrl,
          reelId: reel.id,
        });
      } catch (error) {
        logger.error('Failed to move video from temp folder during reprocess', {
          videoUrl: reel.originalPath,
          reelId: reel.id,
          error: error instanceof Error ? error.message : error,
        });
        // Continue with temp URL if move fails
        finalVideoUrl = reel.originalPath;
      }
    }

    // Enqueue video processing (non-blocking, fire-and-forget)
    // This will process the video again even if it was already processed
    enqueueVideoProcessing({
      reelId: reel.id,
      videoUrl: finalVideoUrl, // Use permanent URL
      folderPath: `reels/${reel.id}`,
      type: 'reel',
      timestamp: Date.now(),
    })
      .then(() => {
        // Update status to processing when job is successfully enqueued
        return ReelModel.findOneAndUpdate(
          { id: reel.id },
          { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
          { new: true }
        );
      })
      .catch((error) => {
        // Log error but don't block - video processing will be retried by queue system
        logger.error('Failed to enqueue video reprocessing (non-critical)', {
          reelId: reel.id,
          error: error instanceof Error ? error.message : error,
        });
      });

    // Update videoProcessingStatus to PROCESSING immediately
    const updatedReel = await ReelModel.findOneAndUpdate(
      { id: reel.id },
      { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
      { new: true }
    );

    if (!updatedReel) {
      throw new ApiError(500, 'Failed to update reel status');
    }

    logger.info('Video reprocessing job enqueued', {
      reelId: id,
      adminId,
    });

    return {
      message: 'Video processing job has been queued. The video will be reprocessed in the background.',
      reel: updatedReel.toObject(),
    };
  } catch (error) {
    logger.error('Failed to reprocess reel video', { id, adminId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to reprocess reel video');
  }
};

/**
 * Update preview video URL for a reel
 */
export const updateReelPreview = async (
  id: string,
  previewUrl: string,
  adminId: string
): Promise<Reel | null> => {
  try {
    const reel = await ReelModel.findOne({ id, deletedAt: null });

    if (!reel) {
      return null;
    }

    reel.previewUrl = previewUrl;
    await reel.save();

    logger.info('Reel preview video updated', {
      reelId: id,
      previewUrl,
      adminId,
    });

    return reel.toObject();
  } catch (error) {
    logger.error('Failed to update reel preview video', { id, previewUrl, adminId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to update reel preview video');
  }
};

/**
 * Extract S3 key from S3 URL
 */
function extractS3KeyFromUrl(url: string): string {
  try {
    // Remove query parameters and fragments
    const urlWithoutQuery = url.split('?')[0].split('#')[0];
    
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
          logger.warn('Failed to decode S3 key', { key });
        }
        
        // Remove bucket name if it's in the path (for path-style URLs)
        const bucketMatch = urlWithoutQuery.match(/https?:\/\/([^.]+)\.s3[.-]/);
        if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
          key = key.substring(bucketMatch[1].length + 1);
        }
        
        return key;
      }
    }
    
    throw new Error(`Invalid S3 file URL format: ${url}`);
  } catch (error) {
    logger.error('Failed to extract S3 key from URL', { url, error });
    throw new ApiError(400, `Invalid S3 file URL: ${url}`);
  }
}

/**
 * Delete file from S3
 */
async function deleteS3File(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl) {
      return;
    }

    // Skip if it's a temp URL (will be cleaned up by media cleanup job)
    const s3Key = extractS3KeyFromUrl(fileUrl);
    if (s3Key.startsWith('temp/') || s3Key.includes('/temp/')) {
      logger.info('Skipping deletion of temp file (will be cleaned up by media cleanup)', { fileUrl, s3Key });
      return;
    }

    if (!config.aws.s3Bucket) {
      throw new ApiError(500, 'S3 bucket name not configured');
    }

    const client = getS3Client();
    if (!client) {
      throw new ApiError(500, 'S3 client not configured');
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: s3Key,
    });

    await client.send(deleteCommand);
    logger.info('File deleted from S3', { fileUrl, s3Key });
  } catch (error) {
    // Log error but don't throw - file deletion is not critical
    logger.error('Failed to delete file from S3', {
      fileUrl,
      error: error instanceof Error ? error.message : error,
    });
  }
}

/**
 * Move thumbnail file from temp folder to permanent location
 * Format: reels/{reelId}/thumbnail.{ext}
 */
async function moveThumbnailToPermanentLocation(
  tempThumbnailUrl: string,
  reelId: string
): Promise<string> {
  try {
    if (!tempThumbnailUrl) {
      return tempThumbnailUrl;
    }

    if (!config.aws.s3Bucket) {
      throw new ApiError(500, 'S3 bucket name not configured');
    }

    const client = getS3Client();
    if (!client) {
      throw new ApiError(500, 'S3 client not configured');
    }

    const tempKey = extractS3KeyFromUrl(tempThumbnailUrl);
    
    // Check if file is in temp folder
    const isTempPath = tempKey.startsWith('temp/') || tempKey.includes('/temp/');
    if (!isTempPath) {
      // Already in permanent location, return as is
      logger.info('Thumbnail already in permanent location', { tempThumbnailUrl, tempKey });
      return tempThumbnailUrl;
    }
    
    logger.info('Detected temp thumbnail path, will move to permanent location', { tempKey, reelId });

    // Get file extension from temp key
    const fileExtension = tempKey.split('.').pop() || 'jpg';
    
    // Create permanent key: reels/{reelId}/thumbnail.{ext}
    const permanentKey = `reels/${reelId}/thumbnail.${fileExtension}`;

    logger.info('Moving thumbnail from temp to permanent location', {
      tempKey,
      permanentKey,
      bucket: config.aws.s3Bucket,
    });

    // Copy file to permanent location
    const copyCommand = new CopyObjectCommand({
      Bucket: config.aws.s3Bucket,
      CopySource: `${config.aws.s3Bucket}/${tempKey}`,
      Key: permanentKey,
    });

    await client.send(copyCommand);
    logger.info('Thumbnail copied to permanent location', { tempKey, permanentKey });

    // Delete temp file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: tempKey,
    });

    await client.send(deleteCommand);
    logger.info('Temp thumbnail file deleted', { tempKey });

    // Construct permanent URL
    const permanentUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${permanentKey}`;

    logger.info('Thumbnail successfully moved from temp to permanent location', {
      tempKey,
      permanentKey,
      tempUrl: tempThumbnailUrl,
      permanentUrl,
    });

    return permanentUrl;
  } catch (error) {
    logger.error('Failed to move thumbnail to permanent location', {
      tempThumbnailUrl,
      reelId,
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to move thumbnail to permanent location');
  }
}

/**
 * Move video file from temp folder to permanent location
 * Format: reels/{reelId}/{reelId}.mp4
 */
async function moveVideoToPermanentLocation(
  tempVideoUrl: string,
  reelId: string
): Promise<string> {
  try {
    if (!config.aws.s3Bucket) {
      throw new ApiError(500, 'S3 bucket name not configured');
    }

    const client = getS3Client();
    if (!client) {
      throw new ApiError(500, 'S3 client not configured');
    }

    // Extract S3 key from URL
    const tempKey = extractS3KeyFromUrl(tempVideoUrl);

    // Check if file is in temp folder
    // Check for both 'temp/' (at start) and '/temp/' (anywhere in path)
    const isTempPath = tempKey.startsWith('temp/') || tempKey.includes('/temp/');
    if (!isTempPath) {
      // Already in permanent location, return as is
      logger.info('Video already in permanent location', { tempVideoUrl, tempKey });
      return tempVideoUrl;
    }

    logger.info('Detected temp video path, will move to permanent location', { tempKey, reelId });

    // Get file extension from temp key
    const fileExtension = tempKey.split('.').pop() || 'mp4';

    // Create permanent key: reels/{reelId}/{reelId}.mp4
    const permanentKey = `reels/${reelId}/${reelId}.${fileExtension}`;

    logger.info('Moving video from temp to permanent location', {
      tempKey,
      permanentKey,
      bucket: config.aws.s3Bucket,
    });

    // Copy file to permanent location
    const copyCommand = new CopyObjectCommand({
      Bucket: config.aws.s3Bucket,
      CopySource: `${config.aws.s3Bucket}/${tempKey}`,
      Key: permanentKey,
    });

    await client.send(copyCommand);
    logger.info('Video copied to permanent location', { tempKey, permanentKey });

    // Delete temp file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: tempKey,
    });

    await client.send(deleteCommand);
    logger.info('Temp video file deleted', { tempKey });

    // Construct permanent URL
    const permanentUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${permanentKey}`;

    logger.info('Video successfully moved from temp to permanent location', {
      tempKey,
      permanentKey,
      tempUrl: tempVideoUrl,
      permanentUrl,
    });

    return permanentUrl;
  } catch (error) {
    logger.error('Failed to move video to permanent location', {
      tempVideoUrl,
      reelId,
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to move video to permanent location');
  }
}

/**
 * Validate video duration
 * Downloads video temporarily and checks duration using ffprobe
 */
async function validateVideoDuration(videoUrl: string, maxDurationSeconds: number): Promise<void> {
  try {
    logger.info('Validating video duration', { videoUrl, maxDurationSeconds });

    // Extract file extension safely
    let fileExtension = 'mp4'; // Default extension
    try {
      const urlObj = new URL(videoUrl);
      const ext = path.extname(urlObj.pathname);
      if (ext) {
        fileExtension = ext;
      }
    } catch (urlError) {
      // If URL parsing fails, try to extract extension from the string directly
      const extMatch = videoUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (extMatch && extMatch[1]) {
        fileExtension = `.${extMatch[1]}`;
      }
      logger.warn('Failed to parse URL, using fallback extension extraction', { videoUrl, fileExtension });
    }

    // Create temporary directory
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const tempVideoPath = path.join(tmpDir.name, `temp_video_${Date.now()}${fileExtension}`);

    try {
      // Download video from S3
      if (videoUrl.includes('.amazonaws.com/')) {
        // S3 URL - use S3 client
        const client = getS3Client();
        if (!client) {
          throw new ApiError(500, 'S3 client not configured');
        }

        // Extract S3 key using the same logic as other services
        let key: string;
        try {
          // Remove query parameters and fragments
          const urlWithoutQuery = videoUrl.split('?')[0].split('#')[0];
          
          // Try standard format: https://bucket.s3.region.amazonaws.com/key
          if (urlWithoutQuery.includes('.amazonaws.com/')) {
            const urlParts = urlWithoutQuery.split('.amazonaws.com/');
            if (urlParts.length === 2) {
              key = urlParts[1];
              
              // Decode URL encoding
              try {
                key = decodeURIComponent(key);
              } catch (e) {
                // If decoding fails, use original key
                logger.warn('Failed to decode S3 key', { key });
              }
              
              // Remove bucket name if it's in the path (for path-style URLs)
              const bucketMatch = urlWithoutQuery.match(/https?:\/\/([^.]+)\.s3[.-]/);
              if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
                key = key.substring(bucketMatch[1].length + 1);
              }
            } else {
              throw new ApiError(400, `Invalid S3 file URL format: ${videoUrl}`);
            }
          } else {
            throw new ApiError(400, `Invalid S3 file URL format: ${videoUrl}`);
          }
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          logger.error('Failed to extract S3 key from URL', { videoUrl, error });
          throw new ApiError(400, `Invalid S3 file URL: ${videoUrl}`);
        }

        logger.info('Extracted S3 key for video validation', { videoUrl, key });

        const getObjectCommand = new GetObjectCommand({
          Bucket: config.aws.s3Bucket,
          Key: key,
        });

        const response = await client.send(getObjectCommand);
        if (!response.Body) {
          throw new ApiError(500, 'Failed to download video from S3');
        }

        // Convert stream to buffer and write to file
        const chunks: Uint8Array[] = [];
        const stream = response.Body as any;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(tempVideoPath, buffer);
      } else {
        // HTTP URL - use axios
        const response = await axios({
          method: 'get',
          url: videoUrl,
          responseType: 'stream',
          timeout: 30000,
        });

        const writer = fs.createWriteStream(tempVideoPath);
        await new Promise<void>((resolve, reject) => {
          response.data.pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      }

      // Get video duration using ffprobe
      const duration = await new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }

          const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
          if (!videoStream || !videoStream.duration) {
            reject(new Error('Could not determine video duration'));
            return;
          }

          const durationSeconds = typeof videoStream.duration === 'number'
            ? videoStream.duration
            : parseFloat(videoStream.duration) || 0;

          resolve(durationSeconds);
        });
      });

      logger.info('Video duration checked', { videoUrl, duration, maxDurationSeconds });

      // Validate duration
      if (duration > maxDurationSeconds) {
        throw new ApiError(
          400,
          `Video duration (${Math.round(duration)}s) exceeds maximum allowed duration of ${maxDurationSeconds} seconds for reels`
        );
      }

      if (duration <= 0) {
        throw new ApiError(400, 'Invalid video duration. The video file may be corrupted.');
      }
    } finally {
      // Cleanup temp file
      try {
        if (await fs.pathExists(tempVideoPath)) {
          await fs.remove(tempVideoPath);
        }
        tmpDir.removeCallback();
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temp video file', { tempVideoPath, error: cleanupError });
      }
    }
  } catch (error) {
    logger.error('Failed to validate video duration', { videoUrl, maxDurationSeconds, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to validate video duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

