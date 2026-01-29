import { Types } from 'mongoose';
import { logger } from '../../utils/logger';
import { PayoutModel, PayoutStatus } from '../../models/payout.model';
import { AcademyPayoutAccountModel } from '../../models/academyPayoutAccount.model';
import { BookingModel } from '../../models/booking.model';
import { TransactionModel } from '../../models/transaction.model';
import { UserModel } from '../../models/user.model';
import { createAuditTrail } from './auditTrail.service';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import { BookingPayoutStatus } from '../../models/booking.model';

export interface CreatePayoutParams {
  bookingId: string;
  transactionId: string;
  academyUserId: string;
  amount: number;
  batchAmount: number;
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
  currency: string;
}

/**
 * Create payout record directly (synchronous)
 * This replaces the queue-based payout creation
 */
export const createPayoutRecord = async (params: CreatePayoutParams): Promise<{ success: boolean; payoutId?: string; skipped?: boolean; reason?: string }> => {
  const {
    bookingId,
    transactionId,
    academyUserId,
    amount,
    batchAmount,
    commissionRate,
    commissionAmount,
    payoutAmount,
    currency,
  } = params;

  logger.info('Creating payout record directly', {
    bookingId,
    transactionId,
    academyUserId,
    payoutAmount,
  });

  try {
    // Validate data
    if (!bookingId || !transactionId || !academyUserId) {
      throw new Error('Missing required fields: bookingId, transactionId, or academyUserId');
    }

    if (payoutAmount <= 0) {
      logger.warn('Payout amount is 0 or negative, skipping payout creation', {
        bookingId,
        payoutAmount,
      });
      return { success: false, skipped: true, reason: 'Payout amount is 0 or negative' };
    }

    // Find booking
    const booking = await BookingModel.findOne({ id: bookingId }).lean();
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // Find transaction
    const transaction = await TransactionModel.findOne({ id: transactionId }).lean();
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Find academy user
    const academyUser = await UserModel.findOne({ id: academyUserId }).lean();
    if (!academyUser) {
      throw new Error(`Academy user not found: ${academyUserId}`);
    }

    // Check if payout already exists (idempotency)
    const existingPayout = await PayoutModel.findOne({
      booking: booking._id,
      transaction: transaction._id,
    }).lean();

    if (existingPayout) {
      logger.info('Payout already exists for this booking and transaction', {
        payoutId: existingPayout.id,
        bookingId,
        transactionId,
      });
      return { success: true, skipped: true, reason: 'Payout already exists', payoutId: existingPayout.id };
    }

    // Find academy payout account (optional - payout can be created even without account)
    const academyUserObjectId = new Types.ObjectId(academyUser._id);
    const payoutAccount = await AcademyPayoutAccountModel.findOne({
      user: academyUserObjectId,
      is_active: true,
      // Removed activation_status check - payout will be created regardless, admin will handle transaction initiation
    }).lean();

    // Log if account not found (but don't block payout creation)
    if (!payoutAccount) {
      logger.info('Creating payout without payout account (account will be created later, admin will handle transaction initiation)', {
        academyUserId,
        bookingId,
      });
    } else if (payoutAccount.activation_status !== 'activated') {
      logger.info('Creating payout for non-activated account (admin will handle transaction initiation)', {
        academyUserId,
        bookingId,
        activation_status: payoutAccount.activation_status,
      });
    }

    // Create payout record (academy_payout_account can be null if account not created yet)
    const payoutData = {
      booking: booking._id,
      transaction: transaction._id,
      academy_payout_account: payoutAccount?._id || null, // Can be null if account not found
      academy_user: academyUserObjectId,
      amount,
      batch_amount: batchAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      payout_amount: payoutAmount,
      currency,
      status: PayoutStatus.PENDING,
      metadata: {
        booking_id: bookingId,
        transaction_id: transactionId,
        created_from: 'payment_verification',
      },
    };

    logger.info('Creating payout record with data', {
      bookingId,
      transactionId,
      payoutData: {
        ...payoutData,
        booking: payoutData.booking.toString(),
        transaction: payoutData.transaction.toString(),
        academy_payout_account: payoutData.academy_payout_account?.toString() || null,
        academy_user: payoutData.academy_user.toString(),
      },
    });

    const payout = new PayoutModel(payoutData);
    const savedPayout = await payout.save();

    logger.info('Payout record saved to database', {
      payoutId: savedPayout.id,
      _id: savedPayout._id,
      bookingId,
    });

    // Update booking payout_status to PENDING (payout record created, waiting for transfer)
    await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          payout_status: BookingPayoutStatus.PENDING,
        },
      }
    ).catch((error) => {
      logger.error('Failed to update booking payout_status', {
        error: error instanceof Error ? error.message : error,
        bookingId,
      });
    });

    // Create audit trail
    await createAuditTrail(
      ActionType.PAYOUT_CREATED,
      ActionScale.HIGH,
      `Payout created for booking ${booking.booking_id || bookingId}`,
      'Payout',
      savedPayout._id,
      {
        userId: academyUserObjectId,
        bookingId: booking._id,
        metadata: {
          booking_id: bookingId,
          transaction_id: transactionId,
          payout_amount: payoutAmount,
          commission_amount: commissionAmount,
          batch_amount: batchAmount,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for payout creation', {
        error,
        payoutId: savedPayout.id,
      });
    });

    logger.info('Payout record created successfully', {
      payoutId: savedPayout.id,
      _id: savedPayout._id.toString(),
      bookingId,
      payoutAmount,
    });

    return {
      success: true,
      payoutId: savedPayout.id,
    };
  } catch (error: any) {
    logger.error('Failed to create payout record', {
      bookingId,
      transactionId,
      error: error.message || error,
      stack: error.stack,
    });
    throw error;
  }
};
