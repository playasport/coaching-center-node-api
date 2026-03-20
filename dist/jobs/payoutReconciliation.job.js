"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPayoutReconciliationJob = exports.executePayoutReconciliationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const booking_model_1 = require("../models/booking.model");
const transaction_model_1 = require("../models/transaction.model");
const payout_model_1 = require("../models/payout.model");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const user_model_1 = require("../models/user.model");
const payoutCreation_service_1 = require("../services/common/payoutCreation.service");
const logger_1 = require("../utils/logger");
/** Process at most this many bookings per run to avoid overload */
const MAX_BOOKINGS_PER_RUN = 100;
/**
 * Reconciliation job: create missing payout records for bookings
 * where payment was verified but payout was not created (e.g. process crash, deploy during fire-and-forget).
 * Safe to run repeatedly - createPayoutRecord is idempotent (skips if payout exists).
 */
const executePayoutReconciliationJob = async () => {
    try {
        logger_1.logger.info('Starting payout reconciliation job');
        const eligibleBookings = await booking_model_1.BookingModel.find({
            'payment.status': booking_model_1.PaymentStatus.SUCCESS,
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
            logger_1.logger.info('Payout reconciliation: no eligible bookings to process');
            return;
        }
        let created = 0;
        let skipped = 0;
        let errors = 0;
        for (const booking of eligibleBookings) {
            try {
                const existingPayout = await payout_model_1.PayoutModel.findOne({ booking: booking._id }).lean();
                if (existingPayout) {
                    skipped++;
                    continue;
                }
                const transaction = await transaction_model_1.TransactionModel.findOne({
                    booking: booking._id,
                    razorpay_order_id: booking.payment?.razorpay_order_id,
                })
                    .select('id')
                    .lean();
                if (!transaction?.id) {
                    logger_1.logger.warn('Payout reconciliation: no transaction found for booking', {
                        bookingId: booking.id,
                        razorpay_order_id: booking.payment?.razorpay_order_id,
                    });
                    errors++;
                    continue;
                }
                const center = await coachingCenter_model_1.CoachingCenterModel.findById(booking.center)
                    .select('user')
                    .lean();
                if (!center?.user) {
                    logger_1.logger.warn('Payout reconciliation: center has no academy owner', {
                        bookingId: booking.id,
                        centerId: booking.center?.toString(),
                    });
                    errors++;
                    continue;
                }
                const academyUser = await user_model_1.UserModel.findById(center.user).select('id').lean();
                if (!academyUser?.id) {
                    logger_1.logger.warn('Payout reconciliation: academy user not found', {
                        bookingId: booking.id,
                    });
                    errors++;
                    continue;
                }
                const commission = booking.commission;
                const priceBreakdown = booking.priceBreakdown;
                const result = await (0, payoutCreation_service_1.createPayoutRecord)({
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
                    logger_1.logger.info('Payout reconciliation: created missing payout', {
                        bookingId: booking.id,
                        payoutId: result.payoutId,
                    });
                }
                else if (result.skipped) {
                    skipped++;
                }
                else {
                    errors++;
                }
            }
            catch (err) {
                errors++;
                logger_1.logger.error('Payout reconciliation: failed for booking', {
                    bookingId: booking.id,
                    error: err instanceof Error ? err.message : err,
                });
            }
        }
        logger_1.logger.info('Payout reconciliation job completed', {
            total: eligibleBookings.length,
            created,
            skipped,
            errors,
        });
    }
    catch (error) {
        logger_1.logger.error('Payout reconciliation job failed', {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
};
exports.executePayoutReconciliationJob = executePayoutReconciliationJob;
/**
 * Schedule: run every hour to catch any missed payouts.
 */
const startPayoutReconciliationJob = () => {
    node_cron_1.default.schedule('0 * * * *', async () => {
        await (0, exports.executePayoutReconciliationJob)();
    });
    logger_1.logger.info('Payout reconciliation cron job scheduled - runs every hour');
};
exports.startPayoutReconciliationJob = startPayoutReconciliationJob;
//# sourceMappingURL=payoutReconciliation.job.js.map