"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = void 0;
const booking_model_1 = require("../models/booking.model");
const transaction_model_1 = require("../models/transaction.model");
const logger_1 = require("../utils/logger");
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
        // Update booking
        await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.CONFIRMED,
                'payment.razorpay_payment_id': paymentId,
                'payment.status': booking_model_1.PaymentStatus.SUCCESS,
                'payment.payment_method': payment.method || null,
                'payment.paid_at': new Date(),
            },
        });
        // Update or create transaction
        await transaction_model_1.TransactionModel.findOneAndUpdate({
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
        }, { upsert: true, new: true });
        logger_1.logger.info(`Payment captured via webhook for booking: ${booking.id}, payment: ${paymentId}`);
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
//# sourceMappingURL=webhook.service.js.map