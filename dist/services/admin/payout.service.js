"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayoutStats = exports.cancelPayout = exports.retryTransfer = exports.createTransfer = exports.getPayoutById = exports.getPayouts = void 0;
const payout_model_1 = require("../../models/payout.model");
const booking_model_1 = require("../../models/booking.model");
const transaction_model_1 = require("../../models/transaction.model");
const academyPayoutAccount_model_1 = require("../../models/academyPayoutAccount.model");
const user_model_1 = require("../../models/user.model");
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
const auditTrail_service_1 = require("../common/auditTrail.service");
const auditTrail_model_1 = require("../../models/auditTrail.model");
const payoutTransferQueue_1 = require("../../queue/payoutTransferQueue");
/**
 * Get all payouts with filters and pagination
 */
const getPayouts = async (filters) => {
    try {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        // Build query
        const query = {};
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.academyUserId) {
            const academyUser = await user_model_1.UserModel.findOne({ id: filters.academyUserId }).select('_id').lean();
            if (academyUser) {
                query.academy_user = academyUser._id;
            }
            else {
                // User not found, return empty result
                return {
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                };
            }
        }
        if (filters.bookingId) {
            const booking = await booking_model_1.BookingModel.findOne({ id: filters.bookingId }).select('_id').lean();
            if (booking) {
                query.booking = booking._id;
            }
            else {
                return {
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                };
            }
        }
        if (filters.transactionId) {
            const transaction = await transaction_model_1.TransactionModel.findOne({ id: filters.transactionId }).select('_id').lean();
            if (transaction) {
                query.transaction = transaction._id;
            }
            else {
                return {
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                };
            }
        }
        if (filters.dateFrom || filters.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) {
                query.createdAt.$gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                query.createdAt.$lte = filters.dateTo;
            }
        }
        // Get total count
        const total = await payout_model_1.PayoutModel.countDocuments(query);
        // Get payouts with pagination
        const payouts = await payout_model_1.PayoutModel.find(query)
            .populate('booking', 'id booking_id status amount')
            .populate('transaction', 'id razorpay_payment_id status amount')
            .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
            .populate('academy_user', 'id firstName lastName email mobile')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalPages = Math.ceil(total / limit);
        return {
            data: payouts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Error fetching payouts:', {
            error: error.message || error,
            filters,
        });
        throw new ApiError_1.ApiError(500, 'Failed to fetch payouts');
    }
};
exports.getPayouts = getPayouts;
/**
 * Get payout by ID
 */
const getPayoutById = async (payoutId) => {
    try {
        const payout = await payout_model_1.PayoutModel.findOne({ id: payoutId })
            .populate('booking', 'id booking_id status amount currency payment')
            .populate('transaction', 'id razorpay_payment_id status amount currency')
            .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
            .populate('academy_user', 'id firstName lastName email mobile')
            .lean();
        return payout;
    }
    catch (error) {
        logger_1.logger.error('Error fetching payout:', {
            error: error.message || error,
            payoutId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to fetch payout');
    }
};
exports.getPayoutById = getPayoutById;
/**
 * Create transfer for a payout
 */
const createTransfer = async (payoutId, adminUserId, options) => {
    try {
        // Find payout
        const payout = await payout_model_1.PayoutModel.findOne({ id: payoutId })
            .populate('academy_payout_account')
            .populate('academy_user')
            .populate('booking');
        if (!payout) {
            throw new ApiError_1.ApiError(404, 'Payout not found');
        }
        // Validate payout status
        if (payout.status !== payout_model_1.PayoutStatus.PENDING && payout.status !== payout_model_1.PayoutStatus.FAILED) {
            throw new ApiError_1.ApiError(400, `Cannot initiate transfer for payout in ${payout.status} status`);
        }
        // Find payout account - first try from payout reference, then from academy_user
        let payoutAccount = null;
        if (payout.academy_payout_account) {
            // Try to find account from payout reference
            payoutAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findById(payout.academy_payout_account);
        }
        // If account not found from reference, try to find by academy_user
        if (!payoutAccount) {
            logger_1.logger.info('Payout account not found in payout reference, searching by academy_user', {
                payoutId,
                academyUserId: payout.academy_user,
            });
            payoutAccount = await academyPayoutAccount_model_1.AcademyPayoutAccountModel.findOne({
                user: payout.academy_user,
                is_active: true,
            });
            // If found, update the payout record with the account reference
            if (payoutAccount) {
                payout.academy_payout_account = payoutAccount._id;
                await payout.save();
                logger_1.logger.info('Updated payout with academy_payout_account reference', {
                    payoutId,
                    accountId: payoutAccount.id,
                });
            }
        }
        // Validate payout account (required for transfer initiation)
        if (!payoutAccount || !payoutAccount.is_active) {
            throw new ApiError_1.ApiError(400, 'Payout account not found or inactive. Please create and activate payout account first.');
        }
        if (payoutAccount.activation_status !== 'activated') {
            throw new ApiError_1.ApiError(400, 'Payout account is not activated. Please activate the account first.');
        }
        if (payoutAccount.ready_for_payout !== 'ready') {
            throw new ApiError_1.ApiError(400, 'Payout account is not ready for payouts');
        }
        // Validate payout amount
        if (payout.payout_amount <= 0) {
            throw new ApiError_1.ApiError(400, 'Payout amount must be greater than 0');
        }
        // Check if transfer already exists
        if (payout.razorpay_transfer_id) {
            throw new ApiError_1.ApiError(400, 'Transfer already initiated for this payout');
        }
        // Get razorpay_account_id from the populated account reference
        const accountId = payoutAccount?.razorpay_account_id;
        if (!accountId) {
            throw new ApiError_1.ApiError(400, 'Academy payout account does not have a Razorpay account ID. Account may not be activated.');
        }
        // Enqueue transfer job (will be processed in background)
        await (0, payoutTransferQueue_1.enqueuePayoutTransfer)({
            payoutId: payout.id,
            accountId: accountId,
            amount: payout.payout_amount,
            currency: payout.currency,
            notes: {
                payout_id: payout.id,
                booking_id: payout.booking?.id || payout.booking.toString(),
                transaction_id: payout.transaction.toString(),
                academy_user_id: payout.academy_user?.id || payout.academy_user.toString(),
            },
            adminUserId,
        });
        // Update payout status to processing
        payout.status = payout_model_1.PayoutStatus.PROCESSING;
        await payout.save();
        // Create audit trail
        const adminUser = await user_model_1.UserModel.findOne({ id: adminUserId }).select('_id').lean();
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYOUT_TRANSFER_INITIATED, auditTrail_model_1.ActionScale.CRITICAL, `Transfer initiated for payout ${payoutId}`, 'Payout', payout._id, {
            userId: adminUser?._id || null,
            metadata: {
                payout_id: payoutId,
                payout_amount: payout.payout_amount,
                account_id: accountId,
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for transfer initiation', {
                error,
                payoutId,
            });
        });
        logger_1.logger.info('Payout transfer initiated', {
            payoutId,
            amount: payout.payout_amount,
            accountId: accountId,
            adminUserId,
        });
        // Reload payout with populated fields
        const updatedPayout = await payout_model_1.PayoutModel.findOne({ id: payoutId })
            .populate('booking', 'id booking_id status amount')
            .populate('transaction', 'id razorpay_payment_id status amount')
            .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
            .populate('academy_user', 'id firstName lastName email mobile')
            .lean();
        return updatedPayout;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Error creating transfer:', {
            error: error.message || error,
            payoutId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to create transfer');
    }
};
exports.createTransfer = createTransfer;
/**
 * Retry failed transfer
 */
const retryTransfer = async (payoutId, adminUserId, options) => {
    try {
        const payout = await payout_model_1.PayoutModel.findOne({ id: payoutId });
        if (!payout) {
            throw new ApiError_1.ApiError(404, 'Payout not found');
        }
        if (payout.status !== payout_model_1.PayoutStatus.FAILED) {
            throw new ApiError_1.ApiError(400, 'Can only retry failed payouts');
        }
        // Reset failure reason and retry
        payout.failure_reason = null;
        await payout.save();
        // Create transfer again
        return await (0, exports.createTransfer)(payoutId, adminUserId, options);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Error retrying transfer:', {
            error: error.message || error,
            payoutId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to retry transfer');
    }
};
exports.retryTransfer = retryTransfer;
/**
 * Cancel payout
 */
const cancelPayout = async (payoutId, adminUserId, reason, options) => {
    try {
        const payout = await payout_model_1.PayoutModel.findOne({ id: payoutId });
        if (!payout) {
            throw new ApiError_1.ApiError(404, 'Payout not found');
        }
        if (payout.status !== payout_model_1.PayoutStatus.PENDING) {
            throw new ApiError_1.ApiError(400, `Cannot cancel payout in ${payout.status} status`);
        }
        // Update payout status
        payout.status = payout_model_1.PayoutStatus.CANCELLED;
        payout.failure_reason = reason;
        await payout.save();
        // Create audit trail
        const adminUser = await user_model_1.UserModel.findOne({ id: adminUserId }).select('_id').lean();
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYOUT_CANCELLED, auditTrail_model_1.ActionScale.HIGH, `Payout cancelled: ${reason}`, 'Payout', payout._id, {
            userId: adminUser?._id || null,
            metadata: {
                payout_id: payoutId,
                reason,
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for payout cancellation', {
                error,
                payoutId,
            });
        });
        logger_1.logger.info('Payout cancelled', {
            payoutId,
            reason,
            adminUserId,
        });
        // Reload payout with populated fields
        const updatedPayout = await payout_model_1.PayoutModel.findOne({ id: payoutId })
            .populate('booking', 'id booking_id status amount')
            .populate('transaction', 'id razorpay_payment_id status amount')
            .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
            .populate('academy_user', 'id firstName lastName email mobile')
            .lean();
        return updatedPayout;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Error cancelling payout:', {
            error: error.message || error,
            payoutId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to cancel payout');
    }
};
exports.cancelPayout = cancelPayout;
/**
 * Get payout statistics
 */
const getPayoutStats = async (filters) => {
    try {
        const query = {};
        if (filters?.academyUserId) {
            const academyUser = await user_model_1.UserModel.findOne({ id: filters.academyUserId }).select('_id').lean();
            if (academyUser) {
                query.academy_user = academyUser._id;
            }
        }
        if (filters?.dateFrom || filters?.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) {
                query.createdAt.$gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                query.createdAt.$lte = filters.dateTo;
            }
        }
        const stats = await payout_model_1.PayoutModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    total_amount: { $sum: '$payout_amount' },
                },
            },
        ]);
        const result = {
            total_pending: 0,
            total_processing: 0,
            total_completed: 0,
            total_failed: 0,
            total_pending_amount: 0,
            total_completed_amount: 0,
            total_failed_amount: 0,
        };
        stats.forEach((stat) => {
            const status = stat._id;
            const count = stat.count;
            const amount = stat.total_amount;
            if (status === payout_model_1.PayoutStatus.PENDING) {
                result.total_pending = count;
                result.total_pending_amount = amount;
            }
            else if (status === payout_model_1.PayoutStatus.PROCESSING) {
                result.total_processing = count;
            }
            else if (status === payout_model_1.PayoutStatus.COMPLETED) {
                result.total_completed = count;
                result.total_completed_amount = amount;
            }
            else if (status === payout_model_1.PayoutStatus.FAILED) {
                result.total_failed = count;
                result.total_failed_amount = amount;
            }
        });
        return result;
    }
    catch (error) {
        logger_1.logger.error('Error fetching payout stats:', {
            error: error.message || error,
            filters,
        });
        throw new ApiError_1.ApiError(500, 'Failed to fetch payout statistics');
    }
};
exports.getPayoutStats = getPayoutStats;
//# sourceMappingURL=payout.service.js.map