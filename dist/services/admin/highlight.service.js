"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHighlightStatus = exports.reprocessHighlightVideo = exports.deleteHighlight = exports.updateHighlightPreview = exports.updateHighlight = exports.createHighlight = exports.getHighlightById = exports.getAllHighlights = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const videoProcessingQueue_1 = require("../../queue/videoProcessingQueue");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_service_1 = require("../common/s3.service");
const env_1 = require("../../config/env");
/**
 * Helper function to find highlight by either UUID id or MongoDB _id
 * Supports both formats for backward compatibility
 * Returns a query builder that can be chained with populate, lean, etc.
 */
const findHighlightByIdQuery = (id, additionalQuery = {}) => {
    // If it's a valid MongoDB ObjectId (24 hex characters), try both _id and id
    if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
        return streamHighlight_model_1.StreamHighlightModel.findOne({
            $or: [
                { _id: new mongoose_1.Types.ObjectId(id) },
                { id }
            ],
            ...additionalQuery,
        });
    }
    // For UUID format, only try id field
    return streamHighlight_model_1.StreamHighlightModel.findOne({
        id,
        ...additionalQuery,
    });
};
/**
 * Helper function to find highlight by either UUID id or MongoDB _id (awaited version)
 * Use this when you don't need to chain populate/lean
 */
const findHighlightById = async (id, additionalQuery = {}) => {
    const query = findHighlightByIdQuery(id, additionalQuery);
    return await query;
};
/**
 * Get all highlights for admin with filters and pagination
 */
const getAllHighlights = async (params = {}) => {
    try {
        const query = { deletedAt: null };
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
            query.coachingCenterId = new mongoose_1.Types.ObjectId(params.coachingCenterId);
        }
        // Filter by user if provided
        if (params.userId) {
            query.userId = new mongoose_1.Types.ObjectId(params.userId);
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
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await streamHighlight_model_1.StreamHighlightModel.countDocuments(query);
        // Get highlights with populated references
        const highlights = await streamHighlight_model_1.StreamHighlightModel.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('coachingCenterId', 'center_name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const transformedHighlights = highlights.map((highlight) => {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get admin highlights', { params, error });
        throw new ApiError_1.ApiError(500, 'Failed to retrieve highlights');
    }
};
exports.getAllHighlights = getAllHighlights;
/**
 * Get highlight by ID for admin
 */
const getHighlightById = async (id) => {
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
        return highlight;
    }
    catch (error) {
        logger_1.logger.error('Failed to get highlight by ID', {
            id,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw new ApiError_1.ApiError(500, `Failed to retrieve highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.getHighlightById = getHighlightById;
/**
 * Create new highlight
 */
const createHighlight = async (data, adminId) => {
    try {
        // Validate user ID
        if (!mongoose_1.Types.ObjectId.isValid(data.userId)) {
            throw new ApiError_1.ApiError(400, 'Invalid user ID');
        }
        // Validate coaching center ID if provided
        if (data.coachingCenterId && !mongoose_1.Types.ObjectId.isValid(data.coachingCenterId)) {
            throw new ApiError_1.ApiError(400, 'Invalid coaching center ID');
        }
        // Generate highlight ID first (we need it for the permanent path)
        const highlightId = (0, uuid_1.v4)();
        // Move video from temp folder to permanent location BEFORE creating the highlight
        // This ensures the highlight is created with the correct permanent URL from the start
        let finalVideoUrl = data.videoUrl;
        // Check for temp folder: either '/temp/' in URL or 'temp/' at start of S3 key
        const isTempUrl = data.videoUrl && (data.videoUrl.includes('/temp/') || data.videoUrl.includes('.amazonaws.com/temp/'));
        if (isTempUrl) {
            try {
                finalVideoUrl = await moveVideoToPermanentLocation(data.videoUrl, highlightId);
                logger_1.logger.info('Video moved from temp to permanent location before highlight creation', {
                    originalUrl: data.videoUrl,
                    newUrl: finalVideoUrl,
                    highlightId,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to move video from temp folder', {
                    videoUrl: data.videoUrl,
                    highlightId,
                    error: error instanceof Error ? error.message : error,
                });
                // If move fails, throw error - don't create highlight with temp URL
                throw new ApiError_1.ApiError(500, 'Failed to move video to permanent location. Please try again.');
            }
        }
        // Move thumbnail from temp folder to permanent location if provided
        let finalThumbnailUrl = data.thumbnailUrl || null;
        if (finalThumbnailUrl) {
            const isTempThumbnailUrl = finalThumbnailUrl.includes('/temp/') || finalThumbnailUrl.includes('.amazonaws.com/temp/');
            if (isTempThumbnailUrl) {
                try {
                    finalThumbnailUrl = await moveThumbnailToPermanentLocation(finalThumbnailUrl, highlightId);
                    logger_1.logger.info('Thumbnail moved from temp to permanent location before highlight creation', {
                        originalUrl: data.thumbnailUrl,
                        newUrl: finalThumbnailUrl,
                        highlightId,
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to move thumbnail from temp folder', {
                        thumbnailUrl: data.thumbnailUrl,
                        highlightId,
                        error: error instanceof Error ? error.message : error,
                    });
                    // If move fails, throw error - don't create highlight with temp URL
                    throw new ApiError_1.ApiError(500, 'Failed to move thumbnail to permanent location. Please try again.');
                }
            }
        }
        // Create highlight with permanent video URL from the start
        const highlightData = {
            id: highlightId, // Set the ID explicitly
            userId: new mongoose_1.Types.ObjectId(data.userId),
            title: data.title,
            description: data.description || null,
            videoUrl: finalVideoUrl, // Use permanent URL
            thumbnailUrl: finalThumbnailUrl, // Use permanent URL if moved
            duration: 0, // Will be automatically extracted from video during processing
            status: streamHighlight_model_1.HighlightStatus.PUBLISHED, // Default status
            videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED, // Video processing not started yet
            metadata: data.metadata || null,
        };
        if (data.coachingCenterId) {
            highlightData.coachingCenterId = new mongoose_1.Types.ObjectId(data.coachingCenterId);
        }
        // Create highlight with permanent URL already set
        const highlight = new streamHighlight_model_1.StreamHighlightModel(highlightData);
        await highlight.save();
        logger_1.logger.info('Highlight created', {
            highlightId: highlight.id,
            adminId,
            userId: data.userId,
            videoUrl: finalVideoUrl,
        });
        // Enqueue video processing (non-blocking, fire-and-forget)
        // Use the final URL (permanent location if moved from temp)
        (0, videoProcessingQueue_1.enqueueVideoProcessing)({
            highlightId: highlight.id,
            videoUrl: finalVideoUrl, // This is now the permanent URL
            folderPath: `highlights/playasport-${highlight.id}`,
            type: 'highlight',
            timestamp: Date.now(),
        })
            .then(() => {
            // Update status to processing when job is successfully enqueued
            return streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlight.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
        })
            .catch((error) => {
            // Log error but don't block - video processing will be retried by queue system
            logger_1.logger.error('Failed to enqueue video processing (non-critical)', {
                highlightId: highlight.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Return the highlight - it already has the permanent videoUrl set from creation
        logger_1.logger.info('Highlight created with permanent videoUrl', {
            highlightId: highlight.id,
            videoUrl: highlight.videoUrl,
        });
        return highlight.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to create highlight', { data, adminId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to create highlight');
    }
};
exports.createHighlight = createHighlight;
/**
 * Update highlight by admin
 */
const updateHighlight = async (id, data, adminId) => {
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
                    logger_1.logger.info('Video moved from temp to permanent location during update', {
                        originalUrl: data.videoUrl,
                        newUrl: finalVideoUrl,
                        highlightId: highlight.id,
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to move video from temp folder during update', {
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
                highlight.videoProcessingStatus = streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED;
                (0, videoProcessingQueue_1.enqueueVideoProcessing)({
                    highlightId: highlight.id,
                    videoUrl: finalVideoUrl, // Use permanent URL
                    folderPath: `highlights/playasport-${highlight.id}`,
                    type: 'highlight',
                    timestamp: Date.now(),
                })
                    .then(() => {
                    // Update status to processing when job is successfully enqueued
                    return streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlight.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
                })
                    .catch((error) => {
                    // Log error but don't block
                    logger_1.logger.error('Failed to enqueue video reprocessing (non-critical)', {
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
                logger_1.logger.info('Detected temp thumbnail URL, attempting to move', {
                    thumbnailUrl: data.thumbnailUrl,
                    highlightId: highlight.id,
                });
                try {
                    finalThumbnailUrl = await moveThumbnailToPermanentLocation(data.thumbnailUrl, highlight.id);
                    // Verify the move was successful (URL should be different)
                    if (finalThumbnailUrl === data.thumbnailUrl) {
                        logger_1.logger.warn('Thumbnail move returned same URL - move may have failed', {
                            originalUrl: data.thumbnailUrl,
                            finalUrl: finalThumbnailUrl,
                            highlightId: highlight.id,
                        });
                    }
                    else {
                        logger_1.logger.info('Thumbnail moved from temp to permanent location during update', {
                            originalUrl: data.thumbnailUrl,
                            newUrl: finalThumbnailUrl,
                            highlightId: highlight.id,
                        });
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger_1.logger.error('Failed to move thumbnail from temp folder during update', {
                        thumbnailUrl: data.thumbnailUrl,
                        highlightId: highlight.id,
                        error: errorMessage,
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                    // If it's already an ApiError, re-throw it
                    if (error instanceof ApiError_1.ApiError) {
                        throw error;
                    }
                    // Re-throw error instead of silently continuing with temp URL
                    throw new ApiError_1.ApiError(500, `Failed to move thumbnail to permanent location: ${errorMessage}`);
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
            if (data.status === streamHighlight_model_1.HighlightStatus.PUBLISHED && !highlight.publishedAt) {
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
            if (!mongoose_1.Types.ObjectId.isValid(data.userId)) {
                throw new ApiError_1.ApiError(400, 'Invalid user ID');
            }
            highlight.userId = new mongoose_1.Types.ObjectId(data.userId);
        }
        if (data.coachingCenterId !== undefined) {
            // Handle empty string as null
            const coachingCenterId = data.coachingCenterId === '' || data.coachingCenterId === null ? null : data.coachingCenterId;
            // Validate coaching center ID if provided
            if (coachingCenterId !== null && !mongoose_1.Types.ObjectId.isValid(coachingCenterId)) {
                throw new ApiError_1.ApiError(400, 'Invalid coaching center ID');
            }
            highlight.coachingCenterId = coachingCenterId ? new mongoose_1.Types.ObjectId(coachingCenterId) : null;
        }
        await highlight.save();
        logger_1.logger.info('Highlight updated', { highlightId: id, adminId });
        return highlight.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to update highlight', {
            id,
            data,
            adminId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, `Failed to update highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.updateHighlight = updateHighlight;
/**
 * Update preview video URL for a highlight
 */
const updateHighlightPreview = async (id, previewUrl, adminId) => {
    try {
        const highlight = await findHighlightById(id, { deletedAt: null });
        if (!highlight) {
            return null;
        }
        highlight.previewUrl = previewUrl;
        await highlight.save();
        logger_1.logger.info('Highlight preview video updated', {
            highlightId: id,
            previewUrl,
            adminId,
        });
        return highlight.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to update highlight preview video', { id, previewUrl, adminId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to update highlight preview video');
    }
};
exports.updateHighlightPreview = updateHighlightPreview;
/**
 * Delete highlight (soft delete)
 */
const deleteHighlight = async (id, adminId) => {
    try {
        const highlight = await findHighlightById(id, { deletedAt: null });
        if (!highlight) {
            return false;
        }
        highlight.deletedAt = new Date();
        await highlight.save();
        logger_1.logger.info('Highlight deleted', { highlightId: id, adminId });
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to delete highlight', { id, adminId, error });
        throw new ApiError_1.ApiError(500, 'Failed to delete highlight');
    }
};
exports.deleteHighlight = deleteHighlight;
/**
 * Reprocess video for a highlight
 * This will process the video again regardless of current processing status
 */
const reprocessHighlightVideo = async (id, adminId) => {
    try {
        // Find the highlight
        const highlight = await findHighlightById(id, { deletedAt: null });
        if (!highlight) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        // Check if videoUrl exists
        if (!highlight.videoUrl) {
            throw new ApiError_1.ApiError(400, 'Highlight does not have a video URL to process');
        }
        logger_1.logger.info('Reprocessing video for highlight', {
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
                await streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlight.id }, { videoUrl: finalVideoUrl }, { new: true });
                logger_1.logger.info('Video moved from temp to permanent location during reprocess', {
                    originalUrl: highlight.videoUrl,
                    newUrl: finalVideoUrl,
                    highlightId: highlight.id,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to move video from temp folder during reprocess', {
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
        (0, videoProcessingQueue_1.enqueueVideoProcessing)({
            highlightId: highlight.id,
            videoUrl: finalVideoUrl, // Use permanent URL
            folderPath: `highlights/playasport-${highlight.id}`,
            type: 'highlight',
            timestamp: Date.now(),
        })
            .then(() => {
            // Update status to processing when job is successfully enqueued
            return streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlight.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
        })
            .catch((error) => {
            // Log error but don't block - video processing will be retried by queue system
            logger_1.logger.error('Failed to enqueue video reprocessing (non-critical)', {
                highlightId: highlight.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Update videoProcessingStatus to PROCESSING immediately
        const updatedHighlight = await streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlight.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
        if (!updatedHighlight) {
            throw new ApiError_1.ApiError(500, 'Failed to update highlight status');
        }
        logger_1.logger.info('Video reprocessing job enqueued', {
            highlightId: id,
            adminId,
        });
        return {
            message: 'Video processing job has been queued. The video will be reprocessed in the background.',
            highlight: updatedHighlight.toObject(),
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to reprocess highlight video', { id, adminId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to reprocess highlight video');
    }
};
exports.reprocessHighlightVideo = reprocessHighlightVideo;
/**
 * Update highlight status
 */
const updateHighlightStatus = async (id, status, adminId) => {
    try {
        const highlight = await findHighlightById(id, { deletedAt: null });
        if (!highlight) {
            return null;
        }
        highlight.status = status;
        if (status === streamHighlight_model_1.HighlightStatus.PUBLISHED && !highlight.publishedAt) {
            highlight.publishedAt = new Date();
        }
        await highlight.save();
        logger_1.logger.info('Highlight status updated', { highlightId: id, status, adminId });
        return highlight.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to update highlight status', { id, status, adminId, error });
        throw new ApiError_1.ApiError(500, 'Failed to update highlight status');
    }
};
exports.updateHighlightStatus = updateHighlightStatus;
/**
 * Extract S3 key from S3 URL
 */
function extractS3KeyFromUrl(url) {
    try {
        // Remove query parameters and fragments
        const urlWithoutQuery = url.split('?')[0].split('#')[0];
        logger_1.logger.debug('Extracting S3 key from URL', { url, urlWithoutQuery });
        // Try standard format: https://bucket.s3.region.amazonaws.com/key
        if (urlWithoutQuery.includes('.amazonaws.com/')) {
            const urlParts = urlWithoutQuery.split('.amazonaws.com/');
            if (urlParts.length === 2) {
                let key = urlParts[1];
                logger_1.logger.debug('Extracted key before processing', { key });
                // Decode URL encoding
                try {
                    key = decodeURIComponent(key);
                }
                catch (e) {
                    // If decoding fails, use original key
                    logger_1.logger.warn('Failed to decode S3 key', { key });
                }
                // Remove bucket name if it's in the path (for path-style URLs)
                const bucketMatch = urlWithoutQuery.match(/https?:\/\/([^.]+)\.s3[.-]/);
                if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
                    key = key.substring(bucketMatch[1].length + 1);
                    logger_1.logger.debug('Removed bucket name from key', { key, bucket: bucketMatch[1] });
                }
                logger_1.logger.debug('Final extracted S3 key', { key, originalUrl: url });
                return key;
            }
        }
        throw new Error(`Invalid S3 file URL format: ${url}`);
    }
    catch (error) {
        logger_1.logger.error('Failed to extract S3 key from URL', { url, error: error instanceof Error ? error.message : error });
        throw new ApiError_1.ApiError(400, `Invalid S3 file URL: ${url}`);
    }
}
/**
 * Delete file from S3
 */
async function deleteS3File(fileUrl) {
    try {
        if (!fileUrl) {
            return;
        }
        // Skip if it's a temp URL (will be cleaned up by media cleanup job)
        const s3Key = extractS3KeyFromUrl(fileUrl);
        if (s3Key.startsWith('temp/') || s3Key.includes('/temp/')) {
            logger_1.logger.info('Skipping deletion of temp file (will be cleaned up by media cleanup)', { fileUrl, s3Key });
            return;
        }
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        const client = (0, s3_service_1.getS3Client)();
        if (!client) {
            throw new ApiError_1.ApiError(500, 'S3 client not configured');
        }
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: s3Key,
        });
        await client.send(deleteCommand);
        logger_1.logger.info('File deleted from S3', { fileUrl, s3Key });
    }
    catch (error) {
        // Log error but don't throw - file deletion is not critical
        logger_1.logger.error('Failed to delete file from S3', {
            fileUrl,
            error: error instanceof Error ? error.message : error,
        });
    }
}
/**
 * Move thumbnail file from temp folder to permanent location
 * Format: highlights/{highlightId}/thumbnail.{ext}
 */
async function moveThumbnailToPermanentLocation(tempThumbnailUrl, highlightId) {
    try {
        if (!tempThumbnailUrl) {
            return tempThumbnailUrl;
        }
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        const client = (0, s3_service_1.getS3Client)();
        if (!client) {
            throw new ApiError_1.ApiError(500, 'S3 client not configured');
        }
        const tempKey = extractS3KeyFromUrl(tempThumbnailUrl);
        logger_1.logger.info('Extracted S3 key for thumbnail', { tempThumbnailUrl, tempKey, highlightId });
        // Check if file is in temp folder
        const isTempPath = tempKey.startsWith('temp/') || tempKey.includes('/temp/');
        logger_1.logger.info('Checking if thumbnail is in temp folder', {
            tempKey,
            isTempPath,
            startsWithTemp: tempKey.startsWith('temp/'),
            includesTemp: tempKey.includes('/temp/'),
            highlightId
        });
        if (!isTempPath) {
            // Already in permanent location, return as is
            logger_1.logger.info('Thumbnail already in permanent location', { tempThumbnailUrl, tempKey });
            return tempThumbnailUrl;
        }
        logger_1.logger.info('Detected temp thumbnail path, will move to permanent location', { tempKey, highlightId });
        // Get file extension from temp key
        const fileExtension = tempKey.split('.').pop() || 'jpg';
        // Create permanent key: highlights/playasport-{highlightId}/playasport-thumbnail.{ext}
        const permanentKey = `highlights/playasport-${highlightId}/playasport-thumbnail.${fileExtension}`;
        logger_1.logger.info('Moving thumbnail from temp to permanent location', {
            tempKey,
            permanentKey,
            bucket: env_1.config.aws.s3Bucket,
        });
        // Copy file to permanent location
        const copyCommand = new client_s3_1.CopyObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            CopySource: `${env_1.config.aws.s3Bucket}/${tempKey}`,
            Key: permanentKey,
        });
        await client.send(copyCommand);
        logger_1.logger.info('Thumbnail copied to permanent location', { tempKey, permanentKey });
        // Delete temp file
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: tempKey,
        });
        await client.send(deleteCommand);
        logger_1.logger.info('Temp thumbnail file deleted', { tempKey });
        // Construct permanent URL
        const permanentUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${permanentKey}`;
        logger_1.logger.info('Thumbnail successfully moved from temp to permanent location', {
            tempKey,
            permanentKey,
            tempUrl: tempThumbnailUrl,
            permanentUrl,
        });
        return permanentUrl;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        logger_1.logger.error('Failed to move thumbnail to permanent location', {
            tempThumbnailUrl,
            highlightId,
            error: errorMessage,
            errorName,
            stack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        // Include the actual error message in the thrown error
        throw new ApiError_1.ApiError(500, `Failed to move thumbnail to permanent location: ${errorName} - ${errorMessage}`);
    }
}
/**
 * Move video file from temp folder to permanent location
 * Format: highlights/{highlightId}/{highlightId}.mp4
 */
async function moveVideoToPermanentLocation(tempVideoUrl, highlightId) {
    try {
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        const client = (0, s3_service_1.getS3Client)();
        if (!client) {
            throw new ApiError_1.ApiError(500, 'S3 client not configured');
        }
        // Extract S3 key from URL
        const tempKey = extractS3KeyFromUrl(tempVideoUrl);
        // Check if file is in temp folder
        // Check for both 'temp/' (at start) and '/temp/' (anywhere in path)
        const isTempPath = tempKey.startsWith('temp/') || tempKey.includes('/temp/');
        if (!isTempPath) {
            // Already in permanent location, return as is
            logger_1.logger.info('Video already in permanent location', { tempVideoUrl, tempKey });
            return tempVideoUrl;
        }
        logger_1.logger.info('Detected temp video path, will move to permanent location', { tempKey, highlightId });
        // Get file extension from temp key
        const fileExtension = tempKey.split('.').pop() || 'mp4';
        // Create permanent key: highlights/playasport-{highlightId}/playasport-{highlightId}.mp4
        const permanentKey = `highlights/playasport-${highlightId}/playasport-${highlightId}.${fileExtension}`;
        logger_1.logger.info('Moving video from temp to permanent location', {
            tempKey,
            permanentKey,
            bucket: env_1.config.aws.s3Bucket,
        });
        // Copy file to permanent location
        const copyCommand = new client_s3_1.CopyObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            CopySource: `${env_1.config.aws.s3Bucket}/${tempKey}`,
            Key: permanentKey,
        });
        await client.send(copyCommand);
        logger_1.logger.info('Video copied to permanent location', { tempKey, permanentKey });
        // Delete temp file
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: tempKey,
        });
        await client.send(deleteCommand);
        logger_1.logger.info('Temp video file deleted', { tempKey });
        // Construct permanent URL
        const permanentUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${permanentKey}`;
        logger_1.logger.info('Video successfully moved from temp to permanent location', {
            tempKey,
            permanentKey,
            tempUrl: tempVideoUrl,
            permanentUrl,
        });
        return permanentUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to move video to permanent location', {
            tempVideoUrl,
            highlightId,
            error: error instanceof Error ? error.message : error,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to move video to permanent location');
    }
}
//# sourceMappingURL=highlight.service.js.map