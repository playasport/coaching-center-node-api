"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeMeilisearchIndexingWorker = exports.meilisearchIndexingWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const meilisearchIndexingQueue_1 = require("./meilisearchIndexingQueue");
const indexing_service_1 = require("../services/meilisearch/indexing.service");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    ...env_1.config.redis.connection,
});
/**
 * Worker to process Meilisearch indexing jobs
 */
exports.meilisearchIndexingWorker = new bullmq_1.Worker(meilisearchIndexingQueue_1.MEILISEARCH_INDEXING_QUEUE_NAME, async (job) => {
    const { type, documentId } = job.data;
    logger_1.logger.info('Processing Meilisearch indexing job', {
        jobId: job.id,
        type,
        documentId,
    });
    try {
        // Check if Meilisearch is enabled
        if (!env_1.config.meilisearch.enabled) {
            logger_1.logger.info('Meilisearch is disabled, skipping indexing job', {
                jobId: job.id,
                type,
                documentId,
            });
            return;
        }
        // Process based on job type
        let success = false;
        switch (type) {
            case meilisearchIndexingQueue_1.IndexingJobType.INDEX_COACHING_CENTER:
            case meilisearchIndexingQueue_1.IndexingJobType.UPDATE_COACHING_CENTER:
                success = await indexing_service_1.meilisearchIndexing.indexCoachingCenter(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.DELETE_COACHING_CENTER:
                success = await indexing_service_1.meilisearchIndexing.deleteCoachingCenter(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.INDEX_SPORT:
            case meilisearchIndexingQueue_1.IndexingJobType.UPDATE_SPORT:
                success = await indexing_service_1.meilisearchIndexing.indexSport(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.DELETE_SPORT:
                success = await indexing_service_1.meilisearchIndexing.deleteSport(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.INDEX_REEL:
            case meilisearchIndexingQueue_1.IndexingJobType.UPDATE_REEL:
                success = await indexing_service_1.meilisearchIndexing.indexReel(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.DELETE_REEL:
                success = await indexing_service_1.meilisearchIndexing.deleteReel(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.INDEX_STREAM_HIGHLIGHT:
            case meilisearchIndexingQueue_1.IndexingJobType.UPDATE_STREAM_HIGHLIGHT:
                success = await indexing_service_1.meilisearchIndexing.indexStreamHighlight(documentId);
                break;
            case meilisearchIndexingQueue_1.IndexingJobType.DELETE_STREAM_HIGHLIGHT:
                success = await indexing_service_1.meilisearchIndexing.deleteStreamHighlight(documentId);
                break;
            default:
                logger_1.logger.warn('Unknown indexing job type', {
                    jobId: job.id,
                    type,
                    documentId,
                });
                throw new Error(`Unknown indexing job type: ${type}`);
        }
        if (success) {
            logger_1.logger.info('Meilisearch indexing job completed successfully', {
                jobId: job.id,
                type,
                documentId,
            });
        }
        else {
            logger_1.logger.warn('Meilisearch indexing job completed but returned false', {
                jobId: job.id,
                type,
                documentId,
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Meilisearch indexing job failed', {
            jobId: job.id,
            type,
            documentId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to trigger retry mechanism
    }
}, {
    connection,
    concurrency: Number(process.env.MEILISEARCH_INDEXING_CONCURRENCY || 5), // Process 5 jobs concurrently
    limiter: {
        max: 100, // Maximum 100 jobs
        duration: 1000, // Per second
    },
});
// Export function to close worker
const closeMeilisearchIndexingWorker = async () => {
    await exports.meilisearchIndexingWorker.close();
};
exports.closeMeilisearchIndexingWorker = closeMeilisearchIndexingWorker;
// Worker event handlers
exports.meilisearchIndexingWorker.on('completed', (job) => {
    logger_1.logger.debug('Meilisearch indexing job completed', {
        jobId: job.id,
        type: job.data.type,
        documentId: job.data.documentId,
    });
});
exports.meilisearchIndexingWorker.on('failed', (job, err) => {
    logger_1.logger.error('Meilisearch indexing job failed', {
        jobId: job?.id,
        type: job?.data.type,
        documentId: job?.data.documentId,
        error: err.message,
    });
});
exports.meilisearchIndexingWorker.on('error', (err) => {
    logger_1.logger.error('Meilisearch indexing worker error', {
        error: err.message,
        stack: err.stack,
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('Shutting down Meilisearch indexing worker...');
    await exports.meilisearchIndexingWorker.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('Shutting down Meilisearch indexing worker...');
    await exports.meilisearchIndexingWorker.close();
    process.exit(0);
});
//# sourceMappingURL=meilisearchIndexingWorker.js.map