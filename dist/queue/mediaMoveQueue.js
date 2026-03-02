"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueMediaMove = exports.mediaMoveQueue = exports.MEDIA_MOVE_QUEUE_NAME = void 0;
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
// Queue name for media file moves
exports.MEDIA_MOVE_QUEUE_NAME = 'media-move-coaching-center';
/**
 * Create the media move queue
 * This queue handles moving files from temp to permanent locations for coaching centers
 */
exports.mediaMoveQueue = new bullmq_1.Queue(exports.MEDIA_MOVE_QUEUE_NAME, {
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
 * Add media move job to queue (non-blocking)
 * The job will be processed by the media move worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
const enqueueMediaMove = async (data) => {
    // Fire and forget - don't await, process in background
    exports.mediaMoveQueue.add('media-move-coaching-center', {
        coachingCenterId: data.coachingCenterId,
        fileUrls: data.fileUrls,
        timestamp: data.timestamp || Date.now(),
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    }).then((job) => {
        logger_1.logger.info('Media move job added to queue (background)', {
            jobId: job.id,
            coachingCenterId: data.coachingCenterId,
            fileCount: data.fileUrls.length,
        });
    }).catch((error) => {
        // Log error but don't throw - queue failures shouldn't break the main flow
        logger_1.logger.error('Failed to enqueue media move job (non-blocking)', {
            coachingCenterId: data.coachingCenterId,
            fileCount: data.fileUrls.length,
            error: error instanceof Error ? error.message : error,
        });
    });
};
exports.enqueueMediaMove = enqueueMediaMove;
//# sourceMappingURL=mediaMoveQueue.js.map