"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueThumbnailGeneration = exports.thumbnailWorker = exports.thumbnailQueue = exports.THUMBNAIL_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const mongoose_1 = require("mongoose");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const videoThumbnail_service_1 = require("../services/common/videoThumbnail.service");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
// Helper to get query by ID (supports both MongoDB ObjectId and custom UUID id)
const getQueryById = (id) => {
    return mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
};
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    ...env_1.config.redis.connection,
});
// Queue name
exports.THUMBNAIL_QUEUE_NAME = 'thumbnail-generation';
/**
 * Create the thumbnail generation queue
 */
exports.thumbnailQueue = new bullmq_1.Queue(exports.THUMBNAIL_QUEUE_NAME, {
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
exports.thumbnailWorker = new bullmq_1.Worker(exports.THUMBNAIL_QUEUE_NAME, async (job) => {
    const { coachingCenterId, videoUrl, videoUniqueId, sportDetailIndex, videoIndex } = job.data;
    logger_1.logger.info('Processing thumbnail generation job', {
        jobId: job.id,
        coachingCenterId,
        videoUrl,
        sportDetailIndex,
        videoIndex,
    });
    try {
        // Fetch current video URL from database (in case file was moved from temp to permanent)
        let currentVideoUrl = videoUrl;
        try {
            const query = getQueryById(coachingCenterId);
            const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query).lean();
            if (coachingCenter && coachingCenter.sport_details && sportDetailIndex !== undefined) {
                const sportDetail = coachingCenter.sport_details[sportDetailIndex];
                if (sportDetail && sportDetail.videos && videoIndex !== undefined) {
                    const video = sportDetail.videos[videoIndex];
                    if (video && video.unique_id === videoUniqueId && video.url) {
                        currentVideoUrl = video.url;
                        if (currentVideoUrl !== videoUrl) {
                            logger_1.logger.info('Video URL updated from database (file was moved)', {
                                jobId: job.id,
                                oldUrl: videoUrl,
                                newUrl: currentVideoUrl,
                            });
                        }
                    }
                }
            }
        }
        catch (fetchError) {
            logger_1.logger.warn('Failed to fetch current video URL from database, using job URL', {
                jobId: job.id,
                error: fetchError instanceof Error ? fetchError.message : fetchError,
            });
            // Continue with original videoUrl if fetch fails
        }
        // Generate thumbnail using current URL from database
        const thumbnailUrl = await (0, videoThumbnail_service_1.generateVideoThumbnail)(currentVideoUrl);
        logger_1.logger.info('Thumbnail generated successfully', {
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
                // Use getQueryById helper to handle both ObjectId and UUID string
                const query = getQueryById(coachingCenterId);
                const result = await coachingCenter_model_1.CoachingCenterModel.findOneAndUpdate(query, {
                    $set: {
                        [`sport_details.${sportDetailIndex}.videos.${videoIndex}.thumbnail`]: thumbnailUrl,
                    },
                }, {
                    new: true,
                    runValidators: false, // Skip validators for performance
                });
                if (result) {
                    // Verify the update worked by checking the returned document
                    const updatedVideo = result.sport_details?.[sportDetailIndex]?.videos?.[videoIndex];
                    if (updatedVideo && updatedVideo.thumbnail === thumbnailUrl) {
                        updateSuccess = true;
                        logger_1.logger.info('Coaching center updated with thumbnail URL (using indices, verified)', {
                            jobId: job.id,
                            coachingCenterId,
                            thumbnailUrl,
                            sportDetailIndex,
                            videoIndex,
                        });
                    }
                    else {
                        logger_1.logger.warn('Update query succeeded but thumbnail not found in returned document', {
                            jobId: job.id,
                            coachingCenterId,
                            sportDetailIndex,
                            videoIndex,
                            expectedThumbnail: thumbnailUrl,
                            actualThumbnail: updatedVideo?.thumbnail,
                        });
                    }
                }
                else {
                    logger_1.logger.warn('Coaching center not found for thumbnail update', {
                        jobId: job.id,
                        coachingCenterId,
                        sportDetailIndex,
                        videoIndex,
                    });
                }
            }
            catch (updateError) {
                logger_1.logger.error('Failed to update thumbnail using indices', {
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
                // Use getQueryById helper to handle both ObjectId and UUID string
                const query = getQueryById(coachingCenterId);
                const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query);
                if (!coachingCenter) {
                    logger_1.logger.warn('Coaching center not found for thumbnail update', {
                        jobId: job.id,
                        coachingCenterId,
                        videoUrl,
                        videoUniqueId,
                    });
                }
                else if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
                    // Find the video and update directly in the document
                    let found = false;
                    for (let i = 0; i < coachingCenter.sport_details.length; i++) {
                        const sportDetail = coachingCenter.sport_details[i];
                        if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                            for (let j = 0; j < sportDetail.videos.length; j++) {
                                const video = sportDetail.videos[j];
                                // Match by URL or unique_id
                                if ((video.url === videoUrl || video.url?.includes(videoUrl)) ||
                                    (videoUniqueId && video.unique_id === videoUniqueId)) {
                                    try {
                                        // Update the video thumbnail directly in the document
                                        coachingCenter.sport_details[i].videos[j].thumbnail = thumbnailUrl;
                                        // Mark the specific path as modified for Mongoose
                                        coachingCenter.markModified(`sport_details.${i}.videos.${j}.thumbnail`);
                                        // Save the document
                                        await coachingCenter.save({ validateBeforeSave: false });
                                        // Verify the update by refetching
                                        const query = getQueryById(coachingCenterId);
                                        const updatedDoc = await coachingCenter_model_1.CoachingCenterModel.findOne(query).lean();
                                        const updatedVideo = updatedDoc?.sport_details?.[i]?.videos?.[j];
                                        if (updatedVideo && updatedVideo.thumbnail === thumbnailUrl) {
                                            updateSuccess = true;
                                            logger_1.logger.info('Coaching center updated with thumbnail URL (verified)', {
                                                jobId: job.id,
                                                coachingCenterId,
                                                thumbnailUrl,
                                                sportDetailIndex: i,
                                                videoIndex: j,
                                                videoUrl: video.url,
                                                videoUniqueId: video.unique_id,
                                            });
                                        }
                                        else {
                                            logger_1.logger.warn('Thumbnail update saved but verification failed', {
                                                jobId: job.id,
                                                coachingCenterId,
                                                expectedThumbnail: thumbnailUrl,
                                                actualThumbnail: updatedVideo?.thumbnail,
                                            });
                                        }
                                        found = true;
                                        break;
                                    }
                                    catch (updateError) {
                                        logger_1.logger.error('Failed to update thumbnail in document', {
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
                        logger_1.logger.warn('Could not find video to update thumbnail', {
                            jobId: job.id,
                            coachingCenterId,
                            videoUrl,
                            videoUniqueId,
                            sportDetailsCount: coachingCenter.sport_details.length,
                        });
                    }
                }
                else {
                    logger_1.logger.warn('Coaching center has no sport_details array', {
                        jobId: job.id,
                        coachingCenterId,
                    });
                }
            }
            catch (findError) {
                logger_1.logger.error('Failed to find coaching center for thumbnail update', {
                    jobId: job.id,
                    coachingCenterId,
                    error: findError instanceof Error ? findError.message : findError,
                    stack: findError instanceof Error ? findError.stack : undefined,
                });
            }
        }
        if (!updateSuccess) {
            logger_1.logger.error('Thumbnail generated but database update failed', {
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
    }
    catch (error) {
        logger_1.logger.error('Thumbnail generation job failed', {
            jobId: job.id,
            coachingCenterId,
            videoUrl,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to mark job as failed
    }
}, {
    connection,
    concurrency: 3, // Process 3 jobs concurrently
    limiter: {
        max: 10, // Maximum 10 jobs
        duration: 60000, // per 60 seconds
    },
});
// Worker event handlers
exports.thumbnailWorker.on('completed', (job) => {
    logger_1.logger.info('Thumbnail generation job completed', {
        jobId: job.id,
        coachingCenterId: job.data.coachingCenterId,
    });
});
exports.thumbnailWorker.on('failed', (job, err) => {
    logger_1.logger.error('Thumbnail generation job failed', {
        jobId: job?.id,
        coachingCenterId: job?.data?.coachingCenterId,
        error: err.message,
        attemptsMade: job?.attemptsMade,
    });
});
exports.thumbnailWorker.on('error', (err) => {
    logger_1.logger.error('Thumbnail worker error', {
        error: err.message,
        stack: err.stack,
    });
});
/**
 * Add thumbnail generation job to queue
 */
const enqueueThumbnailGeneration = async (coachingCenterId, videoUrl, options) => {
    try {
        await exports.thumbnailQueue.add('generate-thumbnail', {
            coachingCenterId,
            videoUrl,
            videoUniqueId: options?.videoUniqueId,
            sportDetailIndex: options?.sportDetailIndex,
            videoIndex: options?.videoIndex,
        }, {
            priority: 1, // Normal priority
        });
        logger_1.logger.info('Thumbnail generation job added to queue', {
            coachingCenterId,
            videoUrl,
            options,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to enqueue thumbnail generation job', {
            coachingCenterId,
            videoUrl,
            error: error instanceof Error ? error.message : error,
        });
        // Don't throw - queue failures shouldn't break the main flow
    }
};
exports.enqueueThumbnailGeneration = enqueueThumbnailGeneration;
//# sourceMappingURL=thumbnailQueue.js.map