import { BookingModel, PaymentStatus, BookingStatus, BookingPayoutStatus } from '../../models/booking.model';
import { TransactionModel, TransactionStatus, TransactionSource, TransactionType } from '../../models/transaction.model';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import { logger } from '../../utils/logger';

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
    transfer?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        account: string;
        notes: Record<string, any>;
        failure_reason?: string | null;
        created_at: number;
      };
    };
    refund?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        payment_id: string;
        status: string;
        notes: Record<string, any>;
        failure_reason?: string | null;
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

type PaymentEntity = NonNullable<RazorpayWebhookPayload['payload']['payment']>['entity'];
type OrderEntity = NonNullable<RazorpayWebhookPayload['payload']['order']>['entity'];

/**
 * Handle payment.captured event
 */
const handlePaymentCaptured = async (
  payment: PaymentEntity,
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
          $setOnInsert: {
            user: booking.user,
            booking: booking._id,
            razorpay_order_id: orderId,
            amount: booking.amount,
            currency: booking.currency,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESS,
            source: TransactionSource.WEBHOOK,
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
    const transaction = await TransactionModel.findOneAndUpdate(
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
        $setOnInsert: {
          user: booking.user,
          booking: booking._id,
          razorpay_order_id: orderId,
          amount: booking.amount,
          currency: booking.currency,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.SUCCESS,
          source: TransactionSource.WEBHOOK,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`Payment captured via webhook for booking: ${booking.id}, payment: ${paymentId}`);

    // Create payout record (non-blocking - enqueue in background)
    // Only create payout if commission and priceBreakdown exist and payoutAmount > 0
    // This ensures payout is created even when payment comes via webhook instead of user verification
    if (booking.commission && booking.commission.payoutAmount > 0 && booking.priceBreakdown && transaction) {
      try {
        const { CoachingCenterModel } = await import('../../models/coachingCenter.model');
        const { UserModel } = await import('../../models/user.model');
        
        // Get center to find academy owner
        const center = await CoachingCenterModel.findById(booking.center)
          .select('user')
          .lean();

          if (center?.user) {
          const academyUser = await UserModel.findById(center.user).select('id').lean();
          if (academyUser) {
            // Create payout record directly (synchronous)
            try {
              const { createPayoutRecord } = await import('./payoutCreation.service');
              const result = await createPayoutRecord({
                bookingId: booking.id,
                transactionId: transaction.id,
                academyUserId: academyUser.id,
                amount: booking.amount,
                batchAmount: booking.priceBreakdown.batch_amount,
                commissionRate: booking.commission.rate,
                commissionAmount: booking.commission.amount,
                payoutAmount: booking.commission.payoutAmount,
                currency: booking.currency,
              });

              if (result.success && !result.skipped) {
                logger.info('Payout record created successfully from webhook', {
                  bookingId: booking.id,
                  transactionId: transaction.id,
                  payoutId: result.payoutId,
                  payoutAmount: booking.commission.payoutAmount,
                });
              } else if (result.skipped) {
                logger.info('Payout creation skipped from webhook', {
                  bookingId: booking.id,
                  reason: result.reason,
                  payoutId: result.payoutId,
                });
              }
            } catch (payoutError: any) {
              logger.error('Failed to create payout record from webhook', {
                error: payoutError.message || payoutError,
                bookingId: booking.id,
                transactionId: transaction.id,
              });
            }
          }
        }
      } catch (payoutError: any) {
        // Log but don't fail webhook processing
        logger.error('Failed to enqueue payout creation from webhook (non-blocking)', {
          error: payoutError.message || payoutError,
          bookingId: booking.id,
        });
      }
    }
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
  payment: PaymentEntity,
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
        $setOnInsert: {
          user: booking.user,
          booking: booking._id,
          razorpay_order_id: orderId,
          amount: booking.amount,
          currency: booking.currency,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.FAILED,
          source: TransactionSource.WEBHOOK,
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
  order: OrderEntity,
  _fullPayload: RazorpayWebhookPayload
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

/**
 * Handle transfer.processed event
 */
const handleTransferProcessed = async (
  transfer: any,
  _fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const transferId = transfer.id;
    const amount = transfer.amount ? transfer.amount / 100 : 0; // Convert from paise to rupees

    logger.info('Processing transfer.processed webhook', {
      transferId,
      amount,
      status: transfer.status,
    });

    // Find payout by transfer ID
    const { PayoutModel, PayoutStatus } = await import('../../models/payout.model');
    const payout = await PayoutModel.findOne({
      razorpay_transfer_id: transferId,
    });

    if (!payout) {
      logger.warn(`Payout not found for transfer: ${transferId}`);
      return;
    }

    // Update payout status
    payout.status = PayoutStatus.COMPLETED;
    payout.processed_at = new Date();
    payout.failure_reason = null;
    await payout.save();

    // Update booking payout_status to COMPLETED (transfer completed)
    await BookingModel.findByIdAndUpdate(payout.booking, {
      $set: {
        payout_status: BookingPayoutStatus.COMPLETED,
      },
    }).catch((error) => {
      logger.error('Failed to update booking payout_status after transfer completion', {
        error: error instanceof Error ? error.message : error,
        bookingId: payout.booking.toString(),
      });
    });

    // Create audit trail
    const { createAuditTrail } = await import('./auditTrail.service');
    await createAuditTrail(
      ActionType.PAYOUT_TRANSFER_COMPLETED,
      ActionScale.CRITICAL,
      `Transfer completed for payout ${payout.id}`,
      'Payout',
      payout._id,
      {
        metadata: {
          payout_id: payout.id,
          transfer_id: transferId,
          amount,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for transfer completion', {
        error,
        payoutId: payout.id,
      });
    });

    // Send notification to academy
    const { UserModel } = await import('../../models/user.model');
    const { createAndSendNotification } = await import('./notification.service');
    const {
      getPayoutTransferCompletedAcademySms,
      getPayoutTransferCompletedAcademyWhatsApp,
      getPayoutTransferCompletedAcademyPush,
    } = await import('./notificationMessages');
    const { queueSms, queueWhatsApp } = await import('./notificationQueue.service');
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
        logger.error('Failed to send push notification for transfer completion', {
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
        } catch (error: unknown) {
          logger.error('Failed to queue SMS for transfer completion', { error, payoutId: payout.id });
        }
      }

      // WhatsApp notification
      if (academyUser.mobile) {
        try {
          const whatsappMessage = getPayoutTransferCompletedAcademyWhatsApp({
            amount: amount.toFixed(2),
            transferId,
          });
          queueWhatsApp(academyUser.mobile, whatsappMessage, 'high', {
            type: 'payout_transfer_completed',
            payoutId: payout.id,
            recipient: 'academy',
          });
        } catch (error: unknown) {
          logger.error('Failed to queue WhatsApp for transfer completion', { error, payoutId: payout.id });
        }
      }
    }

    logger.info(`Transfer processed via webhook for payout: ${payout.id}, transfer: ${transferId}`);
  } catch (error) {
    logger.error('Error handling transfer.processed webhook:', {
      error: error instanceof Error ? error.message : error,
      transferId: transfer.id,
    });
    throw error;
  }
};

/**
 * Handle transfer.failed event
 */
const handleTransferFailed = async (
  transfer: any,
  _fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const transferId = transfer.id;
    const failureReason = transfer.failure_reason || 'Transfer failed';

    logger.info('Processing transfer.failed webhook', {
      transferId,
      failureReason,
    });

    // Find payout by transfer ID
    const { PayoutModel, PayoutStatus } = await import('../../models/payout.model');
    const payout = await PayoutModel.findOne({
      razorpay_transfer_id: transferId,
    });

    if (!payout) {
      logger.warn(`Payout not found for failed transfer: ${transferId}`);
      return;
    }

    // Update payout status
    payout.status = PayoutStatus.FAILED;
    payout.failure_reason = failureReason;
    await payout.save();

    // Update booking payout_status to FAILED
    await BookingModel.findByIdAndUpdate(payout.booking, {
      $set: {
        payout_status: BookingPayoutStatus.FAILED,
      },
    }).catch((error) => {
      logger.error('Failed to update booking payout_status after transfer failure', {
        error: error instanceof Error ? error.message : error,
        bookingId: payout.booking.toString(),
      });
    });

    // Create audit trail
    const { createAuditTrail } = await import('./auditTrail.service');
    await createAuditTrail(
      ActionType.PAYOUT_TRANSFER_FAILED,
      ActionScale.HIGH,
      `Transfer failed for payout ${payout.id}: ${failureReason}`,
      'Payout',
      payout._id,
      {
        metadata: {
          payout_id: payout.id,
          transfer_id: transferId,
          failure_reason: failureReason,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for transfer failure', {
        error,
        payoutId: payout.id,
      });
    });

    logger.info(`Transfer failed via webhook for payout: ${payout.id}, transfer: ${transferId}`);
  } catch (error) {
    logger.error('Error handling transfer.failed webhook:', {
      error: error instanceof Error ? error.message : error,
      transferId: transfer.id,
    });
    throw error;
  }
};

/**
 * Handle refund.processed event
 */
const handleRefundProcessed = async (
  refund: any,
  _fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const refundId = refund.id;
    const paymentId = refund.payment_id;
    const amount = refund.amount ? refund.amount / 100 : 0; // Convert from paise to rupees

    logger.info('Processing refund.processed webhook', {
      refundId,
      paymentId,
      amount,
      status: refund.status,
    });

    // Find booking by payment ID
    const booking = await BookingModel.findOne({
      'payment.razorpay_payment_id': paymentId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      logger.warn(`Booking not found for refund: ${refundId}, payment: ${paymentId}`);
      return;
    }

    // Update transaction if exists
    await TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_payment_id: paymentId,
        type: 'refund',
      },
      {
        $set: {
          razorpay_refund_id: refundId,
          status: TransactionStatus.SUCCESS,
          source: TransactionSource.WEBHOOK,
          processed_at: new Date(),
        },
        $setOnInsert: {
          user: booking.user,
          booking: booking._id,
          razorpay_order_id: booking.payment.razorpay_order_id || '',
          razorpay_payment_id: paymentId,
          amount: amount,
          currency: booking.currency,
          type: TransactionType.REFUND,
          status: TransactionStatus.SUCCESS,
          source: TransactionSource.WEBHOOK,
        },
      },
      { upsert: true, new: true }
    );

    // Update booking if needed
    const isFullRefund = Math.abs(amount - booking.amount) < 0.01;
    
    // If full refund, set payout_status to REFUNDED (payout should be reversed/cancelled)
    if (isFullRefund && booking.status !== BookingStatus.CANCELLED) {
      await BookingModel.findByIdAndUpdate(booking._id, {
        $set: {
          status: BookingStatus.CANCELLED,
          'payment.status': PaymentStatus.REFUNDED,
          payout_status: BookingPayoutStatus.REFUNDED, // Full refund - payout reversed
        },
      });
    }
    // For partial refund, keep payout_status as is (payout was already done, just adjusted)

    // Handle payout adjustment
    const { PayoutModel, PayoutStatus } = await import('../../models/payout.model');
    const payout = await PayoutModel.findOne({
      booking: booking._id,
    });

    if (payout) {
      if (isFullRefund) {
        if (payout.status === PayoutStatus.PENDING) {
          payout.status = PayoutStatus.CANCELLED;
        } else if (payout.status === PayoutStatus.COMPLETED) {
          payout.status = PayoutStatus.REFUNDED;
        }
      } else {
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
    const { createAuditTrail } = await import('./auditTrail.service');
    await createAuditTrail(
      ActionType.REFUND_COMPLETED,
      ActionScale.CRITICAL,
      `Refund processed for booking ${booking.booking_id || booking.id}`,
      'Booking',
      booking._id,
      {
        bookingId: booking._id,
        metadata: {
          booking_id: booking.id,
          refund_id: refundId,
          payment_id: paymentId,
          amount,
          is_full_refund: isFullRefund,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for refund completion', {
        error,
        bookingId: booking.id,
      });
    });

    logger.info(`Refund processed via webhook for booking: ${booking.id}, refund: ${refundId}`);
  } catch (error) {
    logger.error('Error handling refund.processed webhook:', {
      error: error instanceof Error ? error.message : error,
      refundId: refund.id,
    });
    throw error;
  }
};

/**
 * Handle refund.failed event
 */
const handleRefundFailed = async (
  refund: any,
  _fullPayload: RazorpayWebhookPayload
): Promise<void> => {
  try {
    const refundId = refund.id;
    const paymentId = refund.payment_id;
    const failureReason = refund.failure_reason || 'Refund failed';

    logger.info('Processing refund.failed webhook', {
      refundId,
      paymentId,
      failureReason,
    });

    // Find booking by payment ID
    const booking = await BookingModel.findOne({
      'payment.razorpay_payment_id': paymentId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      logger.warn(`Booking not found for failed refund: ${refundId}, payment: ${paymentId}`);
      return;
    }

    // Update transaction if exists
    await TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_payment_id: paymentId,
        type: 'refund',
      },
      {
        $set: {
          razorpay_refund_id: refundId,
          status: TransactionStatus.FAILED,
          source: TransactionSource.WEBHOOK,
          failure_reason: failureReason,
        },
        $setOnInsert: {
          user: booking.user,
          booking: booking._id,
          razorpay_order_id: booking.payment.razorpay_order_id || '',
          razorpay_payment_id: paymentId,
          amount: booking.amount, // Use booking amount as fallback (refund amount not available in failed webhook)
          currency: booking.currency,
          type: TransactionType.REFUND,
          status: TransactionStatus.FAILED,
          source: TransactionSource.WEBHOOK,
        },
      },
      { upsert: true, new: true }
    );

    // Create audit trail
    const { createAuditTrail } = await import('./auditTrail.service');
    await createAuditTrail(
      ActionType.REFUND_FAILED,
      ActionScale.HIGH,
      `Refund failed for booking ${booking.booking_id || booking.id}: ${failureReason}`,
      'Booking',
      booking._id,
      {
        bookingId: booking._id,
        metadata: {
          booking_id: booking.id,
          refund_id: refundId,
          payment_id: paymentId,
          failure_reason: failureReason,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for refund failure', {
        error,
        bookingId: booking.id,
      });
    });

    logger.info(`Refund failed via webhook for booking: ${booking.id}, refund: ${refundId}`);
  } catch (error) {
    logger.error('Error handling refund.failed webhook:', {
      error: error instanceof Error ? error.message : error,
      refundId: refund.id,
    });
    throw error;
  }
};


