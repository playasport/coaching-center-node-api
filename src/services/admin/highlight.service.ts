import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  StreamHighlightModel,
  StreamHighlight,
  HighlightStatus,
  VideoProcessingStatus,
} from '../../models/streamHighlight.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { enqueueVideoProcessing } from '../../queue/videoProcessingQueue';
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../common/s3.service';
import { config } from '../../config/env';

export interface GetAdminHighlightsParams {
  page?: number;
  limit?: number;
  status?: HighlightStatus;
  videoProcessingStatus?: VideoProcessingStatus;
  coachingCenterId?: string;
  userId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminHighlightListItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  duration: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  status: string;
  userId: Types.ObjectId;
  coachingCenterId: Types.ObjectId | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaginatedHighlightsResult {
  highlights: AdminHighlightListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateHighlightInput {
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  userId: string;
  coachingCenterId?: string | null;
  duration?: number;
  metadata?: Record<string, any> | null;
}

export interface UpdateHighlightInput {
  title?: string;
  description?: string | null;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  userId?: string;
  coachingCenterId?: string | null;
  status?: HighlightStatus;
  duration?: number;
  metadata?: Record<string, any> | null;
}

/**
 * Helper function to find highlight by either UUID id or MongoDB _id
 * Supports both formats for backward compatibility
 * Returns a query builder that can be chained with populate, lean, etc.
 */
const findHighlightByIdQuery = (id: string, additionalQuery: any = {}) => {
  // If it's a valid MongoDB ObjectId (24 hex characters), try both _id and id
  if (Types.ObjectId.isValid(id) && id.length === 24) {
    return StreamHighlightModel.findOne({
      $or: [
        { _id: new Types.ObjectId(id) },
        { id }
      ],
      ...additionalQuery,
    });
  }
  
  // For UUID format, only try id field
  return StreamHighlightModel.findOne({
    id,
    ...additionalQuery,
  });
};

/**
 * Helper function to find highlight by either UUID id or MongoDB _id (awaited version)
 * Use this when you don't need to chain populate/lean
 */
const findHighlightById = async (id: string, additionalQuery: any = {}) => {
  const query = findHighlightByIdQuery(id, additionalQuery);
  return await query;
};

/**
 * Get all highlights for admin with filters and pagination
 */
export const getAllHighlights = async (
  params: GetAdminHighlightsParams = {}
): Promise<AdminPaginatedHighlightsResult> => {
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

    // Filter by coaching center if provided
    if (params.coachingCenterId) {
      query.coachingCenterId = new Types.ObjectId(params.coachingCenterId);
    }

    // Filter by user if provided
    if (params.userId) {
      query.userId = new Types.ObjectId(params.userId);
    }

    // Search by title or description
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await StreamHighlightModel.countDocuments(query);

    // Get highlights with populated references
    const highlights = await StreamHighlightModel.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('coachingCenterId', 'center_name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedHighlights: AdminHighlightListItem[] = highlights.map((highlight: any) => {
      return {
        id: highlight.id,
        title: highlight.title,
        description: highlight.description || null,
        thumbnailUrl: highlight.thumbnailUrl || null,
        videoUrl: highlight.videoUrl,
        duration: highlight.duration,
        viewsCount: highlight.viewsCount || 0,
        likesCount: highlight.likesCount || 0,
        commentsCount: highlight.commentsCount || 0,
        status: highlight.status,
        videoProcessingStatus: highlight.videoProcessingStatus || 'not_started',
        userId: highlight.userId,
        coachingCenterId: highlight.coachingCenterId || null,
        publishedAt: highlight.publishedAt || null,
        createdAt: highlight.createdAt,
        updatedAt: highlight.updatedAt,
      };
    });

    return {
      highlights: transformedHighlights,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Failed to get admin highlights', { params, error });
    throw new ApiError(500, 'Failed to retrieve highlights');
  }
};

/**
 * Get highlight by ID for admin
 */
export const getHighlightById = async (id: string): Promise<StreamHighlight | null> => {
  try {
    const query = findHighlightByIdQuery(id, { deletedAt: null });
    
    const highlight = await query
      .populate({
        path: 'userId',
        select: 'firstName lastName email',
        options: { strictPopulate: false }, // Don't throw error if userId doesn't exist
      })
      .populate({
        path: 'coachingCenterId',
        select: 'center_name',
        options: { strictPopulate: false }, // Don't throw error if coachingCenterId doesn't exist
      })
      .lean();

    return highlight as any;
  } catch (error) {
    logger.error('Failed to get highlight by ID', { 
      id, 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new ApiError(500, `Failed to retrieve highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create new highlight
 */
export const createHighlight = async (
  data: CreateHighlightInput,
  adminId: string
): Promise<StreamHighlight> => {
  try {
    // Validate user ID
    if (!Types.ObjectId.isValid(data.userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    // Validate coaching center ID if provided
    if (data.coachingCenterId && !Types.ObjectId.isValid(data.coachingCenterId)) {
      throw new ApiError(400, 'Invalid coaching center ID');
    }

    // Generate highlight ID first (we need it for the permanent path)
    const highlightId = uuidv4();

    // Move video from temp folder to permanent location BEFORE creating the highlight
    // This ensures the highlight is created with the correct permanent URL from the start
    let finalVideoUrl = data.videoUrl;
    // Check for temp folder: either '/temp/' in URL or 'temp/' at start of S3 key
    const isTempUrl = data.videoUrl && (data.videoUrl.includes('/temp/') || data.videoUrl.includes('.amazonaws.com/temp/'));
    if (isTempUrl) {
      try {
        finalVideoUrl = await moveVideoToPermanentLocation(data.videoUrl, highlightId);
        logger.info('Video moved from temp to permanent location before highlight creation', {
          originalUrl: data.videoUrl,
          newUrl: finalVideoUrl,
          highlightId,
        });
      } catch (error) {
        logger.error('Failed to move video from temp folder', {
          videoUrl: data.videoUrl,
          highlightId,
          error: error instanceof Error ? error.message : error,
        });
        // If move fails, throw error - don't create highlight with temp URL
        throw new ApiError(500, 'Failed to move video to permanent location. Please try again.');
      }
    }

    // Move thumbnail from temp folder to permanent location if provided
    let finalThumbnailUrl = data.thumbnailUrl || null;
    if (finalThumbnailUrl) {
      const isTempThumbnailUrl = finalThumbnailUrl.includes('/temp/') || finalThumbnailUrl.includes('.amazonaws.com/temp/');
      if (isTempThumbnailUrl) {
        try {
          finalThumbnailUrl = await moveThumbnailToPermanentLocation(finalThumbnailUrl, highlightId);
          logger.info('Thumbnail moved from temp to permanent location before highlight creation', {
            originalUrl: data.thumbnailUrl,
            newUrl: finalThumbnailUrl,
            highlightId,
          });
        } catch (error) {
          logger.error('Failed to move thumbnail from temp folder', {
            thumbnailUrl: data.thumbnailUrl,
            highlightId,
            error: error instanceof Error ? error.message : error,
          });
          // If move fails, throw error - don't create highlight with temp URL
          throw new ApiError(500, 'Failed to move thumbnail to permanent location. Please try again.');
        }
      }
    }

    // Create highlight with permanent video URL from the start
    const highlightData: any = {
      id: highlightId, // Set the ID explicitly
      userId: new Types.ObjectId(data.userId),
      title: data.title,
      description: data.description || null,
      videoUrl: finalVideoUrl, // Use permanent URL
      thumbnailUrl: finalThumbnailUrl, // Use permanent URL if moved
      duration: 0, // Will be automatically extracted from video during processing
      status: HighlightStatus.PUBLISHED, // Default status
      videoProcessingStatus: VideoProcessingStatus.NOT_STARTED, // Video processing not started yet
      metadata: data.metadata || null,
    };

    if (data.coachingCenterId) {
      highlightData.coachingCenterId = new Types.ObjectId(data.coachingCenterId);
    }

    // Create highlight with permanent URL already set
    const highlight = new StreamHighlightModel(highlightData);
    await highlight.save();

    logger.info('Highlight created', {
      highlightId: highlight.id,
      adminId,
      userId: data.userId,
      videoUrl: finalVideoUrl,
    });

    // Enqueue video processing (non-blocking, fire-and-forget)
    // Use the final URL (permanent location if moved from temp)
    enqueueVideoProcessing({
      highlightId: highlight.id,
      videoUrl: finalVideoUrl, // This is now the permanent URL
      folderPath: `highlights/${highlight.id}`,
      type: 'highlight',
      timestamp: Date.now(),
    })
      .then(() => {
        // Update status to processing when job is successfully enqueued
        return StreamHighlightModel.findOneAndUpdate(
          { id: highlight.id },
          { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
          { new: true }
        );
      })
      .catch((error) => {
        // Log error but don't block - video processing will be retried by queue system
        logger.error('Failed to enqueue video processing (non-critical)', {
          highlightId: highlight.id,
          error: error instanceof Error ? error.message : error,
        });
      });

    // Return the highlight - it already has the permanent videoUrl set from creation
    logger.info('Highlight created with permanent videoUrl', {
      highlightId: highlight.id,
      videoUrl: highlight.videoUrl,
    });
    return highlight.toObject();
  } catch (error) {
    logger.error('Failed to create highlight', { data, adminId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to create highlight');
  }
};

/**
 * Update highlight by admin
 */
export const updateHighlight = async (
  id: string,
  data: UpdateHighlightInput,
  adminId: string
): Promise<StreamHighlight | null> => {
  try {
    const highlight = await findHighlightById(id, { deletedAt: null });

    if (!highlight) {
      return null;
    }

    // Update fields
    if (data.title !== undefined) {
      highlight.title = data.title;
    }
    if (data.description !== undefined) {
      highlight.description = data.description;
    }
    if (data.videoUrl !== undefined) {
      const oldVideoUrl = highlight.videoUrl;
      
      // Move video from temp to permanent location if it's in temp folder
      let finalVideoUrl = data.videoUrl;
      // Check for both '/temp/' (in URL) and 'temp/' (at start of S3 key)
      const isTempUrl = data.videoUrl && (data.videoUrl.includes('/temp/') || data.videoUrl.includes('.amazonaws.com/temp/'));
      if (isTempUrl) {
        try {
          finalVideoUrl = await moveVideoToPermanentLocation(data.videoUrl, highlight.id);
          logger.info('Video moved from temp to permanent location during update', {
            originalUrl: data.videoUrl,
            newUrl: finalVideoUrl,
            highlightId: highlight.id,
          });
        } catch (error) {
          logger.error('Failed to move video from temp folder during update', {
            videoUrl: data.videoUrl,
            highlightId: highlight.id,
            error: error instanceof Error ? error.message : error,
          });
          // Continue with temp URL if move fails
          finalVideoUrl = data.videoUrl;
        }
      }
      
      // Delete old video file if URL changed and old URL exists
      if (oldVideoUrl && oldVideoUrl !== finalVideoUrl) {
        await deleteS3File(oldVideoUrl);
      }
      
      highlight.videoUrl = finalVideoUrl;
      
      // If video URL changed, re-process video (non-blocking)
      if (oldVideoUrl !== finalVideoUrl) {
        highlight.videoProcessingStatus = VideoProcessingStatus.NOT_STARTED;
        enqueueVideoProcessing({
          highlightId: highlight.id,
          videoUrl: finalVideoUrl, // Use permanent URL
          folderPath: `highlights/${highlight.id}`,
          type: 'highlight',
          timestamp: Date.now(),
        })
          .then(() => {
            // Update status to processing when job is successfully enqueued
            return StreamHighlightModel.findOneAndUpdate(
              { id: highlight.id },
              { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
              { new: true }
            );
          })
          .catch((error) => {
            // Log error but don't block
            logger.error('Failed to enqueue video reprocessing (non-critical)', {
              highlightId: highlight.id,
              error: error instanceof Error ? error.message : error,
            });
          });
      }
    }
    if (data.thumbnailUrl !== undefined) {
      const oldThumbnailUrl = highlight.thumbnailUrl;
      
      // Move thumbnail from temp to permanent location if it's in temp folder
      let finalThumbnailUrl = data.thumbnailUrl;
      const isTempUrl = data.thumbnailUrl !== null && (data.thumbnailUrl.includes('/temp/') || data.thumbnailUrl.includes('.amazonaws.com/temp/'));
      if (isTempUrl && data.thumbnailUrl !== null) {
        logger.info('Detected temp thumbnail URL, attempting to move', {
          thumbnailUrl: data.thumbnailUrl,
          highlightId: highlight.id,
        });
        try {
          finalThumbnailUrl = await moveThumbnailToPermanentLocation(data.thumbnailUrl, highlight.id);
          
          // Verify the move was successful (URL should be different)
          if (finalThumbnailUrl === data.thumbnailUrl) {
            logger.warn('Thumbnail move returned same URL - move may have failed', {
              originalUrl: data.thumbnailUrl,
              finalUrl: finalThumbnailUrl,
              highlightId: highlight.id,
            });
          } else {
            logger.info('Thumbnail moved from temp to permanent location during update', {
              originalUrl: data.thumbnailUrl,
              newUrl: finalThumbnailUrl,
              highlightId: highlight.id,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Failed to move thumbnail from temp folder during update', {
            thumbnailUrl: data.thumbnailUrl,
            highlightId: highlight.id,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          });
          
          // If it's already an ApiError, re-throw it
          if (error instanceof ApiError) {
            throw error;
          }
          
          // Re-throw error instead of silently continuing with temp URL
          throw new ApiError(500, `Failed to move thumbnail to permanent location: ${errorMessage}`);
        }
      }
      
      // Delete old thumbnail file if URL changed and old URL exists
      if (oldThumbnailUrl && oldThumbnailUrl !== finalThumbnailUrl) {
        await deleteS3File(oldThumbnailUrl);
      }
      
      highlight.thumbnailUrl = finalThumbnailUrl;
    }
    if (data.status !== undefined) {
      highlight.status = data.status;
      if (data.status === HighlightStatus.PUBLISHED && !highlight.publishedAt) {
        highlight.publishedAt = new Date();
      }
    }
    if (data.duration !== undefined) {
      highlight.duration = data.duration;
    }
    if (data.metadata !== undefined) {
      highlight.metadata = data.metadata;
    }
    if (data.userId !== undefined) {
      // Validate user ID
      if (!Types.ObjectId.isValid(data.userId)) {
        throw new ApiError(400, 'Invalid user ID');
      }
      highlight.userId = new Types.ObjectId(data.userId);
    }
    if (data.coachingCenterId !== undefined) {
      // Handle empty string as null
      const coachingCenterId = data.coachingCenterId === '' || data.coachingCenterId === null ? null : data.coachingCenterId;
      
      // Validate coaching center ID if provided
      if (coachingCenterId !== null && !Types.ObjectId.isValid(coachingCenterId)) {
        throw new ApiError(400, 'Invalid coaching center ID');
      }
      highlight.coachingCenterId = coachingCenterId ? new Types.ObjectId(coachingCenterId) : null;
    }

    await highlight.save();

    logger.info('Highlight updated', { highlightId: id, adminId });

    return highlight.toObject();
  } catch (error) {
    logger.error('Failed to update highlight', { 
      id, 
      data, 
      adminId, 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to update highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update preview video URL for a highlight
 */
export const updateHighlightPreview = async (
  id: string,
  previewUrl: string,
  adminId: string
): Promise<StreamHighlight | null> => {
  try {
    const highlight = await findHighlightById(id, { deletedAt: null });

    if (!highlight) {
      return null;
    }

    highlight.previewUrl = previewUrl;
    await highlight.save();

    logger.info('Highlight preview video updated', {
      highlightId: id,
      previewUrl,
      adminId,
    });

    return highlight.toObject();
  } catch (error) {
    logger.error('Failed to update highlight preview video', { id, previewUrl, adminId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to update highlight preview video');
  }
};

/**
 * Delete highlight (soft delete)
 */
export const deleteHighlight = async (id: string, adminId: string): Promise<boolean> => {
  try {
    const highlight = await findHighlightById(id, { deletedAt: null });

    if (!highlight) {
      return false;
    }

    highlight.deletedAt = new Date();
    await highlight.save();

    logger.info('Highlight deleted', { highlightId: id, adminId });

    return true;
  } catch (error) {
    logger.error('Failed to delete highlight', { id, adminId, error });
    throw new ApiError(500, 'Failed to delete highlight');
  }
};

/**
 * Reprocess video for a highlight
 * This will process the video again regardless of current processing status
 */
export const reprocessHighlightVideo = async (
  id: string,
  adminId: string
): Promise<{ message: string; highlight: StreamHighlight }> => {
  try {
    // Find the highlight
    const highlight = await findHighlightById(id, { deletedAt: null });

    if (!highlight) {
      throw new ApiError(404, 'Highlight not found');
    }

    // Check if videoUrl exists
    if (!highlight.videoUrl) {
      throw new ApiError(400, 'Highlight does not have a video URL to process');
    }

    logger.info('Reprocessing video for highlight', {
      highlightId: id,
      adminId,
      currentStatus: highlight.videoProcessingStatus,
      videoUrl: highlight.videoUrl,
    });

    // Move video from temp to permanent location if needed before reprocessing
    let finalVideoUrl = highlight.videoUrl;
    // Check for temp folder: either '/temp/' in URL or '.amazonaws.com/temp/' (S3 key starts with 'temp/')
    const isTempUrl = highlight.videoUrl && (highlight.videoUrl.includes('/temp/') || highlight.videoUrl.includes('.amazonaws.com/temp/'));
    if (isTempUrl) {
      try {
        finalVideoUrl = await moveVideoToPermanentLocation(highlight.videoUrl, highlight.id);
        // Update the highlight with the permanent URL
        await StreamHighlightModel.findOneAndUpdate(
          { id: highlight.id },
          { videoUrl: finalVideoUrl },
          { new: true }
        );
        logger.info('Video moved from temp to permanent location during reprocess', {
          originalUrl: highlight.videoUrl,
          newUrl: finalVideoUrl,
          highlightId: highlight.id,
        });
      } catch (error) {
        logger.error('Failed to move video from temp folder during reprocess', {
          videoUrl: highlight.videoUrl,
          highlightId: highlight.id,
          error: error instanceof Error ? error.message : error,
        });
        // Continue with temp URL if move fails
        finalVideoUrl = highlight.videoUrl;
      }
    }

    // Enqueue video processing (non-blocking, fire-and-forget)
    // This will process the video again even if it was already processed
    enqueueVideoProcessing({
      highlightId: highlight.id,
      videoUrl: finalVideoUrl, // Use permanent URL
      folderPath: `highlights/${highlight.id}`,
      type: 'highlight',
      timestamp: Date.now(),
    })
      .then(() => {
        // Update status to processing when job is successfully enqueued
        return StreamHighlightModel.findOneAndUpdate(
          { id: highlight.id },
          { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
          { new: true }
        );
      })
      .catch((error) => {
        // Log error but don't block - video processing will be retried by queue system
        logger.error('Failed to enqueue video reprocessing (non-critical)', {
          highlightId: highlight.id,
          error: error instanceof Error ? error.message : error,
        });
      });

    // Update videoProcessingStatus to PROCESSING immediately
    const updatedHighlight = await StreamHighlightModel.findOneAndUpdate(
      { id: highlight.id },
      { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
      { new: true }
    );

    if (!updatedHighlight) {
      throw new ApiError(500, 'Failed to update highlight status');
    }

    logger.info('Video reprocessing job enqueued', {
      highlightId: id,
      adminId,
    });

    return {
      message: 'Video processing job has been queued. The video will be reprocessed in the background.',
      highlight: updatedHighlight.toObject(),
    };
  } catch (error) {
    logger.error('Failed to reprocess highlight video', { id, adminId, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to reprocess highlight video');
  }
};

/**
 * Update highlight status
 */
export const updateHighlightStatus = async (
  id: string,
  status: HighlightStatus,
  adminId: string
): Promise<StreamHighlight | null> => {
  try {
    const highlight = await findHighlightById(id, { deletedAt: null });

    if (!highlight) {
      return null;
    }

    highlight.status = status;
    if (status === HighlightStatus.PUBLISHED && !highlight.publishedAt) {
      highlight.publishedAt = new Date();
    }

    await highlight.save();

    logger.info('Highlight status updated', { highlightId: id, status, adminId });

    return highlight.toObject();
  } catch (error) {
    logger.error('Failed to update highlight status', { id, status, adminId, error });
    throw new ApiError(500, 'Failed to update highlight status');
  }
};

/**
 * Extract S3 key from S3 URL
 */
function extractS3KeyFromUrl(url: string): string {
  try {
    // Remove query parameters and fragments
    const urlWithoutQuery = url.split('?')[0].split('#')[0];
    
    logger.debug('Extracting S3 key from URL', { url, urlWithoutQuery });
    
    // Try standard format: https://bucket.s3.region.amazonaws.com/key
    if (urlWithoutQuery.includes('.amazonaws.com/')) {
      const urlParts = urlWithoutQuery.split('.amazonaws.com/');
      if (urlParts.length === 2) {
        let key = urlParts[1];
        
        logger.debug('Extracted key before processing', { key });
        
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
          logger.debug('Removed bucket name from key', { key, bucket: bucketMatch[1] });
        }
        
        logger.debug('Final extracted S3 key', { key, originalUrl: url });
        return key;
      }
    }
    
    throw new Error(`Invalid S3 file URL format: ${url}`);
  } catch (error) {
    logger.error('Failed to extract S3 key from URL', { url, error: error instanceof Error ? error.message : error });
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
 * Format: highlights/{highlightId}/thumbnail.{ext}
 */
async function moveThumbnailToPermanentLocation(
  tempThumbnailUrl: string,
  highlightId: string
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
    
    logger.info('Extracted S3 key for thumbnail', { tempThumbnailUrl, tempKey, highlightId });
    
    // Check if file is in temp folder
    const isTempPath = tempKey.startsWith('temp/') || tempKey.includes('/temp/');
    logger.info('Checking if thumbnail is in temp folder', { 
      tempKey, 
      isTempPath, 
      startsWithTemp: tempKey.startsWith('temp/'), 
      includesTemp: tempKey.includes('/temp/'),
      highlightId 
    });
    
    if (!isTempPath) {
      // Already in permanent location, return as is
      logger.info('Thumbnail already in permanent location', { tempThumbnailUrl, tempKey });
      return tempThumbnailUrl;
    }
    
    logger.info('Detected temp thumbnail path, will move to permanent location', { tempKey, highlightId });

    // Get file extension from temp key
    const fileExtension = tempKey.split('.').pop() || 'jpg';
    
    // Create permanent key: highlights/{highlightId}/thumbnail.{ext}
    const permanentKey = `highlights/${highlightId}/thumbnail.${fileExtension}`;

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    logger.error('Failed to move thumbnail to permanent location', {
      tempThumbnailUrl,
      highlightId,
      error: errorMessage,
      errorName,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Include the actual error message in the thrown error
    throw new ApiError(500, `Failed to move thumbnail to permanent location: ${errorName} - ${errorMessage}`);
  }
}

/**
 * Move video file from temp folder to permanent location
 * Format: highlights/{highlightId}/{highlightId}.mp4
 */
async function moveVideoToPermanentLocation(
  tempVideoUrl: string,
  highlightId: string
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
    
    logger.info('Detected temp video path, will move to permanent location', { tempKey, highlightId });

    // Get file extension from temp key
    const fileExtension = tempKey.split('.').pop() || 'mp4';
    
    // Create permanent key: highlights/{highlightId}/{highlightId}.mp4
    const permanentKey = `highlights/${highlightId}/${highlightId}.${fileExtension}`;

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
      highlightId,
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to move video to permanent location');
  }
}

