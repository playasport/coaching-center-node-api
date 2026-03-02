"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayoutRecord = void 0;
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
const payout_model_1 = require("../../models/payout.model");
const academyPayoutAccount_model_1 = require("../../models/academyPayoutAccount.model");
const booking_model_1 = require("../../models/booking.model");
const transaction_model_1 = require("../../models/transaction.model");
const user_model_1 = require("../../models/user.model");
const auditTrail_service_1 = require("./auditTrail.service");
const auditTrail_model_1 = require("../../models/auditTrail.model");
const booking_model_2 = require("../../models/booking.model");
/**
 * Create payout record directly (synchronous)
 * This replaces the queue-based payout creation
 */
const createPayoutRecord = async (params) => {
    const { bookingId, transactionId, academyUserId, amount, batchAmount, commissionRate, commissionAmount, payoutAmount, currency, } = params;
    logger_1.logger.info('Creating payout record directly', {
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
            logger_1.logger.warn('Payout amount is 0 or negative, skipping payout creation', {
                bookingId,
                payoutAmount,
            });
            return { success: false, skipped: true, reason: 'Payout amount is 0 or negative' };
        }
        // Find booking
        const booking = await booking_model_1.BookingModel.findOne({ id: bookingId }).lean();
        if (!booking) {
            throw new Error(`Booking not found: ${bookingId}`);
        }
        // Find transaction
        const transaction = await transaction_model_1.TransactionModel.findOne({ id: transactionId }).lean();
        if (!transaction) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }
        // Find academy user
        const academyUser = await user_model_1.UserModel.findOne({ id: academyUserId }).lean();
        if (!academyUser) {
            throw new Error(`Academy user not found: ${academyUserId}`);
        }
        // Check if payout already exists (idempotency)
        const existingPayout = await payout_model_1.PayoutModel.findOne({
            booking: booking._id,
            transaction: transaction._id,
        }).lean();
        if (existingPayout) {
            logger_1.logger.info('Payout already exists for this booking and transaction', {
                payoutId: existingPayout.id,
                bookingId,
                transactionId,
            });
            return { success: true, skipped: true, reason: 'Payout already exists', payoutId: existingPayout.id };
        }
        // Find academy payout account (optional - payout can be created even without account)
        const academyUserObjectId = new mongoose_1.Types.ObjectId(academyUser._id);
        const payoutAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOne({
            user: academyUserObjectId,
            is_active: true,
            // Removed activation_status check - payout will be created regardless, admin will handle transaction initiation
        }).lean();
        // Log if account not found (but don't block payout creation)
        if (!payoutAccount) {
            logger_1.logger.info('Creating payout without payout account (account will be created later, admin will handle transaction initiation)', {
                academyUserId,
                bookingId,
            });
        }
        else if (payoutAccount.activation_status !== 'activated') {
            logger_1.logger.info('Creating payout for non-activated account (admin will handle transaction initiation)', {
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
            status: payout_model_1.PayoutStatus.PENDING,
            metadata: {
                booking_id: bookingId,
                transaction_id: transactionId,
                created_from: 'payment_verification',
            },
        };
        logger_1.logger.info('Creating payout record with data', {
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
        const payout = new payout_model_1.PayoutModel(payoutData);
        const savedPayout = await payout.save();
        logger_1.logger.info('Payout record saved to database', {
            payoutId: savedPayout.id,
            _id: savedPayout._id,
            bookingId,
        });
        // Update booking payout_status to PENDING (payout record created, waiting for transfer)
        await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                payout_status: booking_model_2.BookingPayoutStatus.PENDING,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to update booking payout_status', {
                error: error instanceof Error ? error.message : error,
                bookingId,
            });
        });
        // Create audit trail
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYOUT_CREATED, auditTrail_model_1.ActionScale.HIGH, `Payout created for booking ${booking.booking_id || bookingId}`, 'Payout', savedPayout._id, {
            userId: academyUserObjectId,
            bookingId: booking._id,
            metadata: {
                booking_id: bookingId,
                transaction_id: transactionId,
                payout_amount: payoutAmount,
                commission_amount: commissionAmount,
                batch_amount: batchAmount,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for payout creation', {
                error,
                payoutId: savedPayout.id,
            });
        });
        logger_1.logger.info('Payout record created successfully', {
            payoutId: savedPayout.id,
            _id: savedPayout._id.toString(),
            bookingId,
            payoutAmount,
        });
        return {
            success: true,
            payoutId: savedPayout.id,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to create payout record', {
            bookingId,
            transactionId,
            error: error.message || error,
            stack: error.stack,
        });
        throw error;
    }
};
exports.createPayoutRecord = createPayoutRecord;
//# sourceMappingURL=payoutCreation.service.js.map