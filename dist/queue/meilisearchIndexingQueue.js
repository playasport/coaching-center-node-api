"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueMeilisearchIndexing = exports.meilisearchIndexingQueue = exports.IndexingJobType = exports.MEILISEARCH_INDEXING_QUEUE_NAME = void 0;
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
// Queue name
exports.MEILISEARCH_INDEXING_QUEUE_NAME = 'meilisearch-indexing';
// Indexing job types
var IndexingJobType;
(function (IndexingJobType) {
    IndexingJobType["INDEX_COACHING_CENTER"] = "index_coaching_center";
    IndexingJobType["UPDATE_COACHING_CENTER"] = "update_coaching_center";
    IndexingJobType["DELETE_COACHING_CENTER"] = "delete_coaching_center";
    IndexingJobType["INDEX_SPORT"] = "index_sport";
    IndexingJobType["UPDATE_SPORT"] = "update_sport";
    IndexingJobType["DELETE_SPORT"] = "delete_sport";
    IndexingJobType["INDEX_REEL"] = "index_reel";
    IndexingJobType["UPDATE_REEL"] = "update_reel";
    IndexingJobType["DELETE_REEL"] = "delete_reel";
    IndexingJobType["INDEX_STREAM_HIGHLIGHT"] = "index_stream_highlight";
    IndexingJobType["UPDATE_STREAM_HIGHLIGHT"] = "update_stream_highlight";
    IndexingJobType["DELETE_STREAM_HIGHLIGHT"] = "delete_stream_highlight";
})(IndexingJobType || (exports.IndexingJobType = IndexingJobType = {}));
/**
 * Create the Meilisearch indexing queue
 */
exports.meilisearchIndexingQueue = new bullmq_1.Queue(exports.MEILISEARCH_INDEXING_QUEUE_NAME, {
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
 * Enqueue a Meilisearch indexing job
 */
const enqueueMeilisearchIndexing = async (type, documentId) => {
    if (!env_1.config.meilisearch.enabled) {
        return; // Skip if Meilisearch is disabled
    }
    try {
        await exports.meilisearchIndexingQueue.add(type, {
            type,
            documentId,
            timestamp: Date.now(),
        }, {
            jobId: `${type}:${documentId}`, // Unique job ID to prevent duplicates
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });
        logger_1.logger.debug('Meilisearch indexing job enqueued', {
            type,
            documentId,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to enqueue Meilisearch indexing job', {
            type,
            documentId,
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.enqueueMeilisearchIndexing = enqueueMeilisearchIndexing;
//# sourceMappingURL=meilisearchIndexingQueue.js.map