"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueVideoProcessing = exports.videoProcessingQueue = exports.VIDEO_PROCESSING_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    ...env_1.config.redis.connection,
});
// Queue name - using the same queue name as your video converter server
exports.VIDEO_PROCESSING_QUEUE_NAME = 'video-processing-reel';
/**
 * Create the video processing queue
 * This uses the same queue that your video converter server processes
 */
exports.videoProcessingQueue = new bullmq_1.Queue(exports.VIDEO_PROCESSING_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
/**
 * Add video processing job to queue (non-blocking)
 * The job will be processed by your existing video converter server worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
const enqueueVideoProcessing = async (data) => {
    // Generate folder path if not provided
    const folderPath = data.folderPath ||
        (data.type === 'highlight'
            ? `highlights/playasport-${data.highlightId || 'temp'}`
            : `reels/playasport-${data.reelId || 'temp'}`);
    // Use reelId for both highlights and reels (as per your video converter server structure)
    const reelId = data.reelId || data.highlightId || '';
    // Fire and forget - don't await, process in background
    exports.videoProcessingQueue.add('video-processing-reel', {
        reelId,
        videoUrl: data.videoUrl,
        folderPath,
        type: data.type,
        highlightId: data.highlightId,
        timestamp: data.timestamp || Date.now(),
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    }).then((job) => {
        logger_1.logger.info('Video processing job added to queue (background)', {
            jobId: job.id,
            highlightId: data.highlightId,
            reelId: data.reelId,
            videoUrl: data.videoUrl,
            type: data.type,
            folderPath,
        });
    }).catch((error) => {
        // Log error but don't throw - queue failures shouldn't break the main flow
        logger_1.logger.error('Failed to enqueue video processing job (non-blocking)', {
            highlightId: data.highlightId,
            reelId: data.reelId,
            error: error instanceof Error ? error.message : error,
        });
    });
};
exports.enqueueVideoProcessing = enqueueVideoProcessing;
//# sourceMappingURL=videoProcessingQueue.js.map