"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePayoutTransferWorker = exports.payoutTransferWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const payoutTransferQueue_1 = require("./payoutTransferQueue");
const payout_model_1 = require("../models/payout.model");
const razorpayRoute_service_1 = require("../services/common/payment/razorpayRoute.service");
const auditTrail_service_1 = require("../services/common/auditTrail.service");
const auditTrail_model_1 = require("../models/auditTrail.model");
const notification_service_1 = require("../services/common/notification.service");
const user_model_1 = require("../models/user.model");
const notificationMessages_1 = require("../services/common/notificationMessages");
const notificationQueue_service_1 = require("../services/common/notificationQueue.service");
// Redis connection for BullMQ
const connection = new ioredis_1.default({
    ...env_1.config.redis.connection,
    host: env_1.config.redis.host,
    port: env_1.config.redis.port,
    password: env_1.config.redis.password,
    db: env_1.config.redis.db.bullmq,
    maxRetriesPerRequest: null, // Required by BullMQ for blocking operations - must be after spread
});
const PAYOUT_TRANSFER_CONCURRENCY = Number(process.env.PAYOUT_TRANSFER_CONCURRENCY || 2);
/**
 * Create worker for processing payout transfer jobs
 * This worker creates transfers in Razorpay for academy payouts
 */
exports.payoutTransferWorker = new bullmq_1.Worker(payoutTransferQueue_1.PAYOUT_TRANSFER_QUEUE_NAME, async (job) => {
    const { payoutId, accountId, amount, currency, notes, adminUserId } = job.data;
    logger_1.logger.info('Received payout transfer job', {
        jobId: job.id,
        payoutId,
        accountId,
        amount,
    });
    try {
        // Validate data
        if (!payoutId || !accountId || !amount || amount <= 0) {
            throw new Error('Invalid transfer data: payoutId, accountId, and amount are required');
        }
        // Find payout
        const payout = await payout_model_1.PayoutModel.findOne({ id: payoutId });
        if (!payout) {
            throw new Error(`Payout not found: ${payoutId}`);
        }
        // Check if payout is already processed
        if (payout.status === payout_model_1.PayoutStatus.COMPLETED) {
            logger_1.logger.warn('Payout already completed', {
                payoutId,
                transferId: payout.razorpay_transfer_id,
            });
            return {
                skipped: true,
                reason: 'Payout already completed',
                transferId: payout.razorpay_transfer_id,
            };
        }
        // Check if payout is in valid state for transfer
        if (payout.status !== payout_model_1.PayoutStatus.PENDING && payout.status !== payout_model_1.PayoutStatus.FAILED) {
            throw new Error(`Payout is in ${payout.status} status, cannot initiate transfer`);
        }
        // Update payout status to processing
        payout.status = payout_model_1.PayoutStatus.PROCESSING;
        await payout.save();
        // Create transfer in Razorpay
        const transfer = await razorpayRoute_service_1.razorpayRouteService.createTransfer(accountId, amount, currency, notes || {
            payout_id: payoutId,
            booking_id: payout.booking.toString(),
            transaction_id: payout.transaction.toString(),
        });
        // Update payout with transfer ID
        payout.razorpay_transfer_id = transfer.id;
        payout.status = payout_model_1.PayoutStatus.PROCESSING; // Will be updated to completed by webhook
        await payout.save();
        // Create audit trail
        const adminUserObjectId = adminUserId
            ? await user_model_1.UserModel.findOne({ id: adminUserId }).select('_id').lean()
            : null;
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYOUT_TRANSFER_INITIATED, auditTrail_model_1.ActionScale.CRITICAL, `Transfer initiated for payout ${payoutId}`, 'Payout', payout._id, {
            userId: adminUserObjectId?._id || null,
            metadata: {
                payout_id: payoutId,
                transfer_id: transfer.id,
                amount,
                account_id: accountId,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for transfer initiation', {
                error,
                payoutId,
            });
        });
        // Get academy user for notification
        const academyUser = await user_model_1.UserModel.findById(payout.academy_user).lean();
        if (academyUser) {
            // Push notification
            const pushNotification = (0, notificationMessages_1.getPayoutTransferInitiatedAcademyPush)({
                amount: amount.toFixed(2),
                transferId: transfer.id,
            });
            (0, notification_service_1.createAndSendNotification)({
                recipientType: 'academy',
                recipientId: academyUser.id,
                title: pushNotification.title,
                body: pushNotification.body,
                channels: ['push'],
                priority: 'high',
                data: {
                    type: 'payout_transfer_initiated',
                    payoutId: payout.id,
                    transferId: transfer.id,
                    amount,
                },
            }).catch((error) => {
                logger_1.logger.error('Failed to send push notification for transfer initiation', {
                    error,
                    payoutId,
                });
            });
            // SMS notification
            if (academyUser.mobile) {
                try {
                    const smsMessage = (0, notificationMessages_1.getPayoutTransferInitiatedAcademySms)({
                        amount: amount.toFixed(2),
                        transferId: transfer.id,
                    });
                    (0, notificationQueue_service_1.queueSms)(academyUser.mobile, smsMessage, 'high', {
                        type: 'payout_transfer_initiated',
                        payoutId: payout.id,
                        recipient: 'academy',
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to queue SMS for transfer initiation', { error, payoutId });
                }
            }
            // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
            // if (academyUser.mobile) {
            //   try {
            //     const whatsappMessage = getPayoutTransferInitiatedAcademyWhatsApp({
            //       amount: amount.toFixed(2),
            //       transferId: transfer.id,
            //     });
            //     queueWhatsApp(academyUser.mobile, whatsappMessage, 'high', {
            //       type: 'payout_transfer_initiated',
            //       payoutId: payout.id,
            //       recipient: 'academy',
            //     });
            //   } catch (error: unknown) {
            //     logger.error('Failed to queue WhatsApp for transfer initiation', { error, payoutId });
            //   }
            // }
        }
        logger_1.logger.info('Payout transfer job completed successfully', {
            jobId: job.id,
            payoutId,
            transferId: transfer.id,
            amount,
        });
        return {
            success: true,
            transferId: transfer.id,
            status: transfer.status,
        };
    }
    catch (error) {
        logger_1.logger.error('Payout transfer job failed', {
            jobId: job.id,
            payoutId,
            error: error.message || error,
            stack: error.stack,
        });
        // Update payout status to failed
        try {
            const payout = await payout_model_1.PayoutModel.findOne({ id: payoutId });
            if (payout) {
                payout.status = payout_model_1.PayoutStatus.FAILED;
                payout.failure_reason = error.message || 'Transfer failed';
                await payout.save();
                // Create audit trail for failure
                await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYOUT_TRANSFER_FAILED, auditTrail_model_1.ActionScale.HIGH, `Transfer failed for payout ${payoutId}: ${error.message}`, 'Payout', payout._id, {
                    metadata: {
                        payout_id: payoutId,
                        error: error.message || error,
                    },
                }).catch((auditError) => {
                    logger_1.logger.error('Failed to create audit trail for transfer failure', {
                        error: auditError,
                        payoutId,
                    });
                });
            }
        }
        catch (updateError) {
            logger_1.logger.error('Failed to update payout status after job failure', {
                payoutId,
                error: updateError.message || updateError,
            });
        }
        throw error; // Re-throw to trigger retry mechanism
    }
}, {
    concurrency: PAYOUT_TRANSFER_CONCURRENCY,
    connection,
});
// Worker event handlers
exports.payoutTransferWorker.on('error', (error) => {
    logger_1.logger.error('Payout transfer worker error', {
        error: error.message || error,
    });
});
exports.payoutTransferWorker.on('failed', async (job, error) => {
    logger_1.logger.error('Payout transfer job failed permanently', {
        jobId: job?.id,
        payoutId: job?.data?.payoutId,
        attempts: job?.attemptsMade,
        error: error.message || error,
    });
});
exports.payoutTransferWorker.on('completed', (job) => {
    logger_1.logger.info('Payout transfer job completed', {
        jobId: job.id,
        payoutId: job.data.payoutId,
    });
});
exports.payoutTransferWorker.on('stalled', (jobId) => {
    logger_1.logger.warn('Payout transfer job stalled', { jobId });
});
exports.payoutTransferWorker.on('ready', () => {
    logger_1.logger.info('Payout transfer worker ready', {
        concurrency: PAYOUT_TRANSFER_CONCURRENCY,
        queueName: payoutTransferQueue_1.PAYOUT_TRANSFER_QUEUE_NAME,
    });
});
exports.payoutTransferWorker.on('closed', () => {
    logger_1.logger.info('Payout transfer worker closed');
});
/**
 * Close the payout transfer worker gracefully
 */
const closePayoutTransferWorker = async () => {
    try {
        await exports.payoutTransferWorker.close();
        logger_1.logger.info('Payout transfer worker closed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error closing payout transfer worker', { error });
    }
};
exports.closePayoutTransferWorker = closePayoutTransferWorker;
//# sourceMappingURL=payoutTransferWorker.js.map