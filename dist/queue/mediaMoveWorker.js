"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeMediaMoveWorker = exports.mediaMoveWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const mediaMoveQueue_1 = require("./mediaMoveQueue");
const commonService = __importStar(require("../services/common/coachingCenterCommon.service"));
const coachingCenter_model_1 = require("../models/coachingCenter.model");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    ...env_1.config.redis.connection,
});
// Get concurrency from environment variable (default: 2)
const MEDIA_MOVE_CONCURRENCY = Number(process.env.MEDIA_MOVE_CONCURRENCY || 2);
/**
 * Create worker for processing media move jobs
 * This worker moves files from temp to permanent locations for coaching centers
 */
exports.mediaMoveWorker = new bullmq_1.Worker(mediaMoveQueue_1.MEDIA_MOVE_QUEUE_NAME, async (job) => {
    try {
        logger_1.logger.info('Received media move job', {
            jobId: job.id,
            coachingCenterId: job.data.coachingCenterId,
            fileCount: job.data.fileUrls.length,
        });
        const { coachingCenterId, fileUrls } = job.data;
        // Validate required fields
        if (!coachingCenterId || !fileUrls || fileUrls.length === 0) {
            const error = new Error('Missing required fields in job data');
            logger_1.logger.error('Job data validation failed', {
                coachingCenterId,
                fileCount: fileUrls?.length || 0,
                rawData: job.data,
            });
            throw error;
        }
        logger_1.logger.info('Starting media move job', {
            coachingCenterId,
            fileCount: fileUrls.length,
        });
        // Fetch the coaching center to get the full object
        const query = commonService.getQueryById(coachingCenterId);
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne(query).lean();
        if (!coachingCenter) {
            const error = new Error(`Coaching center with ID ${coachingCenterId} not found`);
            logger_1.logger.error('Coaching center not found for media move', {
                coachingCenterId,
            });
            throw error;
        }
        // Move media files to permanent location
        // This function handles all the file moving and database updates
        await commonService.moveMediaFilesToPermanent(coachingCenter);
        logger_1.logger.info('Media move job completed successfully', {
            jobId: job.id,
            coachingCenterId,
            fileCount: fileUrls.length,
        });
        return {
            success: true,
            coachingCenterId,
            filesMoved: fileUrls.length,
        };
    }
    catch (error) {
        logger_1.logger.error('Media move job failed', {
            jobId: job.id,
            coachingCenterId: job.data.coachingCenterId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to trigger retry mechanism
    }
}, {
    concurrency: MEDIA_MOVE_CONCURRENCY,
    connection,
});
// Worker event handlers
exports.mediaMoveWorker.on('error', (error) => {
    logger_1.logger.error('Media move worker error', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
    });
});
exports.mediaMoveWorker.on('failed', async (job, error) => {
    logger_1.logger.error('Media move job failed permanently', {
        jobId: job?.id,
        coachingCenterId: job?.data?.coachingCenterId,
        attempts: job?.attemptsMade,
        error: error instanceof Error ? error.message : error,
    });
});
exports.mediaMoveWorker.on('completed', (job) => {
    logger_1.logger.info('Media move job completed', {
        jobId: job.id,
        coachingCenterId: job.data.coachingCenterId,
        fileCount: job.data.fileUrls.length,
    });
});
exports.mediaMoveWorker.on('stalled', (jobId) => {
    logger_1.logger.warn('Media move job stalled', { jobId });
});
exports.mediaMoveWorker.on('ready', () => {
    logger_1.logger.info('Media move worker ready', {
        concurrency: MEDIA_MOVE_CONCURRENCY,
        queueName: mediaMoveQueue_1.MEDIA_MOVE_QUEUE_NAME,
    });
});
exports.mediaMoveWorker.on('closed', () => {
    logger_1.logger.info('Media move worker closed');
});
/**
 * Close the media move worker gracefully
 */
const closeMediaMoveWorker = async () => {
    try {
        await exports.mediaMoveWorker.close();
        logger_1.logger.info('Media move worker closed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error closing media move worker', {
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.closeMediaMoveWorker = closeMediaMoveWorker;
//# sourceMappingURL=mediaMoveWorker.js.map