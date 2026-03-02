"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeVideoProcessingWorker = exports.videoProcessingWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const hlsVideoProcessor_service_1 = require("../services/common/hlsVideoProcessor.service");
const videoProcessingQueue_1 = require("./videoProcessingQueue");
const streamHighlight_model_1 = require("../models/streamHighlight.model");
const reel_model_1 = require("../models/reel.model");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    ...env_1.config.redis.connection,
});
// Create worker for processing jobs
exports.videoProcessingWorker = new bullmq_1.Worker(videoProcessingQueue_1.VIDEO_PROCESSING_QUEUE_NAME, async (job) => {
    try {
        logger_1.logger.info('Received video processing job', {
            jobId: job.id,
            data: job.data,
        });
        // Extract job data (BullMQ format)
        const jobData = job.data;
        const reelId = jobData.reelId || jobData.highlightId;
        const videoUrl = jobData.videoUrl;
        const folderPath = jobData.folderPath;
        const highlightId = jobData.highlightId;
        // Validate required fields
        if (!reelId || !videoUrl || !folderPath) {
            const error = new Error('Missing required fields in job data');
            logger_1.logger.error('Job data validation failed', {
                reelId,
                videoUrl,
                folderPath,
                highlightId,
                rawData: job.data,
            });
            throw error;
        }
        logger_1.logger.info('Starting video processing job', {
            reelId,
            highlightId,
            videoUrl,
            folderPath,
        });
        // Get existing thumbnail URL if highlight or reel exists (to avoid regenerating)
        let existingThumbnailUrl = null;
        if (highlightId) {
            const existingHighlight = await streamHighlight_model_1.StreamHighlightModel.findOne({ id: highlightId }).lean();
            if (existingHighlight?.thumbnailUrl) {
                existingThumbnailUrl = existingHighlight.thumbnailUrl;
                logger_1.logger.info('Found existing thumbnail, will not regenerate', {
                    highlightId,
                    existingThumbnailUrl,
                });
            }
            // Update highlight videoProcessingStatus to PROCESSING
            await streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlightId }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
            logger_1.logger.info('Updated highlight videoProcessingStatus to PROCESSING', { highlightId });
        }
        else if (reelId) {
            const existingReel = await reel_model_1.ReelModel.findOne({ id: reelId }).lean();
            if (existingReel?.thumbnailPath) {
                existingThumbnailUrl = existingReel.thumbnailPath;
                logger_1.logger.info('Found existing thumbnail, will not regenerate', {
                    reelId,
                    existingThumbnailUrl,
                });
            }
            // Update reel videoProcessingStatus to PROCESSING
            await reel_model_1.ReelModel.findOneAndUpdate({ id: reelId }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.PROCESSING }, { new: true });
            logger_1.logger.info('Updated reel videoProcessingStatus to PROCESSING', { reelId });
        }
        // Process the video using our existing function
        // Pass existing thumbnail URL to avoid regenerating if already exists
        const result = await (0, hlsVideoProcessor_service_1.processVideoToHLS)(videoUrl, folderPath, reelId, existingThumbnailUrl);
        // Update highlight or reel with processed video URLs and set status to COMPLETED
        if (highlightId) {
            // Construct permanent video URL: highlights/playasport-{highlightId}/playasport-{highlightId}.mp4
            // Extract file extension from original videoUrl
            const fileExtension = videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
            const permanentVideoUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/highlights/playasport-${highlightId}/playasport-${highlightId}.${fileExtension}`;
            const updateData = {
                videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
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
            await streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlightId }, { $set: updateData }, { new: true, runValidators: true });
            logger_1.logger.info('Updated highlight with processed video URLs, permanent videoUrl, and duration', {
                highlightId,
                permanentVideoUrl,
                thumbnailUpdated: !existingThumbnailUrl,
                duration: result.duration,
            });
        }
        else if (reelId) {
            // Construct permanent video URL: reels/playasport-{reelId}/playasport-{reelId}.mp4
            // Extract file extension from original videoUrl
            const fileExtension = videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
            const permanentVideoUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/reels/playasport-${reelId}/playasport-${reelId}.${fileExtension}`;
            const updateData = {
                videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
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
            await reel_model_1.ReelModel.findOneAndUpdate({ id: reelId }, { $set: updateData }, { new: true, runValidators: true });
            logger_1.logger.info('Updated reel with processed video URLs, permanent videoUrl', {
                reelId,
                permanentVideoUrl,
                thumbnailUpdated: !existingThumbnailUrl,
            });
        }
        logger_1.logger.info('Video processing completed', {
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
    }
    catch (error) {
        logger_1.logger.error('Error processing video job', {
            jobId: job.id,
            error: error instanceof Error ? error.message : error,
            data: job.data,
        });
        throw error;
    }
}, {
    connection,
    concurrency: env_1.config.videoProcessing.concurrency, // Number of videos to process simultaneously
});
// Handle worker events
exports.videoProcessingWorker.on('error', (error) => {
    logger_1.logger.error('Video processing worker error', { error });
});
exports.videoProcessingWorker.on('failed', async (job, error) => {
    logger_1.logger.error('Video processing job failed', {
        jobId: job?.id,
        error: error instanceof Error ? error.message : error,
        data: job?.data,
    });
    // Update highlight or reel videoProcessingStatus to FAILED
    // Note: This is a fallback - the main error handler in the worker function also updates the status
    if (job?.data) {
        const jobData = job.data;
        const highlightId = jobData.highlightId;
        const reelId = jobData.reelId;
        if (highlightId) {
            try {
                await streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate({ id: highlightId }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.FAILED }, { new: true });
                logger_1.logger.info('Updated highlight videoProcessingStatus to FAILED (from failed event)', {
                    highlightId,
                });
            }
            catch (updateError) {
                logger_1.logger.error('Failed to update highlight status on job failure', {
                    highlightId,
                    error: updateError,
                });
            }
        }
        else if (reelId) {
            try {
                await reel_model_1.ReelModel.findOneAndUpdate({ id: reelId }, { videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.FAILED }, { new: true });
                logger_1.logger.info('Updated reel videoProcessingStatus to FAILED (from failed event)', {
                    reelId,
                });
            }
            catch (updateError) {
                logger_1.logger.error('Failed to update reel status on job failure', {
                    reelId,
                    error: updateError,
                });
            }
        }
    }
});
exports.videoProcessingWorker.on('completed', (job) => {
    logger_1.logger.info('Video processing job completed', {
        jobId: job.id,
        data: job.data,
    });
});
exports.videoProcessingWorker.on('stalled', (jobId) => {
    logger_1.logger.warn('Video processing job stalled', { jobId });
});
exports.videoProcessingWorker.on('ready', () => {
    logger_1.logger.info('Video processing worker is ready', {
        queueName: videoProcessingQueue_1.VIDEO_PROCESSING_QUEUE_NAME,
        concurrency: env_1.config.videoProcessing.concurrency,
        connection: {
            host: env_1.config.redis.host,
            port: env_1.config.redis.port,
        },
    });
});
exports.videoProcessingWorker.on('closed', () => {
    logger_1.logger.warn('Video processing worker has been closed');
});
// Graceful shutdown
const closeVideoProcessingWorker = async () => {
    try {
        await exports.videoProcessingWorker.close();
        logger_1.logger.info('Video processing worker closed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error closing video processing worker', { error });
    }
};
exports.closeVideoProcessingWorker = closeVideoProcessingWorker;
//# sourceMappingURL=videoProcessingWorker.js.map