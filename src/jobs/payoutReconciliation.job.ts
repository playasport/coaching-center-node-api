import cron from 'node-cron';
import { BookingModel, PaymentStatus } from '../models/booking.model';
import { TransactionModel } from '../models/transaction.model';
import { PayoutModel } from '../models/payout.model';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import { UserModel } from '../models/user.model';
import { createPayoutRecord } from '../services/common/payoutCreation.service';
import { logger } from '../utils/logger';

/** Process at most this many bookings per run to avoid overload */
const MAX_BOOKINGS_PER_RUN = 100;

/**
 * Reconciliation job: create missing payout records for bookings
 * where payment was verified but payout was not created (e.g. process crash, deploy during fire-and-forget).
 * Safe to run repeatedly - createPayoutRecord is idempotent (skips if payout exists).
 */
export const executePayoutReconciliationJob = async (): Promise<void> => {
  try {
    logger.info('Starting payout reconciliation job');

    const eligibleBookings = await BookingModel.find({
      'payment.status': PaymentStatus.SUCCESS,
      'payment.razorpay_order_id': { $exists: true, $ne: null },
      commission: { $exists: true, $ne: null },
      'commission.payoutAmount': { $gt: 0 },
      priceBreakdown: { $exists: true, $ne: null },
      is_deleted: false,
    })
      .select('id _id center commission priceBreakdown payment amount currency')
      .lean()
      .limit(MAX_BOOKINGS_PER_RUN);

    if (eligibleBookings.length === 0) {
      logger.info('Payout reconciliation: no eligible bookings to process');
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const booking of eligibleBookings) {
      try {
        const existingPayout = await PayoutModel.findOne({ booking: booking._id }).lean();
        if (existingPayout) {
          skipped++;
          continue;
        }

        const transaction = await TransactionModel.findOne({
          booking: booking._id,
          razorpay_order_id: booking.payment?.razorpay_order_id,
        })
          .select('id')
          .lean();

        if (!transaction?.id) {
          logger.warn('Payout reconciliation: no transaction found for booking', {
            bookingId: booking.id,
            razorpay_order_id: booking.payment?.razorpay_order_id,
          });
          errors++;
          continue;
        }

        const center = await CoachingCenterModel.findById(booking.center)
          .select('user')
          .lean();

        if (!center?.user) {
          logger.warn('Payout reconciliation: center has no academy owner', {
            bookingId: booking.id,
            centerId: booking.center?.toString(),
          });
          errors++;
          continue;
        }

        const academyUser = await UserModel.findById(center.user).select('id').lean();
        if (!academyUser?.id) {
          logger.warn('Payout reconciliation: academy user not found', {
            bookingId: booking.id,
          });
          errors++;
          continue;
        }

        const commission = booking.commission!;
        const priceBreakdown = booking.priceBreakdown!;

        const result = await createPayoutRecord({
          bookingId: booking.id,
          transactionId: transaction.id,
          academyUserId: academyUser.id,
          amount: booking.amount ?? 0,
          batchAmount: priceBreakdown.batch_amount,
          commissionRate: commission.rate,
          commissionAmount: commission.amount,
          payoutAmount: commission.payoutAmount,
          currency: booking.currency ?? 'INR',
        });

        if (result.success && !result.skipped) {
          created++;
          logger.info('Payout reconciliation: created missing payout', {
            bookingId: booking.id,
            payoutId: result.payoutId,
          });
        } else if (result.skipped) {
          skipped++;
        } else {
          errors++;
        }
      } catch (err) {
        errors++;
        logger.error('Payout reconciliation: failed for booking', {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    logger.info('Payout reconciliation job completed', {
      total: eligibleBookings.length,
      created,
      skipped,
      errors,
    });
  } catch (error) {
    logger.error('Payout reconciliation job failed', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

/**
 * Schedule: run every hour to catch any missed payouts.
 */
export const startPayoutReconciliationJob = (): void => {
  cron.schedule('0 * * * *', async () => {
    await executePayoutReconciliationJob();
  });
  logger.info('Payout reconciliation cron job scheduled - runs every hour');
};
