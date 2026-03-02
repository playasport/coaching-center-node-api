"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePayoutStakeholderCreate = exports.payoutStakeholderQueue = exports.PAYOUT_STAKEHOLDER_QUEUE_NAME = void 0;
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
// Queue name for payout stakeholder creation
exports.PAYOUT_STAKEHOLDER_QUEUE_NAME = 'payout-stakeholder-create';
/**
 * Create the payout stakeholder creation queue
 * This queue handles creating stakeholders in Razorpay Linked Accounts
 */
exports.payoutStakeholderQueue = new bullmq_1.Queue(exports.PAYOUT_STAKEHOLDER_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 5, // More attempts for external API calls
        backoff: {
            type: 'exponential',
            delay: 3000, // Start with 3 seconds delay (3s, 6s, 12s, 24s, 48s)
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
 * Add stakeholder creation job to queue (non-blocking)
 * The job will be processed by the payout stakeholder worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
const enqueuePayoutStakeholderCreate = async (data) => {
    // Fire and forget - don't await, process in background
    exports.payoutStakeholderQueue
        .add('payout-stakeholder-create', {
        accountId: data.accountId,
        stakeholderData: data.stakeholderData,
        payoutAccountId: data.payoutAccountId,
        autoCreated: data.autoCreated,
        timestamp: data.timestamp || Date.now(),
    }, {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 3000,
        },
        // Add delay to allow Razorpay to process account creation first
        delay: 1000, // Wait 1 second before processing
    })
        .then((job) => {
        logger_1.logger.info('Payout stakeholder creation job added to queue (background)', {
            jobId: job.id,
            accountId: data.accountId,
            payoutAccountId: data.payoutAccountId,
            autoCreated: data.autoCreated,
        });
    })
        .catch((error) => {
        // Log error but don't throw - queue failures shouldn't break the main flow
        logger_1.logger.error('Failed to enqueue payout stakeholder creation job (non-blocking)', {
            accountId: data.accountId,
            payoutAccountId: data.payoutAccountId,
            error: error instanceof Error ? error.message : error,
        });
    });
};
exports.enqueuePayoutStakeholderCreate = enqueuePayoutStakeholderCreate;
//# sourceMappingURL=payoutStakeholderQueue.js.map