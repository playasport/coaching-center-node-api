import { BookingModel, BookingStatus, PaymentStatus, BookingPayoutStatus } from '../../models/booking.model';
import { TransactionModel, TransactionStatus, TransactionType } from '../../models/transaction.model';
import { PayoutModel, PayoutStatus } from '../../models/payout.model';
import { razorpayRouteService } from '../common/payment/razorpayRoute.service';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { createAuditTrail } from '../common/auditTrail.service';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import { UserModel } from '../../models/user.model';
import { createAndSendNotification } from '../common/notification.service';
import { queueEmail, queueSms } from '../common/notificationQueue.service';
import {
  EmailSubjects,
  getBookingRefundedUserEmailText,
  getBookingRefundedAcademyPush,
} from '../common/notificationMessages';

/**
 * Create refund for a booking
 */
export const createRefund = async (
  bookingId: string,
  adminUserId: string,
  refundData: {
    amount?: number; // If not provided, full refund
    reason: string;
  },
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<{
  booking: any;
  refund: any;
  payout?: any;
}> => {
  try {
    // Find booking
    const booking = await BookingModel.findOne({ id: bookingId })
      .populate('user', 'id firstName lastName email mobile')
      .populate('center', 'id center_name user email mobile_number')
      .populate('batch', 'id name')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Validate booking status
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ApiError(400, `Cannot refund booking in ${booking.status} status. Only confirmed bookings can be refunded.`);
    }

    // Validate payment status
    if (booking.payment.status !== PaymentStatus.SUCCESS) {
      throw new ApiError(400, `Cannot refund booking with payment status: ${booking.payment.status}. Payment must be successful.`);
    }

    if (!booking.payment.razorpay_payment_id) {
      throw new ApiError(400, 'Razorpay payment ID not found. Cannot process refund.');
    }

    // Validate refund amount
    const refundAmount = refundData.amount || booking.amount;
    if (refundAmount <= 0) {
      throw new ApiError(400, 'Refund amount must be greater than 0');
    }

    if (refundAmount > booking.amount) {
      throw new ApiError(400, 'Refund amount cannot exceed booking amount');
    }

    // Check if refund already exists
    const existingRefundTransaction = await TransactionModel.findOne({
      booking: booking._id,
      type: TransactionType.REFUND,
      status: TransactionStatus.SUCCESS,
    }).lean();

    if (existingRefundTransaction) {
      throw new ApiError(400, 'Refund already processed for this booking');
    }

    // Create refund in Razorpay
    const razorpayRefund = await razorpayRouteService.createRefund(
      booking.payment.razorpay_payment_id,
      refundData.amount, // undefined = full refund
      {
        booking_id: bookingId,
        booking_booking_id: booking.booking_id || bookingId,
        reason: refundData.reason,
        refunded_by: 'admin',
        admin_user_id: adminUserId,
      }
    );

    // Convert refund amount from paise to rupees
    const refundAmountInRupees = razorpayRefund.amount ? razorpayRefund.amount / 100 : booking.amount;

    // Update booking status and adjust payout_status
    const isFullRefund = Math.abs(refundAmountInRupees - booking.amount) < 0.01;
    
    // If full refund, set payout_status to REFUNDED (payout should be reversed/cancelled)
    // For partial refund, keep payout_status as is (payout was already done, just adjusted)

    const updatedBooking = await BookingModel.findOneAndUpdate(
      { id: bookingId },
      {
        $set: {
          status: isFullRefund ? BookingStatus.CANCELLED : BookingStatus.CONFIRMED,
          'payment.status': isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.SUCCESS,
          cancellation_reason: isFullRefund ? `Refunded: ${refundData.reason}` : null,
          cancelled_by: isFullRefund ? 'system' : null,
          payout_status: isFullRefund ? BookingPayoutStatus.REFUNDED : booking.payout_status, // Set to REFUNDED for full refund, keep existing for partial
        },
      },
      { new: true }
    )
      .populate('user', 'id firstName lastName email mobile')
      .populate('center', 'id center_name user email mobile_number')
      .populate('batch', 'id name')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to update booking');
    }

    // Create refund transaction
    const refundTransaction = new TransactionModel({
      booking: booking._id,
      user: booking.user,
      razorpay_order_id: booking.payment.razorpay_order_id || '',
      razorpay_payment_id: booking.payment.razorpay_payment_id,
      razorpay_refund_id: razorpayRefund.id,
      type: TransactionType.REFUND,
      status: TransactionStatus.SUCCESS,
      source: 'manual',
      amount: refundAmountInRupees,
      currency: booking.currency,
      payment_method: booking.payment.payment_method,
      processed_at: new Date(),
      metadata: {
        refund_reason: refundData.reason,
        refunded_by: 'admin',
        admin_user_id: adminUserId,
        razorpay_refund_id: razorpayRefund.id,
      },
    });

    await refundTransaction.save();

    // Handle payout adjustment if payout exists
    let updatedPayout = null;
    const payout = await PayoutModel.findOne({
      booking: booking._id,
    });

    if (payout) {
      // Calculate adjusted payout amount
      // If full refund: payout should be cancelled
      // If partial refund: adjust payout amount proportionally
      if (isFullRefund) {
        // Full refund - cancel payout if pending, mark as refunded if completed
        if (payout.status === PayoutStatus.PENDING) {
          payout.status = PayoutStatus.CANCELLED;
          payout.failure_reason = `Booking refunded: ${refundData.reason}`;
        } else if (payout.status === PayoutStatus.COMPLETED) {
          // Payout already completed - mark as refunded (reversal needed)
          payout.status = PayoutStatus.REFUNDED;
          payout.refund_amount = refundAmountInRupees;
          payout.adjusted_payout_amount = 0;
        }
      } else {
        // Partial refund - adjust payout amount proportionally
        const refundPercentage = refundAmountInRupees / booking.amount;
        const adjustedPayoutAmount = payout.payout_amount * (1 - refundPercentage);
        payout.refund_amount = refundAmountInRupees;
        payout.adjusted_payout_amount = Math.max(0, adjustedPayoutAmount);
        // Note: If payout is completed, we can't adjust it, so we mark it for review
        if (payout.status === PayoutStatus.COMPLETED) {
          payout.status = PayoutStatus.REFUNDED;
        }
      }

      await payout.save();

      // Create audit trail for payout refund
      await createAuditTrail(
        ActionType.PAYOUT_REFUNDED,
        ActionScale.CRITICAL,
        `Payout refunded for booking ${bookingId}: ${refundData.reason}`,
        'Payout',
        payout._id,
        {
          bookingId: booking._id,
          metadata: {
            booking_id: bookingId,
            refund_amount: refundAmountInRupees,
            is_full_refund: isFullRefund,
            reason: refundData.reason,
          },
        }
      ).catch((error) => {
        logger.error('Failed to create audit trail for payout refund', {
          error,
          payoutId: payout.id,
        });
      });

      updatedPayout = payout;
    }

    // Create audit trail for refund
    const adminUser = await UserModel.findOne({ id: adminUserId }).select('_id').lean();
    await createAuditTrail(
      ActionType.REFUND_INITIATED,
      ActionScale.CRITICAL,
      `Refund initiated for booking ${booking.booking_id || bookingId}: ${refundData.reason}`,
      'Booking',
      booking._id,
      {
        userId: adminUser?._id || null,
        bookingId: booking._id,
        metadata: {
          booking_id: bookingId,
          refund_amount: refundAmountInRupees,
          is_full_refund: isFullRefund,
          reason: refundData.reason,
          razorpay_refund_id: razorpayRefund.id,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for refund', {
        error,
        bookingId,
      });
    });

    // Send notifications
    const user = booking.user as any;
    const center = booking.center as any;
    const centerOwner = center?.user
      ? await UserModel.findById(center.user).select('id email mobile').lean()
      : null;

    // Notify user
    if (user?.email) {
      try {
        queueEmail(
          user.email,
          EmailSubjects.BOOKING_REFUNDED_USER,
          {
            text: getBookingRefundedUserEmailText({
              userName: user.firstName || 'User',
              bookingId: booking.booking_id || '',
              amount: refundAmountInRupees.toFixed(2),
              reason: refundData.reason,
              refundId: razorpayRefund.id,
            }),
            priority: 'high',
            metadata: {
              type: 'booking_refunded',
              bookingId: booking.id,
              recipient: 'user',
            },
          }
        );
      } catch (error: unknown) {
        logger.error('Failed to queue email for refund', {
          error: error instanceof Error ? error.message : error,
          bookingId,
        });
      }
    }

    if (user?.mobile) {
      try {
        const smsMessage = `Your booking ${booking.booking_id} has been refunded. Amount: ₹${refundAmountInRupees.toFixed(2)}. Refund ID: ${razorpayRefund.id}. - Play A Sport`;
        queueSms(user.mobile, smsMessage, 'high', {
          type: 'booking_refunded',
          bookingId: booking.id,
          recipient: 'user',
        });
      } catch (error: unknown) {
        logger.error('Failed to queue SMS for refund', {
          error: error instanceof Error ? error.message : error,
          bookingId,
        });
      }
    }

    // Notify academy
    if (centerOwner) {
      const academyPushNotification = getBookingRefundedAcademyPush({
        bookingId: booking.booking_id || bookingId,
        amount: refundAmountInRupees.toFixed(2),
      });
      createAndSendNotification({
        recipientType: 'academy',
        recipientId: centerOwner.id,
        title: academyPushNotification.title,
        body: academyPushNotification.body,
        channels: ['push'],
        priority: 'high',
        data: {
          type: 'booking_refunded',
          bookingId: bookingId,
          refundAmount: refundAmountInRupees,
        },
      }).catch((error) => {
        logger.error('Failed to send notification for refund', { error, bookingId });
      });
    }

    logger.info('Refund created successfully', {
      bookingId,
      refundId: razorpayRefund.id,
      refundAmount: refundAmountInRupees,
      isFullRefund,
      adminUserId,
    });

    return {
      booking: updatedBooking,
      refund: razorpayRefund,
      payout: updatedPayout,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error creating refund:', {
      error: error.message || error,
      bookingId,
    });
    throw new ApiError(500, 'Failed to create refund');
  }
};

/**
 * Get refund details
 */
export const getRefundDetails = async (refundId: string): Promise<any> => {
  try {
    const refund = await razorpayRouteService.getRefundDetails(refundId);
    return refund;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error fetching refund details:', {
      error: error.message || error,
      refundId,
    });
    throw new ApiError(500, 'Failed to fetch refund details');
  }
};
