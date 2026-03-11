"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionStats = exports.updateTransactionStatus = exports.getTransactionById = exports.getAllTransactions = void 0;
const mongoose_1 = require("mongoose");
const transaction_model_1 = require("../../models/transaction.model");
const booking_model_1 = require("../../models/booking.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
/**
 * Get all transactions for admin with filters and pagination
 */
const getAllTransactions = async (params = {}) => {
    try {
        const query = {};
        // Filter by user if provided
        if (params.userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(params.userId);
            if (userObjectId) {
                query.user = userObjectId;
            }
        }
        // Filter by booking if provided
        if (params.bookingId) {
            const queryId = mongoose_1.Types.ObjectId.isValid(params.bookingId)
                ? { _id: new mongoose_1.Types.ObjectId(params.bookingId) }
                : { id: params.bookingId };
            const booking = await booking_model_1.BookingModel.findOne(queryId).lean();
            if (booking) {
                query.booking = booking._id;
            }
        }
        // Filter by status if provided
        if (params.status) {
            query.status = params.status;
        }
        // Filter by type if provided
        if (params.type) {
            query.type = params.type;
        }
        // Filter by source if provided
        if (params.source) {
            query.source = params.source;
        }
        // Date range filter
        if (params.startDate || params.endDate) {
            query.createdAt = {};
            if (params.startDate) {
                query.createdAt.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                const endDate = new Date(params.endDate);
                endDate.setHours(23, 59, 59, 999); // End of day
                query.createdAt.$lte = endDate;
            }
        }
        // Search by transaction ID, Razorpay order ID, payment ID, or refund ID
        if (params.search) {
            const searchRegex = new RegExp(params.search, 'i');
            query.$or = [
                { id: searchRegex },
                { razorpay_order_id: searchRegex },
                { razorpay_payment_id: searchRegex },
                { razorpay_refund_id: searchRegex },
            ];
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Sorting
        const sortBy = params.sortBy || 'created_at';
        const sortField = sortBy === 'created_at' || sortBy === 'createdAt'
            ? 'createdAt'
            : sortBy;
        const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await transaction_model_1.TransactionModel.countDocuments(query);
        // Get transactions with population
        const transactions = await transaction_model_1.TransactionModel.find(query)
            .select('-razorpay_signature')
            .populate('user', 'firstName lastName email mobile')
            .populate({
            path: 'booking',
            select: 'id booking_id',
            match: { is_deleted: false },
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const transformedTransactions = transactions
            .filter((tx) => tx.booking) // Filter out transactions with deleted bookings
            .map((transaction) => {
            return {
                id: transaction.id || transaction._id,
                transaction_id: transaction.razorpay_payment_id || transaction.id,
                booking_id: transaction.booking?.booking_id || transaction.booking?.id || 'N/A',
                user_name: transaction.user
                    ? `${transaction.user.firstName || ''} ${transaction.user.lastName || ''}`.trim()
                    : 'N/A',
                user_email: transaction.user?.email || 'N/A',
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                payment_method: transaction.payment_method || null,
                failure_reason: transaction.failure_reason || null,
                processed_at: transaction.processed_at || null,
                created_at: transaction.createdAt,
            };
        });
        return {
            transactions: transformedTransactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get transactions:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllTransactions = getAllTransactions;
/**
 * Get transaction by ID for admin
 */
const getTransactionById = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const transaction = await transaction_model_1.TransactionModel.findOne(query)
            .select('-razorpay_signature -updatedAt -createdAt')
            .populate('user', 'id firstName lastName email mobile profileImage')
            .populate({
            path: 'booking',
            select: 'id booking_id amount currency status payment participants batch center sport',
            populate: [
                { path: 'participants', select: 'id firstName lastName' },
                { path: 'batch', select: 'id name' },
                { path: 'center', select: 'id center_name' },
                { path: 'sport', select: 'id name' },
            ],
            match: { is_deleted: false },
        })
            .lean();
        if (!transaction) {
            return null;
        }
        // Remove unwanted fields from transaction
        const transactionObj = transaction;
        delete transactionObj.razorpay_signature;
        delete transactionObj.updatedAt;
        delete transactionObj.createdAt;
        // Remove unwanted payment fields from booking
        if (transactionObj.booking && transactionObj.booking.payment) {
            const payment = transactionObj.booking.payment;
            delete payment.payment_initiated_count;
            delete payment.payment_cancelled_count;
            delete payment.payment_failed_count;
            delete payment.razorpay_signature;
        }
        return transactionObj;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get transaction by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getTransactionById = getTransactionById;
/**
 * Update transaction status by admin (manual status update)
 */
const updateTransactionStatus = async (transactionId, status, adminId, notes) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(transactionId) ? { _id: transactionId } : { id: transactionId };
        const transaction = await transaction_model_1.TransactionModel.findOne(query);
        if (!transaction) {
            throw new ApiError_1.ApiError(404, 'Transaction not found');
        }
        // Update metadata with admin action
        const metadata = transaction.metadata || {};
        if (adminId) {
            metadata.adminUpdatedBy = adminId;
            metadata.adminUpdatedAt = new Date();
        }
        if (notes) {
            metadata.adminNotes = notes;
        }
        const updatedTransaction = await transaction_model_1.TransactionModel.findOneAndUpdate(query, {
            $set: {
                status,
                source: transaction_model_1.TransactionSource.MANUAL,
                metadata,
            },
        }, { new: true })
            .populate('user', 'id firstName lastName email mobile')
            .populate({
            path: 'booking',
            select: 'id booking_id',
            match: { is_deleted: false },
        })
            .lean();
        logger_1.logger.info(`Transaction status updated to ${status} by admin ${adminId} for transaction ${transactionId}`);
        return updatedTransaction;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to update transaction status:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update transaction status');
    }
};
exports.updateTransactionStatus = updateTransactionStatus;
/**
 * Get transaction statistics for admin dashboard
 */
const getTransactionStats = async (params) => {
    try {
        const dateQuery = {};
        if (params?.startDate || params?.endDate) {
            dateQuery.createdAt = {};
            if (params.startDate) {
                dateQuery.createdAt.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                const endDate = new Date(params.endDate);
                endDate.setHours(23, 59, 59, 999);
                dateQuery.createdAt.$lte = endDate;
            }
        }
        // Get total count
        const total = await transaction_model_1.TransactionModel.countDocuments(dateQuery);
        // Get counts by status
        const statusCounts = await transaction_model_1.TransactionModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byStatus = {
            pending: 0,
            processing: 0,
            success: 0,
            failed: 0,
            cancelled: 0,
            refunded: 0,
        };
        statusCounts.forEach((item) => {
            if (byStatus.hasOwnProperty(item._id)) {
                byStatus[item._id] = item.count;
            }
        });
        // Get counts by type
        const typeCounts = await transaction_model_1.TransactionModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byType = {
            payment: 0,
            refund: 0,
            partial_refund: 0,
        };
        typeCounts.forEach((item) => {
            if (byType.hasOwnProperty(item._id)) {
                byType[item._id] = item.count;
            }
        });
        // Get amount statistics
        const amountStats = await transaction_model_1.TransactionModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    successAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', transaction_model_1.TransactionStatus.SUCCESS] }, '$amount', 0],
                        },
                    },
                    failedAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', transaction_model_1.TransactionStatus.FAILED] }, '$amount', 0],
                        },
                    },
                    refundedAmount: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', [transaction_model_1.TransactionStatus.REFUNDED]] },
                                '$amount',
                                0,
                            ],
                        },
                    },
                },
            },
        ]);
        const stats = amountStats[0] || {
            totalAmount: 0,
            successAmount: 0,
            failedAmount: 0,
            refundedAmount: 0,
        };
        return {
            total,
            byStatus,
            byType,
            totalAmount: stats.totalAmount || 0,
            successAmount: stats.successAmount || 0,
            failedAmount: stats.failedAmount || 0,
            refundedAmount: stats.refundedAmount || 0,
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get transaction stats:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getTransactionStats = getTransactionStats;
//# sourceMappingURL=transaction.service.js.map