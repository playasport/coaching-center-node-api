"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePayoutTransfer = exports.payoutTransferQueue = exports.PAYOUT_TRANSFER_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    ...env_1.config.redis.connection,
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    maxRetriesPerRequest: null, // Required by BullMQ for blocking operations - must be after spread
});
// Queue name for payout transfer processing
exports.PAYOUT_TRANSFER_QUEUE_NAME = 'payout-transfer';
/**
 * Create the payout transfer queue
 * This queue handles processing transfers to academy Razorpay accounts
 */
exports.payoutTransferQueue = new bullmq_1.Queue(exports.PAYOUT_TRANSFER_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
    },
});
/**
 * Add payout transfer job to queue (non-blocking)
 * The job will be processed by the payout transfer worker in the background
 */
const enqueuePayoutTransfer = async (data) => {
    try {
        await exports.payoutTransferQueue.add('payout-transfer', {
            ...data,
            timestamp: Date.now(),
        }, {
            jobId: `transfer-${data.payoutId}`, // Unique job ID to prevent duplicates
            removeOnComplete: { age: 24 * 3600, count: 1000 },
            removeOnFail: { age: 7 * 24 * 3600 },
        });
        logger_1.logger.info('Payout transfer job added to queue (background)', {
            payoutId: data.payoutId,
            accountId: data.accountId,
            amount: data.amount,
        });
    }
    catch (error) {
        // Log error but don't throw - queue failures shouldn't break the main flow
        logger_1.logger.error('Failed to enqueue payout transfer job (non-blocking)', {
            error: error.message || error,
            payoutId: data.payoutId,
        });
    }
};
exports.enqueuePayoutTransfer = enqueuePayoutTransfer;
//# sourceMappingURL=payoutTransferQueue.js.map