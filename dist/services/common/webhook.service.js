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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = void 0;
const booking_model_1 = require("../../models/booking.model");
const transaction_model_1 = require("../../models/transaction.model");
const auditTrail_model_1 = require("../../models/auditTrail.model");
const logger_1 = require("../../utils/logger");
const auditTrail_service_1 = require("./auditTrail.service");
const bookingPaymentVerifiedNotifications_helper_1 = require("../client/bookingPaymentVerifiedNotifications.helper");
/**
 * Handle Razorpay webhook events
 */
const handleWebhook = async (payload) => {
    try {
        const { event, payload: webhookPayload } = payload;
        logger_1.logger.info(`Processing webhook event: ${event}`, {
            event,
            entity: payload.entity,
        });
        // Handle payment.captured event
        if (event === 'payment.captured' && webhookPayload.payment?.entity) {
            await handlePaymentCaptured(webhookPayload.payment.entity, payload);
        }
        // Handle payment.failed event
        else if (event === 'payment.failed' && webhookPayload.payment?.entity) {
            await handlePaymentFailed(webhookPayload.payment.entity, payload);
        }
        // Handle order.paid event
        else if (event === 'order.paid' && webhookPayload.order?.entity) {
            await handleOrderPaid(webhookPayload.order.entity, payload);
        }
        // Handle transfer.processed event
        else if (event === 'transfer.processed' && webhookPayload.transfer?.entity) {
            await handleTransferProcessed(webhookPayload.transfer.entity, payload);
        }
        // Handle transfer.failed event
        else if (event === 'transfer.failed' && webhookPayload.transfer?.entity) {
            await handleTransferFailed(webhookPayload.transfer.entity, payload);
        }
        // Handle refund.processed event
        else if (event === 'refund.processed' && webhookPayload.refund?.entity) {
            await handleRefundProcessed(webhookPayload.refund.entity, payload);
        }
        // Handle refund.failed event
        else if (event === 'refund.failed' && webhookPayload.refund?.entity) {
            await handleRefundFailed(webhookPayload.refund.entity, payload);
        }
        else {
            logger_1.logger.info(`Unhandled webhook event: ${event}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error handling webhook:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            payload,
        });
        throw error;
    }
};
exports.handleWebhook = handleWebhook;
/**
 * Handle payment.captured event
 */
const handlePaymentCaptured = async (payment, fullPayload) => {
    try {
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const amount = payment.amount / 100; // Convert from paise to rupees
        // Find booking by razorpay_order_id
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_order_id': orderId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            logger_1.logger.warn(`Booking not found for order: ${orderId}`);
            return;
        }
        // Check if payment is already processed
        if (booking.payment.status === booking_model_1.PaymentStatus.SUCCESS) {
            logger_1.logger.info(`Payment already processed for booking: ${booking.id}`);
            // Update transaction if exists
            await transaction_model_1.TransactionModel.findOneAndUpdate({
                booking: booking._id,
                razorpay_payment_id: paymentId,
            }, {
                $set: {
                    status: transaction_model_1.TransactionStatus.SUCCESS,
                    source: transaction_model_1.TransactionSource.WEBHOOK,
                    payment_method: payment.method || null,
                    processed_at: new Date(),
                    razorpay_webhook_data: fullPayload,
                },
                $setOnInsert: {
                    user: booking.user,
                    booking: booking._id,
                    razorpay_order_id: orderId,
                    amount: booking.amount,
                    currency: booking.currency,
                    type: transaction_model_1.TransactionType.PAYMENT,
                    // Note: status and source are in $set above, so they will be set for both insert and update
                },
            }, { upsert: true, new: true });
            return;
        }
        // Verify amount matches
        if (Math.abs(booking.amount - amount) > 0.01) {
            logger_1.logger.error('Payment amount mismatch', {
                bookingId: booking.id,
                expected: booking.amount,
                received: amount,
            });
            // Still update the booking but mark with error
        }
        // Update booking atomically - only if not already success (prevents duplicate notifications with verifyPayment)
        const updatedBooking = await booking_model_1.BookingModel.findOneAndUpdate({ _id: booking._id, 'payment.status': { $ne: booking_model_1.PaymentStatus.SUCCESS } }, {
            $set: {
                status: booking_model_1.BookingStatus.CONFIRMED,
                'payment.razorpay_payment_id': paymentId,
                'payment.status': booking_model_1.PaymentStatus.SUCCESS,
                'payment.payment_method': payment.method || null,
                'payment.paid_at': new Date(),
            },
        }, { new: true });
        if (!updatedBooking) {
            // Payment already processed (e.g. by verifyPayment) - update transaction and return
            logger_1.logger.info(`Payment already processed for booking: ${booking.id}`);
            await transaction_model_1.TransactionModel.findOneAndUpdate({
                booking: booking._id,
                razorpay_payment_id: paymentId,
            }, {
                $set: {
                    status: transaction_model_1.TransactionStatus.SUCCESS,
                    source: transaction_model_1.TransactionSource.WEBHOOK,
                    payment_method: payment.method || null,
                    processed_at: new Date(),
                    razorpay_webhook_data: fullPayload,
                },
                $setOnInsert: {
                    user: booking.user,
                    booking: booking._id,
                    razorpay_order_id: orderId,
                    amount: booking.amount,
                    currency: booking.currency,
                    type: transaction_model_1.TransactionType.PAYMENT,
                },
            }, { upsert: true, new: true });
            return;
        }
        // Update or create transaction
        const transaction = await transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_order_id: orderId,
        }, {
            $set: {
                razorpay_payment_id: paymentId,
                status: transaction_model_1.TransactionStatus.SUCCESS,
                source: transaction_model_1.TransactionSource.WEBHOOK,
                payment_method: payment.method || null,
                processed_at: new Date(),
                razorpay_webhook_data: fullPayload,
            },
            $setOnInsert: {
                user: booking.user,
                booking: booking._id,
                razorpay_order_id: orderId,
                amount: booking.amount,
                currency: booking.currency,
                type: transaction_model_1.TransactionType.PAYMENT,
                // Note: status and source are in $set above, so they will be set for both insert and update
            },
        }, { upsert: true, new: true });
        logger_1.logger.info(`Payment captured via webhook for booking: ${updatedBooking.id}, payment: ${paymentId}`);
        // Send notifications (non-blocking) - only we updated, so no duplicate with verifyPayment
        (0, bookingPaymentVerifiedNotifications_helper_1.sendPaymentVerifiedNotifications)(updatedBooking.id).catch((error) => {
            logger_1.logger.error('Error sending payment verified notifications from webhook', {
                bookingId: updatedBooking.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Create audit trail for payment verified via webhook (non-blocking)
        (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_SUCCESS, auditTrail_model_1.ActionScale.CRITICAL, `Payment verified via webhook for booking ${updatedBooking.booking_id || updatedBooking.id}`, 'Booking', booking._id, {
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                source: 'webhook',
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                payment_method: payment.method || null,
                amount: booking.amount,
                currency: booking.currency,
                transaction_id: transaction?.id || null,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for webhook payment verification', {
                bookingId: booking.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Create payout record (non-blocking - fire-and-forget, return 200 to Razorpay quickly)
        // Only create payout if commission and priceBreakdown exist and payoutAmount > 0
        const commission = booking.commission;
        const priceBreakdown = booking.priceBreakdown;
        if (commission && commission.payoutAmount > 0 && priceBreakdown && transaction) {
            void (async () => {
                try {
                    const { CoachingCenterModel } = await Promise.resolve().then(() => __importStar(require('../../models/coachingCenter.model')));
                    const { UserModel } = await Promise.resolve().then(() => __importStar(require('../../models/user.model')));
                    const center = await CoachingCenterModel.findById(booking.center).select('user').lean();
                    if (!center?.user)
                        return;
                    const academyUser = await UserModel.findById(center.user).select('id').lean();
                    if (!academyUser)
                        return;
                    const { createPayoutRecord } = await Promise.resolve().then(() => __importStar(require('./payoutCreation.service')));
                    const result = await createPayoutRecord({
                        bookingId: booking.id,
                        transactionId: transaction.id,
                        academyUserId: academyUser.id,
                        amount: booking.amount,
                        batchAmount: priceBreakdown.batch_amount,
                        commissionRate: commission.rate,
                        commissionAmount: commission.amount,
                        payoutAmount: commission.payoutAmount,
                        currency: booking.currency,
                    });
                    if (result.success && !result.skipped) {
                        logger_1.logger.info('Payout record created successfully from webhook', {
                            bookingId: booking.id,
                            transactionId: transaction.id,
                            payoutId: result.payoutId,
                            payoutAmount: commission.payoutAmount,
                        });
                    }
                    else if (result.skipped) {
                        logger_1.logger.info('Payout creation skipped from webhook', {
                            bookingId: booking.id,
                            reason: result.reason,
                            payoutId: result.payoutId,
                        });
                    }
                }
                catch (payoutError) {
                    logger_1.logger.error('Failed to create payout record from webhook', {
                        error: payoutError.message || payoutError,
                        bookingId: booking.id,
                    });
                }
            })();
        }
    }
    catch (error) {
        logger_1.logger.error('Error handling payment.captured webhook:', {
            error: error instanceof Error ? error.message : error,
            paymentId: payment.id,
        });
        throw error;
    }
};
/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (payment, fullPayload) => {
    try {
        const orderId = payment.order_id;
        const paymentId = payment.id;
        // Find booking
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_order_id': orderId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            logger_1.logger.warn(`Booking not found for failed payment order: ${orderId}`);
            return;
        }
        // Update booking payment status
        await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                'payment.status': booking_model_1.PaymentStatus.FAILED,
                'payment.failure_reason': payment.error_description || payment.error_reason || 'Payment failed',
            },
        });
        // Update or create transaction
        await transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_order_id: orderId,
        }, {
            $set: {
                razorpay_payment_id: paymentId,
                status: transaction_model_1.TransactionStatus.FAILED,
                source: transaction_model_1.TransactionSource.WEBHOOK,
                failure_reason: payment.error_description || payment.error_reason || 'Payment failed',
                razorpay_webhook_data: fullPayload,
            },
            $setOnInsert: {
                user: booking.user,
                booking: booking._id,
                razorpay_order_id: orderId,
                amount: booking.amount,
                currency: booking.currency,
                type: transaction_model_1.TransactionType.PAYMENT,
                // Note: status and source are in $set above, so they will be set for both insert and update
            },
        }, { upsert: true, new: true });
        logger_1.logger.info(`Payment failed via webhook for booking: ${booking.id}, payment: ${paymentId}`);
    }
    catch (error) {
        logger_1.logger.error('Error handling payment.failed webhook:', {
            error: error instanceof Error ? error.message : error,
            paymentId: payment.id,
        });
        throw error;
    }
};
/**
 * Handle order.paid event
 */
const handleOrderPaid = async (order, _fullPayload) => {
    try {
        const orderId = order.id;
        // Find booking
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_order_id': orderId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            logger_1.logger.warn(`Booking not found for paid order: ${orderId}`);
            return;
        }
        // If order is paid, ensure booking is confirmed
        if (booking.status !== booking_model_1.BookingStatus.CONFIRMED) {
            await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
                $set: {
                    status: booking_model_1.BookingStatus.CONFIRMED,
                    'payment.status': booking_model_1.PaymentStatus.SUCCESS,
                    'payment.paid_at': new Date(),
                },
            });
        }
        logger_1.logger.info(`Order paid via webhook for booking: ${booking.id}, order: ${orderId}`);
    }
    catch (error) {
        logger_1.logger.error('Error handling order.paid webhook:', {
            error: error instanceof Error ? error.message : error,
            orderId: order.id,
        });
        throw error;
    }
};
/**
 * Handle transfer.processed event
 */
const handleTransferProcessed = async (transfer, _fullPayload) => {
    try {
        const transferId = transfer.id;
        const amount = transfer.amount ? transfer.amount / 100 : 0; // Convert from paise to rupees
        logger_1.logger.info('Processing transfer.processed webhook', {
            transferId,
            amount,
            status: transfer.status,
        });
        // Find payout by transfer ID
        const { PayoutModel, PayoutStatus } = await Promise.resolve().then(() => __importStar(require('../../models/payout.model')));
        const payout = await PayoutModel.findOne({
            razorpay_transfer_id: transferId,
        });
        if (!payout) {
            logger_1.logger.warn(`Payout not found for transfer: ${transferId}`);
            return;
        }
        // Update payout status
        payout.status = PayoutStatus.COMPLETED;
        payout.processed_at = new Date();
        payout.failure_reason = null;
        await payout.save();
        // Update booking payout_status to COMPLETED (transfer completed)
        await booking_model_1.BookingModel.findByIdAndUpdate(payout.booking, {
            $set: {
                payout_status: booking_model_1.BookingPayoutStatus.COMPLETED,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to update booking payout_status after transfer completion', {
                error: error instanceof Error ? error.message : error,
                bookingId: payout.booking.toString(),
            });
        });
        // Create audit trail
        const { createAuditTrail } = await Promise.resolve().then(() => __importStar(require('./auditTrail.service')));
        await createAuditTrail(auditTrail_model_1.ActionType.PAYOUT_TRANSFER_COMPLETED, auditTrail_model_1.ActionScale.CRITICAL, `Transfer completed for payout ${payout.id}`, 'Payout', payout._id, {
            metadata: {
                payout_id: payout.id,
                transfer_id: transferId,
                amount,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for transfer completion', {
                error,
                payoutId: payout.id,
            });
        });
        // Send notification to academy
        const { UserModel } = await Promise.resolve().then(() => __importStar(require('../../models/user.model')));
        const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('./notification.service')));
        const { getPayoutTransferCompletedAcademySms, 
        // getPayoutTransferCompletedAcademyWhatsApp,
        getPayoutTransferCompletedAcademyPush, } = await Promise.resolve().then(() => __importStar(require('./notificationMessages')));
        const { queueSms /* , queueWhatsApp */ } = await Promise.resolve().then(() => __importStar(require('./notificationQueue.service')));
        const academyUser = await UserModel.findById(payout.academy_user).lean();
        if (academyUser) {
            // Push notification
            const pushNotification = getPayoutTransferCompletedAcademyPush({
                amount: amount.toFixed(2),
                transferId,
            });
            createAndSendNotification({
                recipientType: 'academy',
                recipientId: academyUser.id,
                title: pushNotification.title,
                body: pushNotification.body,
                channels: ['push'],
                priority: 'high',
                data: {
                    type: 'payout_transfer_completed',
                    payoutId: payout.id,
                    transferId,
                    amount,
                },
            }).catch((error) => {
                logger_1.logger.error('Failed to send push notification for transfer completion', {
                    error,
                    payoutId: payout.id,
                });
            });
            // SMS notification
            if (academyUser.mobile) {
                try {
                    const smsMessage = getPayoutTransferCompletedAcademySms({
                        amount: amount.toFixed(2),
                        transferId,
                    });
                    queueSms(academyUser.mobile, smsMessage, 'high', {
                        type: 'payout_transfer_completed',
                        payoutId: payout.id,
                        recipient: 'academy',
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to queue SMS for transfer completion', { error, payoutId: payout.id });
                }
            }
            // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
            // if (academyUser.mobile) {
            //   try {
            //     const whatsappMessage = getPayoutTransferCompletedAcademyWhatsApp({
            //       amount: amount.toFixed(2),
            //       transferId,
            //     });
            //     queueWhatsApp(academyUser.mobile, whatsappMessage, 'high', {
            //       type: 'payout_transfer_completed',
            //       payoutId: payout.id,
            //       recipient: 'academy',
            //     });
            //   } catch (error: unknown) {
            //     logger.error('Failed to queue WhatsApp for transfer completion', { error, payoutId: payout.id });
            //   }
            // }
        }
        logger_1.logger.info(`Transfer processed via webhook for payout: ${payout.id}, transfer: ${transferId}`);
    }
    catch (error) {
        logger_1.logger.error('Error handling transfer.processed webhook:', {
            error: error instanceof Error ? error.message : error,
            transferId: transfer.id,
        });
        throw error;
    }
};
/**
 * Handle transfer.failed event
 */
const handleTransferFailed = async (transfer, _fullPayload) => {
    try {
        const transferId = transfer.id;
        const failureReason = transfer.failure_reason || 'Transfer failed';
        logger_1.logger.info('Processing transfer.failed webhook', {
            transferId,
            failureReason,
        });
        // Find payout by transfer ID
        const { PayoutModel, PayoutStatus } = await Promise.resolve().then(() => __importStar(require('../../models/payout.model')));
        const payout = await PayoutModel.findOne({
            razorpay_transfer_id: transferId,
        });
        if (!payout) {
            logger_1.logger.warn(`Payout not found for failed transfer: ${transferId}`);
            return;
        }
        // Update payout status
        payout.status = PayoutStatus.FAILED;
        payout.failure_reason = failureReason;
        await payout.save();
        // Update booking payout_status to FAILED
        await booking_model_1.BookingModel.findByIdAndUpdate(payout.booking, {
            $set: {
                payout_status: booking_model_1.BookingPayoutStatus.FAILED,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to update booking payout_status after transfer failure', {
                error: error instanceof Error ? error.message : error,
                bookingId: payout.booking.toString(),
            });
        });
        // Create audit trail
        const { createAuditTrail } = await Promise.resolve().then(() => __importStar(require('./auditTrail.service')));
        await createAuditTrail(auditTrail_model_1.ActionType.PAYOUT_TRANSFER_FAILED, auditTrail_model_1.ActionScale.HIGH, `Transfer failed for payout ${payout.id}: ${failureReason}`, 'Payout', payout._id, {
            metadata: {
                payout_id: payout.id,
                transfer_id: transferId,
                failure_reason: failureReason,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for transfer failure', {
                error,
                payoutId: payout.id,
            });
        });
        logger_1.logger.info(`Transfer failed via webhook for payout: ${payout.id}, transfer: ${transferId}`);
    }
    catch (error) {
        logger_1.logger.error('Error handling transfer.failed webhook:', {
            error: error instanceof Error ? error.message : error,
            transferId: transfer.id,
        });
        throw error;
    }
};
/**
 * Handle refund.processed event
 */
const handleRefundProcessed = async (refund, _fullPayload) => {
    try {
        const refundId = refund.id;
        const paymentId = refund.payment_id;
        const amount = refund.amount ? refund.amount / 100 : 0; // Convert from paise to rupees
        logger_1.logger.info('Processing refund.processed webhook', {
            refundId,
            paymentId,
            amount,
            status: refund.status,
        });
        // Find booking by payment ID
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_payment_id': paymentId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            logger_1.logger.warn(`Booking not found for refund: ${refundId}, payment: ${paymentId}`);
            return;
        }
        // Update transaction if exists
        await transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_payment_id: paymentId,
            type: 'refund',
        }, {
            $set: {
                razorpay_refund_id: refundId,
                status: transaction_model_1.TransactionStatus.SUCCESS,
                source: transaction_model_1.TransactionSource.WEBHOOK,
                processed_at: new Date(),
            },
            $setOnInsert: {
                user: booking.user,
                booking: booking._id,
                razorpay_order_id: booking.payment.razorpay_order_id || '',
                razorpay_payment_id: paymentId,
                amount: amount,
                currency: booking.currency,
                type: transaction_model_1.TransactionType.REFUND,
                // Note: status and source are in $set above, so they will be set for both insert and update
            },
        }, { upsert: true, new: true });
        // Update booking if needed
        const isFullRefund = Math.abs(amount - booking.amount) < 0.01;
        // If full refund, set payout_status to REFUNDED (payout should be reversed/cancelled)
        if (isFullRefund && booking.status !== booking_model_1.BookingStatus.CANCELLED) {
            await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
                $set: {
                    status: booking_model_1.BookingStatus.CANCELLED,
                    'payment.status': booking_model_1.PaymentStatus.REFUNDED,
                    payout_status: booking_model_1.BookingPayoutStatus.REFUNDED, // Full refund - payout reversed
                },
            });
        }
        // For partial refund, keep payout_status as is (payout was already done, just adjusted)
        // Handle payout adjustment
        const { PayoutModel, PayoutStatus } = await Promise.resolve().then(() => __importStar(require('../../models/payout.model')));
        const payout = await PayoutModel.findOne({
            booking: booking._id,
        });
        if (payout) {
            if (isFullRefund) {
                if (payout.status === PayoutStatus.PENDING) {
                    payout.status = PayoutStatus.CANCELLED;
                }
                else if (payout.status === PayoutStatus.COMPLETED) {
                    payout.status = PayoutStatus.REFUNDED;
                }
            }
            else {
                // Partial refund - adjust payout
                const refundPercentage = amount / booking.amount;
                payout.refund_amount = amount;
                payout.adjusted_payout_amount = Math.max(0, payout.payout_amount * (1 - refundPercentage));
                if (payout.status === PayoutStatus.COMPLETED) {
                    payout.status = PayoutStatus.REFUNDED;
                }
            }
            payout.failure_reason = `Refund processed: ${refundId}`;
            await payout.save();
        }
        // Create audit trail
        const { createAuditTrail } = await Promise.resolve().then(() => __importStar(require('./auditTrail.service')));
        await createAuditTrail(auditTrail_model_1.ActionType.REFUND_COMPLETED, auditTrail_model_1.ActionScale.CRITICAL, `Refund processed for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
            bookingId: booking._id,
            metadata: {
                booking_id: booking.id,
                refund_id: refundId,
                payment_id: paymentId,
                amount,
                is_full_refund: isFullRefund,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for refund completion', {
                error,
                bookingId: booking.id,
            });
        });
        logger_1.logger.info(`Refund processed via webhook for booking: ${booking.id}, refund: ${refundId}`);
    }
    catch (error) {
        logger_1.logger.error('Error handling refund.processed webhook:', {
            error: error instanceof Error ? error.message : error,
            refundId: refund.id,
        });
        throw error;
    }
};
/**
 * Handle refund.failed event
 */
const handleRefundFailed = async (refund, _fullPayload) => {
    try {
        const refundId = refund.id;
        const paymentId = refund.payment_id;
        const failureReason = refund.failure_reason || 'Refund failed';
        logger_1.logger.info('Processing refund.failed webhook', {
            refundId,
            paymentId,
            failureReason,
        });
        // Find booking by payment ID
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_payment_id': paymentId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            logger_1.logger.warn(`Booking not found for failed refund: ${refundId}, payment: ${paymentId}`);
            return;
        }
        // Update transaction if exists
        await transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_payment_id: paymentId,
            type: 'refund',
        }, {
            $set: {
                razorpay_refund_id: refundId,
                status: transaction_model_1.TransactionStatus.FAILED,
                source: transaction_model_1.TransactionSource.WEBHOOK,
                failure_reason: failureReason,
            },
            $setOnInsert: {
                user: booking.user,
                booking: booking._id,
                razorpay_order_id: booking.payment.razorpay_order_id || '',
                razorpay_payment_id: paymentId,
                amount: booking.amount, // Use booking amount as fallback (refund amount not available in failed webhook)
                currency: booking.currency,
                type: transaction_model_1.TransactionType.REFUND,
                // Note: status and source are in $set above, so they will be set for both insert and update
            },
        }, { upsert: true, new: true });
        // Create audit trail
        const { createAuditTrail } = await Promise.resolve().then(() => __importStar(require('./auditTrail.service')));
        await createAuditTrail(auditTrail_model_1.ActionType.REFUND_FAILED, auditTrail_model_1.ActionScale.HIGH, `Refund failed for booking ${booking.booking_id || booking.id}: ${failureReason}`, 'Booking', booking._id, {
            bookingId: booking._id,
            metadata: {
                booking_id: booking.id,
                refund_id: refundId,
                payment_id: paymentId,
                failure_reason: failureReason,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for refund failure', {
                error,
                bookingId: booking.id,
            });
        });
        logger_1.logger.info(`Refund failed via webhook for booking: ${booking.id}, refund: ${refundId}`);
    }
    catch (error) {
        logger_1.logger.error('Error handling refund.failed webhook:', {
            error: error instanceof Error ? error.message : error,
            refundId: refund.id,
        });
        throw error;
    }
};
//# sourceMappingURL=webhook.service.js.map