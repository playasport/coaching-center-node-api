"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePayoutStakeholderWorker = exports.payoutStakeholderWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const payoutStakeholderQueue_1 = require("./payoutStakeholderQueue");
const razorpayRoute_service_1 = require("../services/common/payment/razorpayRoute.service");
const academyPayoutAccount_model_1 = require("../models/academyPayoutAccount.model");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    ...env_1.config.redis.connection,
});
// Get concurrency from environment variable (default: 2)
const PAYOUT_STAKEHOLDER_CONCURRENCY = Number(process.env.PAYOUT_STAKEHOLDER_CONCURRENCY || 2);
/**
 * Create worker for processing payout stakeholder creation jobs
 * This worker creates stakeholders in Razorpay Linked Accounts
 */
exports.payoutStakeholderWorker = new bullmq_1.Worker(payoutStakeholderQueue_1.PAYOUT_STAKEHOLDER_QUEUE_NAME, async (job) => {
    try {
        logger_1.logger.info('Received payout stakeholder creation job', {
            jobId: job.id,
            accountId: job.data.accountId,
            payoutAccountId: job.data.payoutAccountId,
            autoCreated: job.data.autoCreated,
        });
        const { accountId, stakeholderData, payoutAccountId } = job.data;
        // Validate required fields
        if (!accountId || !stakeholderData || !payoutAccountId) {
            const error = new Error('Missing required fields in job data');
            logger_1.logger.error('Job data validation failed', {
                accountId,
                payoutAccountId,
                hasStakeholderData: !!stakeholderData,
                rawData: job.data,
            });
            throw error;
        }
        // Validate stakeholder data
        if (!stakeholderData.name ||
            !stakeholderData.email ||
            !stakeholderData.phone ||
            !stakeholderData.relationship ||
            !stakeholderData.kyc?.pan) {
            const error = new Error('Missing required stakeholder details');
            logger_1.logger.error('Stakeholder data validation failed', {
                accountId,
                payoutAccountId,
                stakeholderData: {
                    hasName: !!stakeholderData.name,
                    hasEmail: !!stakeholderData.email,
                    hasPhone: !!stakeholderData.phone,
                    hasRelationship: !!stakeholderData.relationship,
                    hasPan: !!stakeholderData.kyc?.pan,
                },
            });
            throw error;
        }
        logger_1.logger.info('Starting payout stakeholder creation job', {
            accountId,
            payoutAccountId,
            relationship: stakeholderData.relationship,
            autoCreated: job.data.autoCreated,
        });
        // Create stakeholder in Razorpay
        const stakeholder = await razorpayRoute_service_1.razorpayRouteService.createStakeholder(accountId, stakeholderData);
        // Update database to store stakeholder ID
        const updatedAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOneAndUpdate({ id: payoutAccountId }, {
            $set: {
                stakeholder_id: stakeholder.id,
                updatedAt: new Date(),
            },
        }, { new: true });
        if (!updatedAccount) {
            logger_1.logger.error('Payout account not found after stakeholder creation - stakeholder ID not saved', {
                payoutAccountId,
                accountId,
                stakeholderId: stakeholder.id,
            });
            throw new Error(`Payout account with ID ${payoutAccountId} not found. Stakeholder ID ${stakeholder.id} was created but not saved to database.`);
        }
        // Verify that stakeholder_id was actually updated
        if (updatedAccount.stakeholder_id !== stakeholder.id) {
            logger_1.logger.error('Stakeholder ID mismatch after database update', {
                payoutAccountId,
                accountId,
                expectedStakeholderId: stakeholder.id,
                actualStakeholderId: updatedAccount.stakeholder_id,
            });
            throw new Error(`Stakeholder ID mismatch. Expected ${stakeholder.id} but got ${updatedAccount.stakeholder_id}`);
        }
        logger_1.logger.info('Payout stakeholder creation job completed successfully - stakeholder ID updated in database', {
            jobId: job.id,
            accountId,
            payoutAccountId,
            stakeholderId: stakeholder.id,
            relationship: stakeholderData.relationship,
            autoCreated: job.data.autoCreated,
            databaseUpdated: true,
        });
        return {
            success: true,
            accountId,
            payoutAccountId,
            stakeholderId: stakeholder.id,
        };
    }
    catch (error) {
        logger_1.logger.error('Payout stakeholder creation job failed', {
            jobId: job.id,
            accountId: job.data.accountId,
            payoutAccountId: job.data.payoutAccountId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to trigger retry mechanism
    }
}, {
    concurrency: PAYOUT_STAKEHOLDER_CONCURRENCY,
    connection,
});
// Worker event handlers
exports.payoutStakeholderWorker.on('error', (error) => {
    logger_1.logger.error('Payout stakeholder worker error', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
    });
});
exports.payoutStakeholderWorker.on('failed', async (job, error) => {
    logger_1.logger.error('Payout stakeholder job failed permanently', {
        jobId: job?.id,
        accountId: job?.data?.accountId,
        payoutAccountId: job?.data?.payoutAccountId,
        attempts: job?.attemptsMade,
        error: error instanceof Error ? error.message : error,
    });
    // Note: We don't update the database on failure because stakeholder_id should remain null
    // The account can still function without a stakeholder, though activation might be delayed
});
exports.payoutStakeholderWorker.on('completed', (job) => {
    logger_1.logger.info('Payout stakeholder job completed', {
        jobId: job.id,
        accountId: job.data.accountId,
        payoutAccountId: job.data.payoutAccountId,
    });
});
exports.payoutStakeholderWorker.on('stalled', (jobId) => {
    logger_1.logger.warn('Payout stakeholder job stalled', { jobId });
});
exports.payoutStakeholderWorker.on('ready', () => {
    logger_1.logger.info('Payout stakeholder worker ready', {
        concurrency: PAYOUT_STAKEHOLDER_CONCURRENCY,
        queueName: payoutStakeholderQueue_1.PAYOUT_STAKEHOLDER_QUEUE_NAME,
    });
});
exports.payoutStakeholderWorker.on('closed', () => {
    logger_1.logger.info('Payout stakeholder worker closed');
});
/**
 * Close the payout stakeholder worker gracefully
 */
const closePayoutStakeholderWorker = async () => {
    try {
        await exports.payoutStakeholderWorker.close();
        logger_1.logger.info('Payout stakeholder worker closed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error closing payout stakeholder worker', {
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.closePayoutStakeholderWorker = closePayoutStakeholderWorker;
//# sourceMappingURL=payoutStakeholderWorker.js.map