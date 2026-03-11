"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanQueue = exports.resumeQueue = exports.pauseQueue = exports.removeJob = exports.retryJob = exports.getQueueJob = exports.getQueueJobs = exports.getAllQueues = void 0;
const thumbnailQueue_1 = require("../../queue/thumbnailQueue");
const videoProcessingQueue_1 = require("../../queue/videoProcessingQueue");
const mediaMoveQueue_1 = require("../../queue/mediaMoveQueue");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
/**
 * Normalize job progress to a 0-100 number for progress bar display.
 * Handles: number, object with percent/percentage/step+totalSteps, and job state (completed=100).
 */
function normalizeProgressPercent(state, progress) {
    if (state === 'completed')
        return 100;
    if (state === 'failed' || state === 'delayed')
        return 0;
    if (typeof progress === 'number' && !Number.isNaN(progress)) {
        return Math.min(100, Math.max(0, Math.round(progress)));
    }
    if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
        const p = progress;
        if (typeof p.percent === 'number')
            return Math.min(100, Math.max(0, Math.round(p.percent)));
        if (typeof p.percentage === 'number')
            return Math.min(100, Math.max(0, Math.round(p.percentage)));
        if (typeof p.progress === 'number')
            return Math.min(100, Math.max(0, Math.round(p.progress)));
        if (typeof p.step === 'number' && typeof p.totalSteps === 'number' && p.totalSteps > 0) {
            return Math.min(100, Math.round((p.step / p.totalSteps) * 100));
        }
    }
    return 0;
}
/**
 * Get all queues with their statistics
 */
const getAllQueues = async () => {
    try {
        const queues = [];
        // Get thumbnail queue stats
        try {
            const [thumbnailActive, thumbnailWaiting, thumbnailCompleted, thumbnailFailed, thumbnailDelayed, thumbnailPaused,] = await Promise.all([
                thumbnailQueue_1.thumbnailQueue.getActiveCount(),
                thumbnailQueue_1.thumbnailQueue.getWaitingCount(),
                thumbnailQueue_1.thumbnailQueue.getCompletedCount(),
                thumbnailQueue_1.thumbnailQueue.getFailedCount(),
                thumbnailQueue_1.thumbnailQueue.getDelayedCount(),
                thumbnailQueue_1.thumbnailQueue.isPaused(),
            ]);
            queues.push({
                name: thumbnailQueue_1.THUMBNAIL_QUEUE_NAME,
                active: thumbnailActive,
                waiting: thumbnailWaiting,
                completed: thumbnailCompleted,
                failed: thumbnailFailed,
                delayed: thumbnailDelayed,
                paused: thumbnailPaused,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get thumbnail queue stats', { error });
        }
        // Get video processing queue stats
        try {
            const [videoActive, videoWaiting, videoCompleted, videoFailed, videoDelayed, videoPaused,] = await Promise.all([
                videoProcessingQueue_1.videoProcessingQueue.getActiveCount(),
                videoProcessingQueue_1.videoProcessingQueue.getWaitingCount(),
                videoProcessingQueue_1.videoProcessingQueue.getCompletedCount(),
                videoProcessingQueue_1.videoProcessingQueue.getFailedCount(),
                videoProcessingQueue_1.videoProcessingQueue.getDelayedCount(),
                videoProcessingQueue_1.videoProcessingQueue.isPaused(),
            ]);
            queues.push({
                name: videoProcessingQueue_1.VIDEO_PROCESSING_QUEUE_NAME,
                active: videoActive,
                waiting: videoWaiting,
                completed: videoCompleted,
                failed: videoFailed,
                delayed: videoDelayed,
                paused: videoPaused,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get video processing queue stats', { error });
        }
        // Get media move queue stats
        try {
            const [mediaMoveActive, mediaMoveWaiting, mediaMoveCompleted, mediaMoveFailed, mediaMoveDelayed, mediaMovePaused,] = await Promise.all([
                mediaMoveQueue_1.mediaMoveQueue.getActiveCount(),
                mediaMoveQueue_1.mediaMoveQueue.getWaitingCount(),
                mediaMoveQueue_1.mediaMoveQueue.getCompletedCount(),
                mediaMoveQueue_1.mediaMoveQueue.getFailedCount(),
                mediaMoveQueue_1.mediaMoveQueue.getDelayedCount(),
                mediaMoveQueue_1.mediaMoveQueue.isPaused(),
            ]);
            queues.push({
                name: mediaMoveQueue_1.MEDIA_MOVE_QUEUE_NAME,
                active: mediaMoveActive,
                waiting: mediaMoveWaiting,
                completed: mediaMoveCompleted,
                failed: mediaMoveFailed,
                delayed: mediaMoveDelayed,
                paused: mediaMovePaused,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get media move queue stats', { error });
        }
        return {
            queues,
            totalQueues: queues.length,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get all queues', { error });
        throw new ApiError_1.ApiError(500, 'Failed to retrieve queue information');
    }
};
exports.getAllQueues = getAllQueues;
/**
 * Get queue by name
 */
const getQueueByName = (queueName) => {
    switch (queueName) {
        case thumbnailQueue_1.THUMBNAIL_QUEUE_NAME:
            return thumbnailQueue_1.thumbnailQueue;
        case videoProcessingQueue_1.VIDEO_PROCESSING_QUEUE_NAME:
            return videoProcessingQueue_1.videoProcessingQueue;
        case mediaMoveQueue_1.MEDIA_MOVE_QUEUE_NAME:
            return mediaMoveQueue_1.mediaMoveQueue;
        default:
            throw new ApiError_1.ApiError(404, `Queue not found: ${queueName}`);
    }
};
/**
 * Get jobs from a specific queue
 */
const getQueueJobs = async (queueName, status = 'all', page = 1, limit = 50) => {
    try {
        const queue = getQueueByName(queueName);
        const pageNumber = Math.max(1, page);
        const pageSize = Math.min(100, Math.max(1, limit));
        const skip = (pageNumber - 1) * pageSize;
        let jobs = [];
        let total = 0;
        switch (status) {
            case 'active':
                jobs = await queue.getActive();
                total = await queue.getActiveCount();
                break;
            case 'waiting':
                jobs = await queue.getWaiting();
                total = await queue.getWaitingCount();
                break;
            case 'completed':
                jobs = await queue.getCompleted();
                total = await queue.getCompletedCount();
                break;
            case 'failed':
                jobs = await queue.getFailed();
                total = await queue.getFailedCount();
                break;
            case 'delayed':
                jobs = await queue.getDelayed();
                total = await queue.getDelayedCount();
                break;
            case 'all':
            default:
                const [active, waiting, completed, failed, delayed] = await Promise.all([
                    queue.getActive(),
                    queue.getWaiting(),
                    queue.getCompleted(),
                    queue.getFailed(),
                    queue.getDelayed(),
                ]);
                jobs = [...active, ...waiting, ...completed, ...failed, ...delayed];
                total = jobs.length;
                break;
        }
        // Sort by timestamp (newest first)
        jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        // Paginate
        const paginatedJobs = jobs.slice(skip, skip + pageSize);
        // Format jobs (with normalized progress for progress bar)
        const formattedJobs = await Promise.all(paginatedJobs.map(async (job) => {
            const state = await job.getState();
            const progress = job.progress ?? 0;
            const progressPercent = normalizeProgressPercent(state, progress);
            return {
                id: job.id || '',
                name: job.name || '',
                data: job.data,
                state,
                progress,
                progressPercent,
                timestamp: job.timestamp || 0,
                processedOn: job.processedOn || null,
                finishedOn: job.finishedOn || null,
                failedReason: job.failedReason || null,
                returnvalue: job.returnvalue || null,
                attemptsMade: job.attemptsMade || 0,
                attempts: job.opts?.attempts || 0,
            };
        }));
        return {
            jobs: formattedJobs,
            total,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get queue jobs', { queueName, status, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to retrieve queue jobs');
    }
};
exports.getQueueJobs = getQueueJobs;
/**
 * Get a specific job by ID
 */
const getQueueJob = async (queueName, jobId) => {
    try {
        const queue = getQueueByName(queueName);
        const job = await queue.getJob(jobId);
        if (!job) {
            return null;
        }
        const state = await job.getState();
        const progress = job.progress ?? 0;
        const progressPercent = normalizeProgressPercent(state, progress);
        return {
            id: job.id || '',
            name: job.name || '',
            data: job.data,
            state,
            progress,
            progressPercent,
            timestamp: job.timestamp || 0,
            processedOn: job.processedOn || null,
            finishedOn: job.finishedOn || null,
            failedReason: job.failedReason || null,
            returnvalue: job.returnvalue || null,
            attemptsMade: job.attemptsMade || 0,
            attempts: job.opts?.attempts || 0,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get queue job', { queueName, jobId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to retrieve queue job');
    }
};
exports.getQueueJob = getQueueJob;
/**
 * Retry a failed job
 */
const retryJob = async (queueName, jobId) => {
    try {
        const queue = getQueueByName(queueName);
        const job = await queue.getJob(jobId);
        if (!job) {
            throw new ApiError_1.ApiError(404, 'Job not found');
        }
        await job.retry();
        logger_1.logger.info('Job retried', { queueName, jobId });
    }
    catch (error) {
        logger_1.logger.error('Failed to retry job', { queueName, jobId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to retry job');
    }
};
exports.retryJob = retryJob;
/**
 * Remove a job
 */
const removeJob = async (queueName, jobId) => {
    try {
        const queue = getQueueByName(queueName);
        const job = await queue.getJob(jobId);
        if (!job) {
            throw new ApiError_1.ApiError(404, 'Job not found');
        }
        await job.remove();
        logger_1.logger.info('Job removed', { queueName, jobId });
    }
    catch (error) {
        logger_1.logger.error('Failed to remove job', { queueName, jobId, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to remove job');
    }
};
exports.removeJob = removeJob;
/**
 * Pause a queue
 */
const pauseQueue = async (queueName) => {
    try {
        const queue = getQueueByName(queueName);
        await queue.pause();
        logger_1.logger.info('Queue paused', { queueName });
    }
    catch (error) {
        logger_1.logger.error('Failed to pause queue', { queueName, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to pause queue');
    }
};
exports.pauseQueue = pauseQueue;
/**
 * Resume a queue
 */
const resumeQueue = async (queueName) => {
    try {
        const queue = getQueueByName(queueName);
        await queue.resume();
        logger_1.logger.info('Queue resumed', { queueName });
    }
    catch (error) {
        logger_1.logger.error('Failed to resume queue', { queueName, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to resume queue');
    }
};
exports.resumeQueue = resumeQueue;
/**
 * Clean a queue (remove completed/failed jobs)
 */
const cleanQueue = async (queueName, grace = 1000, limit = 1000) => {
    try {
        const queue = getQueueByName(queueName);
        // Clean completed and failed jobs
        const [completedCleaned, failedCleaned] = await Promise.all([
            queue.clean(grace, limit, 'completed'),
            queue.clean(grace, limit, 'failed'),
        ]);
        const totalCleaned = completedCleaned.length + failedCleaned.length;
        logger_1.logger.info('Queue cleaned', { queueName, completedCleaned: completedCleaned.length, failedCleaned: failedCleaned.length });
        return totalCleaned;
    }
    catch (error) {
        logger_1.logger.error('Failed to clean queue', { queueName, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to clean queue');
    }
};
exports.cleanQueue = cleanQueue;
//# sourceMappingURL=queue.service.js.map