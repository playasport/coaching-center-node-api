"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReelPreview = exports.reprocessReelVideo = exports.updateReelStatus = exports.deleteReel = exports.updateReel = exports.createReel = exports.getReelById = exports.getAllReels = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const reel_model_1 = require("../../models/reel.model");
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const videoProcessingQueue_1 = require("../../queue/videoProcessingQueue");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_service_1 = require("../common/s3.service");
const env_1 = require("../../config/env");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const tmp_1 = __importDefault(require("tmp"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
/**
 * Helper function to build a query that supports both custom id and MongoDB _id
 */
const buildReelIdQuery = (id) => {
    const query = { deletedAt: null };
    // Check if the ID is a valid MongoDB ObjectId
    if (mongoose_1.Types.ObjectId.isValid(id)) {
        // Support both _id (ObjectId) and custom id (string)
        query.$or = [
            { _id: new mongoose_1.Types.ObjectId(id) },
            { id: id }
        ];
    }
    else {
        // If not a valid ObjectId, only search by custom id
        query.id = id;
    }
    return query;
};
/**
 * Helper function to convert sport IDs (strings or ObjectIds) to ObjectIds
 */
const convertSportIdsToObjectIds = (sportIds) => {
    if (!sportIds || sportIds.length === 0) {
        return [];
    }
    return sportIds.map((sportId) => {
        if (mongoose_1.Types.ObjectId.isValid(sportId)) {
            return new mongoose_1.Types.ObjectId(sportId);
        }
        else {
            throw new ApiError_1.ApiError(400, `Invalid sport ID: ${sportId}`);
        }
    });
};
/**
 * Get all reels for admin with filters and pagination
 */
const getAllReels = async (params = {}) => {
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
        // Filter by user if provided
        if (params.userId) {
            if (!mongoose_1.Types.ObjectId.isValid(params.userId)) {
                throw new ApiError_1.ApiError(400, 'Invalid user ID');
            }
            query.userId = new mongoose_1.Types.ObjectId(params.userId);
        }
        // Filter by sport if provided
        if (params.sportId) {
            if (mongoose_1.Types.ObjectId.isValid(params.sportId)) {
                query.sportIds = new mongoose_1.Types.ObjectId(params.sportId);
            }
            else {
                throw new ApiError_1.ApiError(400, 'Invalid sport ID');
            }
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
        const sort = { [sortBy]: sortOrder };
        // Execute query
        const [reels, total] = await Promise.all([
            reel_model_1.ReelModel.find(query)
                .populate('userId', 'id firstName lastName email')
                .populate('sportIds', '_id custom_id name slug logo is_active is_popular')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            reel_model_1.ReelModel.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            reels: reels,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get reels', { params, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to get reels');
    }
};
exports.getAllReels = getAllReels;
/**
 * Get reel by ID for admin
 */
const getReelById = async (id) => {
    try {
        const query = buildReelIdQuery(id);
        const reel = await reel_model_1.ReelModel.findOne(query)
            .populate('userId', 'id firstName lastName email')
            .populate('sportIds', '_id custom_id name slug logo is_active is_popular')
            .lean();
        return reel;
    }
    catch (error) {
        logger_1.logger.error('Failed to get reel by ID', { id, error });
        throw new ApiError_1.ApiError(500, 'Failed to get reel');
    }
};
exports.getReelById = getReelById;
/**
 * Create reel by admin
 */
const createReel = async (data, adminId) => {
    try {
        // Validate user ID
        if (!mongoose_1.Types.ObjectId.isValid(data.userId)) {
            throw new ApiError_1.ApiError(400, 'Invalid user ID');
        }
        // Note: Video duration validation is now done during upload (when we have the file buffer)
        // This is faster than downloading from S3. If validation wasn't done during upload,
        // we can optionally validate here, but it's recommended to validate during upload.
        // For now, we skip validation here to avoid downloading from S3 unnecessarily.
        // If you need to validate here as well, uncomment the line below:
        // await validateVideoDuration(data.originalPath, 90);
        // Generate reel ID first (we need it for the permanent path)
        const reelId = (0, uuid_1.v4)();
        // Move video from temp folder to permanent location BEFORE creating the reel
        // This ensures the reel is created with the correct permanent URL from the start
        let finalVideoUrl = data.originalPath;
        // Check for temp folder: either '/temp/' in URL or '.amazonaws.com/temp/' (S3 key starts with 'temp/')
        const isTempUrl = data.originalPath && (data.originalPath.includes('/temp/') || data.originalPath.includes('.amazonaws.com/temp/'));
        if (isTempUrl) {
            try {
                finalVideoUrl = await moveVideoToPermanentLocation(data.originalPath, reelId);
                logger_1.logger.info('Video moved from temp to permanent location before reel creation', {
                    originalUrl: data.originalPath,
                    newUrl: finalVideoUrl,
                    reelId,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to move video from temp folder', {
                    videoUrl: data.originalPath,
                    reelId,
                    error: error instanceof Error ? error.message : error,
                });
                // If move fails, throw error - don't create reel with temp URL
                throw new ApiError_1.ApiError(500, 'Failed to move video to permanent location. Please try again.');
            }
        }
        // Move thumbnail from temp folder to permanent location if provided
        let finalThumbnailPath = data.thumbnailPath || null;
        if (finalThumbnailPath) {
            const isTempThumbnailUrl = finalThumbnailPath.includes('/temp/') || finalThumbnailPath.includes('.amazonaws.com/temp/');
            if (isTempThumbnailUrl) {
                try {
                    finalThumbnailPath = await moveThumbnailToPermanentLocation(finalThumbnailPath, reelId);
                    logger_1.logger.info('Thumbnail moved from temp to permanent location before reel creation', {
                        originalUrl: data.thumbnailPath,
                        newUrl: finalThumbnailPath,
                        reelId,
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to move thumbnail from temp folder', {
                        thumbnailPath: data.thumbnailPath,
                        reelId,
                        error: error instanceof Error ? error.message : error,
                    });
                    // If move fails, throw error - don't create reel with temp URL
                    throw new ApiError_1.ApiError(500, 'Failed to move thumbnail to permanent location. Please try again.');
                }
            }
        }
        // Convert sport IDs to ObjectIds
        const sportObjectIds = convertSportIdsToObjectIds(data.sportIds);
        // Create reel with permanent video URL from the start
        const reelData = {
            id: reelId, // Set the ID explicitly
            userId: new mongoose_1.Types.ObjectId(data.userId),
            title: data.title,
            description: data.description || null,
            originalPath: finalVideoUrl, // Use permanent URL
            thumbnailPath: finalThumbnailPath, // Use permanent URL if moved
            sportIds: sportObjectIds,
            status: reel_model_1.ReelStatus.APPROVED, // Admin-created reels are approved by default
            videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED, // Will be updated to PROCESSING after enqueueing
        };
        // Create reel with permanent URL already set
        const reel = new reel_model_1.ReelModel(reelData);
        await reel.save();
        logger_1.logger.info('Reel created', {
            reelId: reel.id,
            adminId,
            userId: data.userId,
            videoUrl: finalVideoUrl,
        });
        // Enqueue video processing (non-blocking, fire-and-forget)
        // Use the final URL (permanent location if moved from temp)
        (0, videoProcessingQueue_1.enqueueVideoProcessing)({
            reelId: reel.id,
            videoUrl: finalVideoUrl, // This is now the permanent URL
            folderPath: `reels/playasport-${reel.id}`,
            type: 'reel',
            timestamp: Date.now(),
        }).catch((error) => {
            // Log error but don't block - video processing will be retried by queue system
            logger_1.logger.error('Failed to enqueue video processing (non-critical)', {
                reelId: reel.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Update status to processing immediately after job is enqueued
        // The worker will also update it when it starts, but this gives immediate feedback
        try {
            await reel_model_1.ReelModel.findOneAndUpdate({ id: reel.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
            logger_1.logger.info('Reel video processing status updated to PROCESSING', { reelId: reel.id });
        }
        catch (error) {
            // Log error but don't block - the worker will update it when processing starts
            logger_1.logger.error('Failed to update video processing status (non-critical)', {
                reelId: reel.id,
                error: error instanceof Error ? error.message : error,
            });
        }
        // Return the reel - it already has the permanent videoUrl
        logger_1.logger.info('Reel created with permanent videoUrl', {
            reelId: reel.id,
            videoUrl: reel.originalPath,
        });
        return reel.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to create reel', {
            data,
            adminId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        // Include the actual error message in the response for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new ApiError_1.ApiError(500, `Failed to create reel: ${errorMessage}`);
    }
};
exports.createReel = createReel;
/**
 * Update reel by admin
 */
const updateReel = async (id, data, adminId) => {
    try {
        const query = buildReelIdQuery(id);
        const reel = await reel_model_1.ReelModel.findOne(query);
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
            reel.sportIds = convertSportIdsToObjectIds(data.sportIds);
        }
        if (data.thumbnailPath !== undefined) {
            const oldThumbnailPath = reel.thumbnailPath;
            // Move thumbnail from temp to permanent location if it's in temp folder
            let finalThumbnailPath = data.thumbnailPath;
            const isTempUrl = data.thumbnailPath !== null && (data.thumbnailPath.includes('/temp/') || data.thumbnailPath.includes('.amazonaws.com/temp/'));
            if (isTempUrl && data.thumbnailPath !== null) {
                try {
                    finalThumbnailPath = await moveThumbnailToPermanentLocation(data.thumbnailPath, reel.id);
                    logger_1.logger.info('Thumbnail moved from temp to permanent location during update', {
                        originalUrl: data.thumbnailPath,
                        newUrl: finalThumbnailPath,
                        reelId: reel.id,
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to move thumbnail from temp folder during update', {
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
                    logger_1.logger.info('Video moved from temp to permanent location during update', {
                        originalUrl: data.originalPath,
                        newUrl: finalVideoUrl,
                        reelId: reel.id,
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to move video from temp folder during update', {
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
                reel.videoProcessingStatus = streamHighlight_model_1.VideoProcessingStatus.NOT_STARTED;
                (0, videoProcessingQueue_1.enqueueVideoProcessing)({
                    reelId: reel.id,
                    videoUrl: finalVideoUrl, // Use permanent URL
                    folderPath: `reels/playasport-${reel.id}`,
                    type: 'reel',
                    timestamp: Date.now(),
                }).catch((error) => {
                    // Log error but don't block - video processing will be retried by queue system
                    logger_1.logger.error('Failed to enqueue video processing (non-critical)', {
                        reelId: reel.id,
                        error: error instanceof Error ? error.message : error,
                    });
                });
                // Update status to processing immediately after job is enqueued
                try {
                    await reel_model_1.ReelModel.findOneAndUpdate({ id: reel.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
                    logger_1.logger.info('Reel video processing status updated to PROCESSING during update', { reelId: reel.id });
                }
                catch (error) {
                    // Log error but don't block - the worker will update it when processing starts
                    logger_1.logger.error('Failed to update video processing status (non-critical)', {
                        reelId: reel.id,
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }
        }
        if (data.userId !== undefined) {
            // Validate user ID
            if (!mongoose_1.Types.ObjectId.isValid(data.userId)) {
                throw new ApiError_1.ApiError(400, 'Invalid user ID');
            }
            reel.userId = new mongoose_1.Types.ObjectId(data.userId);
        }
        await reel.save();
        logger_1.logger.info('Reel updated', { reelId: id, adminId });
        return reel.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to update reel', { id, data, adminId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to update reel');
    }
};
exports.updateReel = updateReel;
/**
 * Delete reel (soft delete)
 */
const deleteReel = async (id, adminId) => {
    try {
        const query = buildReelIdQuery(id);
        const reel = await reel_model_1.ReelModel.findOne(query);
        if (!reel) {
            return false;
        }
        reel.deletedAt = new Date();
        await reel.save();
        logger_1.logger.info('Reel deleted', { reelId: id, adminId });
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to delete reel', { id, adminId, error });
        throw new ApiError_1.ApiError(500, 'Failed to delete reel');
    }
};
exports.deleteReel = deleteReel;
/**
 * Update reel status
 */
const updateReelStatus = async (id, status, adminId) => {
    try {
        const query = buildReelIdQuery(id);
        const reel = await reel_model_1.ReelModel.findOne(query);
        if (!reel) {
            return null;
        }
        reel.status = status;
        await reel.save();
        logger_1.logger.info('Reel status updated', { reelId: id, status, adminId });
        return reel.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to update reel status', { id, status, adminId, error });
        throw new ApiError_1.ApiError(500, 'Failed to update reel status');
    }
};
exports.updateReelStatus = updateReelStatus;
/**
 * Reprocess video for a reel
 * This will process the video again regardless of current processing status
 */
const reprocessReelVideo = async (id, adminId) => {
    try {
        // Find the reel
        const query = buildReelIdQuery(id);
        const reel = await reel_model_1.ReelModel.findOne(query);
        if (!reel) {
            throw new ApiError_1.ApiError(404, 'Reel not found');
        }
        // Check if originalPath exists
        if (!reel.originalPath) {
            throw new ApiError_1.ApiError(400, 'Reel does not have a video URL to process.');
        }
        logger_1.logger.info('Attempting to re-enqueue video processing for reel', {
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
                await reel_model_1.ReelModel.findOneAndUpdate({ id: reel.id }, { originalPath: finalVideoUrl }, { new: true });
                logger_1.logger.info('Video moved from temp to permanent location during reprocess', {
                    originalUrl: reel.originalPath,
                    newUrl: finalVideoUrl,
                    reelId: reel.id,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to move video from temp folder during reprocess', {
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
        (0, videoProcessingQueue_1.enqueueVideoProcessing)({
            reelId: reel.id,
            videoUrl: finalVideoUrl, // Use permanent URL
            folderPath: `reels/playasport-${reel.id}`,
            type: 'reel',
            timestamp: Date.now(),
        }).catch((error) => {
            // Log error but don't block - video processing will be retried by queue system
            logger_1.logger.error('Failed to enqueue video reprocessing (non-critical)', {
                reelId: reel.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Update videoProcessingStatus to PROCESSING immediately after job is enqueued
        const updatedReel = await reel_model_1.ReelModel.findOneAndUpdate({ id: reel.id }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
        if (!updatedReel) {
            throw new ApiError_1.ApiError(500, 'Failed to update reel status');
        }
        logger_1.logger.info('Video reprocessing job enqueued', {
            reelId: id,
            adminId,
        });
        return {
            message: 'Video processing job has been queued. The video will be reprocessed in the background.',
            reel: updatedReel.toObject(),
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to reprocess reel video', { id, adminId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to reprocess reel video');
    }
};
exports.reprocessReelVideo = reprocessReelVideo;
/**
 * Update preview video URL for a reel
 */
const updateReelPreview = async (id, previewUrl, adminId) => {
    try {
        const query = buildReelIdQuery(id);
        const reel = await reel_model_1.ReelModel.findOne(query);
        if (!reel) {
            return null;
        }
        reel.previewUrl = previewUrl;
        await reel.save();
        logger_1.logger.info('Reel preview video updated', {
            reelId: id,
            previewUrl,
            adminId,
        });
        return reel.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to update reel preview video', { id, previewUrl, adminId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to update reel preview video');
    }
};
exports.updateReelPreview = updateReelPreview;
/**
 * Extract S3 key from S3 URL
 */
function extractS3KeyFromUrl(url) {
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
                }
                catch (e) {
                    // If decoding fails, use original key
                    logger_1.logger.warn('Failed to decode S3 key', { key });
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
    }
    catch (error) {
        logger_1.logger.error('Failed to extract S3 key from URL', { url, error });
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
 * Format: reels/{reelId}/thumbnail.{ext}
 */
async function moveThumbnailToPermanentLocation(tempThumbnailUrl, reelId) {
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
        // Check if file is in temp folder
        const isTempPath = tempKey.startsWith('temp/') || tempKey.includes('/temp/');
        if (!isTempPath) {
            // Already in permanent location, return as is
            logger_1.logger.info('Thumbnail already in permanent location', { tempThumbnailUrl, tempKey });
            return tempThumbnailUrl;
        }
        logger_1.logger.info('Detected temp thumbnail path, will move to permanent location', { tempKey, reelId });
        // Get file extension from temp key
        const fileExtension = tempKey.split('.').pop() || 'jpg';
        // Create permanent key: reels/playasport-{reelId}/playasport-thumbnail.{ext}
        const permanentKey = `reels/playasport-${reelId}/playasport-thumbnail.${fileExtension}`;
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
        logger_1.logger.error('Failed to move thumbnail to permanent location', {
            tempThumbnailUrl,
            reelId,
            error: error instanceof Error ? error.message : error,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to move thumbnail to permanent location');
    }
}
/**
 * Move video file from temp folder to permanent location
 * Format: reels/{reelId}/{reelId}.mp4
 */
async function moveVideoToPermanentLocation(tempVideoUrl, reelId) {
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
        logger_1.logger.info('Detected temp video path, will move to permanent location', { tempKey, reelId });
        // Get file extension from temp key
        const fileExtension = tempKey.split('.').pop() || 'mp4';
        // Create permanent key: reels/playasport-{reelId}/playasport-{reelId}.mp4
        const permanentKey = `reels/playasport-${reelId}/playasport-${reelId}.${fileExtension}`;
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
            reelId,
            error: error instanceof Error ? error.message : error,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to move video to permanent location');
    }
}
/**
 * Validate video duration
 * Downloads video temporarily and checks duration using ffprobe
 */
async function validateVideoDuration(videoUrl, maxDurationSeconds) {
    try {
        logger_1.logger.info('Validating video duration', { videoUrl, maxDurationSeconds });
        // Extract file extension safely
        let fileExtension = 'mp4'; // Default extension
        try {
            const urlObj = new URL(videoUrl);
            const ext = path_1.default.extname(urlObj.pathname);
            if (ext) {
                fileExtension = ext;
            }
        }
        catch (urlError) {
            // If URL parsing fails, try to extract extension from the string directly
            const extMatch = videoUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            if (extMatch && extMatch[1]) {
                fileExtension = `.${extMatch[1]}`;
            }
            logger_1.logger.warn('Failed to parse URL, using fallback extension extraction', { videoUrl, fileExtension });
        }
        // Create temporary directory
        const tmpDir = tmp_1.default.dirSync({ unsafeCleanup: true });
        const tempVideoPath = path_1.default.join(tmpDir.name, `temp_video_${Date.now()}${fileExtension}`);
        try {
            // Download video from S3
            if (videoUrl.includes('.amazonaws.com/')) {
                // S3 URL - use S3 client
                const client = (0, s3_service_1.getS3Client)();
                if (!client) {
                    throw new ApiError_1.ApiError(500, 'S3 client not configured');
                }
                // Extract S3 key using the same logic as other services
                let key;
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
                            }
                            catch (e) {
                                // If decoding fails, use original key
                                logger_1.logger.warn('Failed to decode S3 key', { key });
                            }
                            // Remove bucket name if it's in the path (for path-style URLs)
                            const bucketMatch = urlWithoutQuery.match(/https?:\/\/([^.]+)\.s3[.-]/);
                            if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
                                key = key.substring(bucketMatch[1].length + 1);
                            }
                        }
                        else {
                            throw new ApiError_1.ApiError(400, `Invalid S3 file URL format: ${videoUrl}`);
                        }
                    }
                    else {
                        throw new ApiError_1.ApiError(400, `Invalid S3 file URL format: ${videoUrl}`);
                    }
                }
                catch (error) {
                    if (error instanceof ApiError_1.ApiError) {
                        throw error;
                    }
                    logger_1.logger.error('Failed to extract S3 key from URL', { videoUrl, error });
                    throw new ApiError_1.ApiError(400, `Invalid S3 file URL: ${videoUrl}`);
                }
                logger_1.logger.info('Extracted S3 key for video validation', { videoUrl, key });
                const getObjectCommand = new client_s3_1.GetObjectCommand({
                    Bucket: env_1.config.aws.s3Bucket,
                    Key: key,
                });
                const response = await client.send(getObjectCommand);
                if (!response.Body) {
                    throw new ApiError_1.ApiError(500, 'Failed to download video from S3');
                }
                // Convert stream to buffer and write to file
                const chunks = [];
                const stream = response.Body;
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                await fs_extra_1.default.writeFile(tempVideoPath, buffer);
            }
            else {
                // HTTP URL - use axios
                const response = await (0, axios_1.default)({
                    method: 'get',
                    url: videoUrl,
                    responseType: 'stream',
                    timeout: 30000,
                });
                const writer = fs_extra_1.default.createWriteStream(tempVideoPath);
                await new Promise((resolve, reject) => {
                    response.data.pipe(writer);
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            }
            // Get video duration using ffprobe
            const duration = await new Promise((resolve, reject) => {
                fluent_ffmpeg_1.default.ffprobe(tempVideoPath, (err, metadata) => {
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
            logger_1.logger.info('Video duration checked', { videoUrl, duration, maxDurationSeconds });
            // Validate duration
            if (duration > maxDurationSeconds) {
                throw new ApiError_1.ApiError(400, `Video duration (${Math.round(duration)}s) exceeds maximum allowed duration of ${maxDurationSeconds} seconds for reels`);
            }
            if (duration <= 0) {
                throw new ApiError_1.ApiError(400, 'Invalid video duration. The video file may be corrupted.');
            }
        }
        finally {
            // Cleanup temp file
            try {
                if (await fs_extra_1.default.pathExists(tempVideoPath)) {
                    await fs_extra_1.default.remove(tempVideoPath);
                }
                tmpDir.removeCallback();
            }
            catch (cleanupError) {
                logger_1.logger.warn('Failed to cleanup temp video file', { tempVideoPath, error: cleanupError });
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to validate video duration', { videoUrl, maxDurationSeconds, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, `Failed to validate video duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=reel.service.js.map