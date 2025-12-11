import { Types } from 'mongoose';
import { BookingModel, PaymentStatus, BookingStatus } from '../models/booking.model';
import { TransactionModel, TransactionType, TransactionStatus, TransactionSource } from '../models/transaction.model';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        invoice_id: string | null;
        international: boolean;
        method: string;
        amount_refunded: number;
        refund_status: string | null;
        captured: boolean;
        description: string | null;
        card_id: string | null;
        bank: string | null;
        wallet: string | null;
        vpa: string | null;
        email: string;
        contact: string;
        notes: Record<string, any>;
        fee: number | null;
        tax: number | null;
        error_code: string | null;
        error_description: string | null;
        error_source: string | null;
        error_step: string | null;
        error_reason: string | null;
        acquirer_data: Record<string, any>;
        created_at: number;
      };
    };
    order?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt: string;
        offer_id: string | null;
        status: string;
        attempts: number;
        notes: Record<string, any>;
        created_at: number;
      };
    };
  };
  created_at: number;
}

/**
 * Handle Razorpay webhook events
 */
export const handleWebhook = async (payload: RazorpayWebhookPayload): Promise<void> => {
  try {
    const { event, payload: webhookPayload } = payload;

    logger.info(`Processing webhook event: ${event}`, {
      event,
      entity: payload.entity,
    });

    // Handle payment.captured event
    if (event === 'payment.captured' && webhookPayload.payment) {
      await handlePaymentCaptured(webhookPayload.payment.entity, payload);
    }
    // Handle payment.failed event
    else if (event === 'payment.failed' && webhookPayload.payment) {
      await handlePaymentFailed(webhookPayload.payment.entity, payload);
    }
    // Handle order.paid event
    else if (event === 'order.paid' && webhookPayload.order) {
      await handleOrderPaid(webhookPayload.order.entity, payload);
    }
    else {
      logger.info(`Unhandled webhook event: ${event}`);
    }
  } catch (error) {
    logger.error('Error handling webhook:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      payload,
    });
    throw error;
  }
};

/**
 * Handle payment.captured event
 */
const handlePaymentCaptured = async (
  payment: RazorpayWebhookPayload['payload']['payment']['entity'],
  fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amount = payment.amount / 100; // Convert from paise to rupees

    // Find booking by razorpay_order_id
    const booking = await BookingModel.findOne({
      'payment.razorpay_order_id': orderId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      logger.warn(`Booking not found for order: ${orderId}`);
      return;
    }

    // Check if payment is already processed
    if (booking.payment.status === PaymentStatus.SUCCESS) {
      logger.info(`Payment already processed for booking: ${booking.id}`);
      
      // Update transaction if exists
      await TransactionModel.findOneAndUpdate(
        {
          booking: booking._id,
          razorpay_payment_id: paymentId,
        },
        {
          $set: {
            status: TransactionStatus.SUCCESS,
            source: TransactionSource.WEBHOOK,
            payment_method: payment.method || null,
            processed_at: new Date(),
            razorpay_webhook_data: fullPayload,
          },
        },
        { upsert: true, new: true }
      );
      return;
    }

    // Verify amount matches
    if (Math.abs(booking.amount - amount) > 0.01) {
      logger.error('Payment amount mismatch', {
        bookingId: booking.id,
        expected: booking.amount,
        received: amount,
      });
      // Still update the booking but mark with error
    }

    // Update booking
    await BookingModel.findByIdAndUpdate(booking._id, {
      $set: {
        status: BookingStatus.CONFIRMED,
        'payment.razorpay_payment_id': paymentId,
        'payment.status': PaymentStatus.SUCCESS,
        'payment.payment_method': payment.method || null,
        'payment.paid_at': new Date(),
      },
    });

    // Update or create transaction
    await TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_order_id: orderId,
      },
      {
        $set: {
          razorpay_payment_id: paymentId,
          status: TransactionStatus.SUCCESS,
          source: TransactionSource.WEBHOOK,
          payment_method: payment.method || null,
          processed_at: new Date(),
          razorpay_webhook_data: fullPayload,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`Payment captured via webhook for booking: ${booking.id}, payment: ${paymentId}`);
  } catch (error) {
    logger.error('Error handling payment.captured webhook:', {
      error: error instanceof Error ? error.message : error,
      paymentId: payment.id,
    });
    throw error;
  }
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (
  payment: RazorpayWebhookPayload['payload']['payment']['entity'],
  fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const orderId = payment.order_id;
    const paymentId = payment.id;

    // Find booking
    const booking = await BookingModel.findOne({
      'payment.razorpay_order_id': orderId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      logger.warn(`Booking not found for failed payment order: ${orderId}`);
      return;
    }

    // Update booking payment status
    await BookingModel.findByIdAndUpdate(booking._id, {
      $set: {
        'payment.status': PaymentStatus.FAILED,
        'payment.failure_reason': payment.error_description || payment.error_reason || 'Payment failed',
      },
    });

    // Update or create transaction
    await TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_order_id: orderId,
      },
      {
        $set: {
          razorpay_payment_id: paymentId,
          status: TransactionStatus.FAILED,
          source: TransactionSource.WEBHOOK,
          failure_reason: payment.error_description || payment.error_reason || 'Payment failed',
          razorpay_webhook_data: fullPayload,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`Payment failed via webhook for booking: ${booking.id}, payment: ${paymentId}`);
  } catch (error) {
    logger.error('Error handling payment.failed webhook:', {
      error: error instanceof Error ? error.message : error,
      paymentId: payment.id,
    });
    throw error;
  }
};

/**
 * Handle order.paid event
 */
const handleOrderPaid = async (
  order: RazorpayWebhookPayload['payload']['order']['entity'],
  fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const orderId = order.id;

    // Find booking
    const booking = await BookingModel.findOne({
      'payment.razorpay_order_id': orderId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      logger.warn(`Booking not found for paid order: ${orderId}`);
      return;
    }

    // If order is paid, ensure booking is confirmed
    if (booking.status !== BookingStatus.CONFIRMED) {
      await BookingModel.findByIdAndUpdate(booking._id, {
        $set: {
          status: BookingStatus.CONFIRMED,
          'payment.status': PaymentStatus.SUCCESS,
          'payment.paid_at': new Date(),
        },
      });
    }

    logger.info(`Order paid via webhook for booking: ${booking.id}, order: ${orderId}`);
  } catch (error) {
    logger.error('Error handling order.paid webhook:', {
      error: error instanceof Error ? error.message : error,
      orderId: order.id,
    });
    throw error;
  }
};

