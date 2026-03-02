"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePayoutBankDetailsWorker = exports.payoutBankDetailsWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const payoutBankDetailsQueue_1 = require("./payoutBankDetailsQueue");
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
const PAYOUT_BANK_DETAILS_CONCURRENCY = Number(process.env.PAYOUT_BANK_DETAILS_CONCURRENCY || 2);
/**
 * Create worker for processing payout bank details update jobs
 * This worker updates bank details in Razorpay product configuration
 */
exports.payoutBankDetailsWorker = new bullmq_1.Worker(payoutBankDetailsQueue_1.PAYOUT_BANK_DETAILS_QUEUE_NAME, async (job) => {
    try {
        logger_1.logger.info('Received payout bank details update job', {
            jobId: job.id,
            accountId: job.data.accountId,
            payoutAccountId: job.data.payoutAccountId,
            productConfigId: job.data.productConfigId,
        });
        const { accountId, productConfigId, bankDetails, payoutAccountId } = job.data;
        // Validate required fields
        if (!accountId || !productConfigId || !bankDetails || !payoutAccountId) {
            const error = new Error('Missing required fields in job data');
            logger_1.logger.error('Job data validation failed', {
                accountId,
                productConfigId,
                payoutAccountId,
                hasBankDetails: !!bankDetails,
                rawData: job.data,
            });
            throw error;
        }
        // Validate bank details
        if (!bankDetails.account_number ||
            !bankDetails.ifsc ||
            !bankDetails.beneficiary_name) {
            const error = new Error('Missing required bank details');
            logger_1.logger.error('Bank details validation failed', {
                accountId,
                payoutAccountId,
                bankDetails,
            });
            throw error;
        }
        logger_1.logger.info('Starting payout bank details update job', {
            accountId,
            payoutAccountId,
            productConfigId,
        });
        // Check if stakeholder exists before updating bank details
        // Razorpay requires stakeholder to be created before bank details can be updated
        let payoutAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOne({ id: payoutAccountId }).lean();
        if (!payoutAccount) {
            throw new Error(`Payout account not found: ${payoutAccountId}`);
        }
        // If stakeholder_id is not set yet, wait a bit and retry (stakeholder might be creating in background)
        // Maximum wait: 30 seconds (6 retries with 5 second delay)
        const maxRetries = 6;
        const retryDelay = 5000; // 5 seconds
        let retryCount = 0;
        while (!payoutAccount.stakeholder_id && retryCount < maxRetries) {
            logger_1.logger.info('Stakeholder not created yet, waiting before bank details update', {
                payoutAccountId,
                accountId,
                retryCount: retryCount + 1,
                maxRetries,
            });
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            // Re-fetch account to check if stakeholder was created
            const updatedAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOne({ id: payoutAccountId }).lean();
            if (updatedAccount) {
                payoutAccount = updatedAccount;
                if (payoutAccount.stakeholder_id) {
                    logger_1.logger.info('Stakeholder created, proceeding with bank details update', {
                        payoutAccountId,
                        stakeholderId: payoutAccount.stakeholder_id,
                    });
                    break;
                }
            }
            retryCount++;
        }
        // If stakeholder still doesn't exist after retries, log warning but proceed
        // (The updateBankDetails method will handle stakeholder requirements gracefully)
        if (!payoutAccount.stakeholder_id) {
            logger_1.logger.warn('Stakeholder not created after waiting, proceeding with bank details update anyway', {
                payoutAccountId,
                accountId,
                note: 'Razorpay API will handle stakeholder requirements check',
            });
        }
        // Update bank details in Razorpay product configuration
        // This will automatically submit the activation form
        await razorpayRoute_service_1.razorpayRouteService.updateBankDetails(accountId, productConfigId, bankDetails);
        // Update database to reflect that bank details have been submitted
        const updatedAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOneAndUpdate({ id: payoutAccountId }, {
            $set: {
                bank_details_status: 'submitted',
                updatedAt: new Date(),
            },
        }, { new: true });
        if (!updatedAccount) {
            logger_1.logger.warn('Payout account not found after bank details update', {
                payoutAccountId,
                accountId,
            });
        }
        logger_1.logger.info('Payout bank details update job completed successfully', {
            jobId: job.id,
            accountId,
            payoutAccountId,
            productConfigId,
        });
        return {
            success: true,
            accountId,
            payoutAccountId,
            productConfigId,
        };
    }
    catch (error) {
        logger_1.logger.error('Payout bank details update job failed', {
            jobId: job.id,
            accountId: job.data.accountId,
            payoutAccountId: job.data.payoutAccountId,
            productConfigId: job.data.productConfigId,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to trigger retry mechanism
    }
}, {
    concurrency: PAYOUT_BANK_DETAILS_CONCURRENCY,
    connection,
});
// Worker event handlers
exports.payoutBankDetailsWorker.on('error', (error) => {
    logger_1.logger.error('Payout bank details worker error', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
    });
});
exports.payoutBankDetailsWorker.on('failed', async (job, error) => {
    logger_1.logger.error('Payout bank details job failed permanently', {
        jobId: job?.id,
        accountId: job?.data?.accountId,
        payoutAccountId: job?.data?.payoutAccountId,
        attempts: job?.attemptsMade,
        error: error instanceof Error ? error.message : error,
    });
    // Update database to reflect failure (optional - you might want to keep it as pending)
    if (job?.data?.payoutAccountId) {
        try {
            await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOneAndUpdate({ id: job.data.payoutAccountId }, {
                $set: {
                    bank_details_status: 'pending',
                    updatedAt: new Date(),
                },
            });
            logger_1.logger.info('Updated payout account bank details status to pending after job failure', {
                payoutAccountId: job.data.payoutAccountId,
            });
        }
        catch (updateError) {
            logger_1.logger.error('Failed to update payout account status after job failure', {
                payoutAccountId: job.data.payoutAccountId,
                error: updateError instanceof Error ? updateError.message : updateError,
            });
        }
    }
});
exports.payoutBankDetailsWorker.on('completed', (job) => {
    logger_1.logger.info('Payout bank details job completed', {
        jobId: job.id,
        accountId: job.data.accountId,
        payoutAccountId: job.data.payoutAccountId,
    });
});
exports.payoutBankDetailsWorker.on('stalled', (jobId) => {
    logger_1.logger.warn('Payout bank details job stalled', { jobId });
});
exports.payoutBankDetailsWorker.on('ready', () => {
    logger_1.logger.info('Payout bank details worker ready', {
        concurrency: PAYOUT_BANK_DETAILS_CONCURRENCY,
        queueName: payoutBankDetailsQueue_1.PAYOUT_BANK_DETAILS_QUEUE_NAME,
    });
});
exports.payoutBankDetailsWorker.on('closed', () => {
    logger_1.logger.info('Payout bank details worker closed');
});
/**
 * Close the payout bank details worker gracefully
 */
const closePayoutBankDetailsWorker = async () => {
    try {
        await exports.payoutBankDetailsWorker.close();
        logger_1.logger.info('Payout bank details worker closed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error closing payout bank details worker', {
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.closePayoutBankDetailsWorker = closePayoutBankDetailsWorker;
//# sourceMappingURL=payoutBankDetailsWorker.js.map