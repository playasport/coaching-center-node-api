"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePayoutBankDetailsUpdate = exports.payoutBankDetailsQueue = exports.PAYOUT_BANK_DETAILS_QUEUE_NAME = void 0;
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
// Queue name for payout bank details updates
exports.PAYOUT_BANK_DETAILS_QUEUE_NAME = 'payout-bank-details-update';
/**
 * Create the payout bank details update queue
 * This queue handles updating bank details in Razorpay product configuration
 */
exports.payoutBankDetailsQueue = new bullmq_1.Queue(exports.PAYOUT_BANK_DETAILS_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 5, // More attempts for external API calls
        backoff: {
            type: 'exponential',
            delay: 3000, // Start with 3 seconds delay (2s, 4s, 8s, 16s, 32s)
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
 * Add bank details update job to queue (non-blocking)
 * The job will be processed by the payout bank details worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
const enqueuePayoutBankDetailsUpdate = async (data) => {
    // Fire and forget - don't await, process in background
    exports.payoutBankDetailsQueue
        .add('payout-bank-details-update', {
        accountId: data.accountId,
        productConfigId: data.productConfigId,
        bankDetails: data.bankDetails,
        payoutAccountId: data.payoutAccountId,
        timestamp: data.timestamp || Date.now(),
    }, {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 3000,
        },
        // Add delay to allow Razorpay to process product configuration first
        delay: 2000, // Wait 2 seconds before processing
    })
        .then((job) => {
        logger_1.logger.info('Payout bank details update job added to queue (background)', {
            jobId: job.id,
            accountId: data.accountId,
            payoutAccountId: data.payoutAccountId,
            productConfigId: data.productConfigId,
        });
    })
        .catch((error) => {
        // Log error but don't throw - queue failures shouldn't break the main flow
        logger_1.logger.error('Failed to enqueue payout bank details update job (non-blocking)', {
            accountId: data.accountId,
            payoutAccountId: data.payoutAccountId,
            productConfigId: data.productConfigId,
            error: error instanceof Error ? error.message : error,
        });
    });
};
exports.enqueuePayoutBankDetailsUpdate = enqueuePayoutBankDetailsUpdate;
//# sourceMappingURL=payoutBankDetailsQueue.js.map