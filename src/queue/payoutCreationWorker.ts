import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PAYOUT_CREATION_QUEUE_NAME, PayoutCreationJobData } from './payoutCreationQueue';
import { PayoutModel, PayoutStatus } from '../models/payout.model';
import { AcademyPayoutAccountModel } from '../models/academyPayoutAccount.model';
import { BookingModel } from '../models/booking.model';
import { TransactionModel } from '../models/transaction.model';
import { UserModel } from '../models/user.model';
import { createAuditTrail, ActionType, ActionScale } from '../services/common/auditTrail.service';
import { Types } from 'mongoose';
import { BookingPayoutStatus } from '../models/booking.model';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
  ...config.redis.connection,
});

const PAYOUT_CREATION_CONCURRENCY = Number(process.env.PAYOUT_CREATION_CONCURRENCY || 2);

/**
 * Create worker for processing payout creation jobs
 * This worker creates payout records when payment is verified
 */
export const payoutCreationWorker = new Worker<PayoutCreationJobData>(
  PAYOUT_CREATION_QUEUE_NAME,
  async (job) => {
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
    } = job.data;

    logger.info('Received payout creation job', {
      jobId: job.id,
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
        return { skipped: true, reason: 'Payout amount is 0 or negative' };
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
        return { skipped: true, reason: 'Payout already exists', payoutId: existingPayout.id };
      }

      // Find academy payout account
      const academyUserObjectId = new Types.ObjectId(academyUser._id);
      const payoutAccount = await AcademyPayoutAccountModel.findOne({
        user: academyUserObjectId,
        is_active: true,
        activation_status: 'activated', // Only create payout if account is activated
      }).lean();

      if (!payoutAccount) {
        logger.warn('Academy payout account not found or not activated, skipping payout creation', {
          academyUserId,
          bookingId,
        });
        return {
          skipped: true,
          reason: 'Payout account not found or not activated',
        };
      }

      // Create payout record
      const payout = new PayoutModel({
        booking: booking._id,
        transaction: transaction._id,
        academy_payout_account: payoutAccount._id,
        academy_user: academyUserObjectId,
        amount,
        batch_amount: batchAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        payout_amount: payoutAmount,
        currency,
        status: PayoutStatus.PENDING,
        razorpay_account_id: payoutAccount.razorpay_account_id,
        metadata: {
          booking_id: bookingId,
          transaction_id: transactionId,
          created_from: 'payment_verification',
        },
      });

      await payout.save();

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
        payout._id,
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
          payoutId: payout.id,
        });
      });

      logger.info('Payout creation job completed successfully', {
        jobId: job.id,
        payoutId: payout.id,
        bookingId,
        payoutAmount,
      });

      return {
        success: true,
        payoutId: payout.id,
        payoutAmount,
      };
    } catch (error: any) {
      logger.error('Payout creation job failed', {
        jobId: job.id,
        bookingId,
        transactionId,
        error: error.message || error,
        stack: error.stack,
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    concurrency: PAYOUT_CREATION_CONCURRENCY,
    connection,
  }
);

// Worker event handlers
payoutCreationWorker.on('error', (error) => {
  logger.error('Payout creation worker error', {
    error: error.message || error,
  });
});

payoutCreationWorker.on('failed', async (job, error) => {
  logger.error('Payout creation job failed permanently', {
    jobId: job?.id,
    bookingId: job?.data?.bookingId,
    attempts: job?.attemptsMade,
    error: error.message || error,
  });
});

payoutCreationWorker.on('completed', (job) => {
  logger.info('Payout creation job completed', {
    jobId: job.id,
    bookingId: job.data.bookingId,
  });
});

payoutCreationWorker.on('stalled', (jobId) => {
  logger.warn('Payout creation job stalled', { jobId });
});

payoutCreationWorker.on('ready', () => {
  logger.info('Payout creation worker ready', {
    concurrency: PAYOUT_CREATION_CONCURRENCY,
    queueName: PAYOUT_CREATION_QUEUE_NAME,
  });
});

payoutCreationWorker.on('closed', () => {
  logger.info('Payout creation worker closed');
});

/**
 * Close the payout creation worker gracefully
 */
export const closePayoutCreationWorker = async (): Promise<void> => {
  try {
    await payoutCreationWorker.close();
    logger.info('Payout creation worker closed successfully');
  } catch (error) {
    logger.error('Error closing payout creation worker', { error });
  }
};
