"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentById = exports.getPaymentStats = exports.updatePaymentStatus = exports.getAllPayments = void 0;
const mongoose_1 = require("mongoose");
const transaction_model_1 = require("../../models/transaction.model");
const transaction_model_2 = require("../../models/transaction.model");
const booking_model_1 = require("../../models/booking.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
/**
 * Get all payments for admin (only payment type transactions)
 */
const getAllPayments = async (params = {}) => {
    try {
        const query = {
            type: transaction_model_2.TransactionType.PAYMENT, // Only payment transactions
        };
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
        // Filter by payment method if provided
        if (params.paymentMethod) {
            query.payment_method = params.paymentMethod;
        }
        // Date range filter
        if (params.startDate || params.endDate) {
            query.createdAt = {};
            if (params.startDate) {
                query.createdAt.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                const endDate = new Date(params.endDate);
                endDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }
        // Search by transaction ID, Razorpay order ID, or payment ID
        if (params.search) {
            const searchRegex = new RegExp(params.search, 'i');
            query.$or = [
                { id: searchRegex },
                { razorpay_order_id: searchRegex },
                { razorpay_payment_id: searchRegex },
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
        // Get payments with population
        const transactions = await transaction_model_1.TransactionModel.find(query)
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
        const transformedPayments = transactions
            .filter((tx) => tx.booking)
            .map((transaction) => {
            return {
                id: transaction.id || transaction._id,
                payment_id: transaction.razorpay_payment_id || transaction.id,
                booking_id: transaction.booking?.booking_id || transaction.booking?.id || 'N/A',
                user_name: transaction.user
                    ? `${transaction.user.firstName || ''} ${transaction.user.lastName || ''}`.trim()
                    : 'N/A',
                user_email: transaction.user?.email || 'N/A',
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                payment_method: transaction.payment_method || null,
                razorpay_order_id: transaction.razorpay_order_id,
                failure_reason: transaction.failure_reason || null,
                processed_at: transaction.processed_at || null,
            };
        });
        return {
            payments: transformedPayments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get payments:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllPayments = getAllPayments;
/**
 * Update payment status by admin
 */
const updatePaymentStatus = async (paymentId, status, adminId, notes) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(paymentId) ? { _id: paymentId } : { id: paymentId };
        // First check if transaction exists at all
        const anyTransaction = await transaction_model_1.TransactionModel.findOne(query).lean();
        if (!anyTransaction) {
            logger_1.logger.warn(`Transaction not found with ID: ${paymentId}`);
            throw new ApiError_1.ApiError(404, `Transaction with ID ${paymentId} not found`);
        }
        // Check if it's a payment type
        if (anyTransaction.type !== transaction_model_2.TransactionType.PAYMENT) {
            logger_1.logger.warn(`Transaction ${paymentId} exists but is of type ${anyTransaction.type}, not payment`);
            throw new ApiError_1.ApiError(400, `Transaction with ID ${paymentId} is of type '${anyTransaction.type}', not 'payment'. Use /admin/transactions/:id to update this transaction.`);
        }
        // Now get the transaction document for updating
        const transaction = await transaction_model_1.TransactionModel.findOne({
            ...query,
            type: transaction_model_2.TransactionType.PAYMENT,
        });
        if (!transaction) {
            // This shouldn't happen if the checks above passed, but just in case
            throw new ApiError_1.ApiError(404, `Payment with ID ${paymentId} not found`);
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
        // If payment is marked as success, also update booking payment status
        if (status === transaction_model_1.TransactionStatus.SUCCESS && transaction.razorpay_payment_id) {
            await booking_model_1.BookingModel.findOneAndUpdate({ _id: transaction.booking }, {
                $set: {
                    'payment.status': booking_model_1.PaymentStatus.SUCCESS,
                    'payment.paid_at': new Date(),
                },
            });
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
        logger_1.logger.info(`Payment status updated to ${status} by admin ${adminId} for payment ${paymentId}`);
        return updatedTransaction;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to update payment status:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update payment status');
    }
};
exports.updatePaymentStatus = updatePaymentStatus;
/**
 * Get payment statistics for admin dashboard
 */
const getPaymentStats = async (params) => {
    try {
        const dateQuery = {
            type: transaction_model_2.TransactionType.PAYMENT,
        };
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
        const successful = statusCounts.find((s) => s._id === transaction_model_1.TransactionStatus.SUCCESS)?.count || 0;
        const failed = statusCounts.find((s) => s._id === transaction_model_1.TransactionStatus.FAILED)?.count || 0;
        const pending = statusCounts.find((s) => s._id === transaction_model_1.TransactionStatus.PENDING)?.count || 0;
        // Get amount statistics
        const amountStats = await transaction_model_1.TransactionModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);
        const successfulAmount = amountStats.find((s) => s._id === transaction_model_1.TransactionStatus.SUCCESS)?.totalAmount || 0;
        const failedAmount = amountStats.find((s) => s._id === transaction_model_1.TransactionStatus.FAILED)?.totalAmount || 0;
        const totalAmountResult = await transaction_model_1.TransactionModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);
        const totalAmount = totalAmountResult[0]?.totalAmount || 0;
        // Get payment method statistics
        const paymentMethodStats = await transaction_model_1.TransactionModel.aggregate([
            {
                $match: {
                    ...dateQuery,
                    payment_method: { $ne: null },
                },
            },
            {
                $group: {
                    _id: '$payment_method',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byPaymentMethod = {};
        paymentMethodStats.forEach((item) => {
            byPaymentMethod[item._id] = item.count;
        });
        return {
            total,
            successful,
            failed,
            pending,
            totalAmount,
            successfulAmount,
            failedAmount,
            byPaymentMethod,
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get payment stats:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getPaymentStats = getPaymentStats;
/**
 * Get payment by ID for admin (only payment type transactions)
 */
const getPaymentById = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        // First check if transaction exists at all
        const anyTransaction = await transaction_model_1.TransactionModel.findOne(query).lean();
        if (!anyTransaction) {
            logger_1.logger.warn(`Transaction not found with ID: ${id}`);
            return null;
        }
        // Check if it's a payment type
        if (anyTransaction.type !== transaction_model_2.TransactionType.PAYMENT) {
            logger_1.logger.warn(`Transaction ${id} exists but is of type ${anyTransaction.type}, not payment`);
            return null;
        }
        // Get the payment transaction with full details
        const payment = await transaction_model_1.TransactionModel.findOne({
            ...query,
            type: transaction_model_2.TransactionType.PAYMENT,
        })
            .select('-razorpay_signature -razorpay_webhook_data -source -metadata -updatedAt -createdAt')
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
        if (!payment) {
            return null;
        }
        // Remove unwanted fields from payment
        const paymentObj = payment;
        delete paymentObj.razorpay_signature;
        delete paymentObj.razorpay_webhook_data;
        delete paymentObj.source;
        delete paymentObj.metadata;
        delete paymentObj.updatedAt;
        delete paymentObj.createdAt;
        // Remove unwanted payment fields from booking
        if (paymentObj.booking && paymentObj.booking.payment) {
            const bookingPayment = paymentObj.booking.payment;
            delete bookingPayment.razorpay_signature;
            delete bookingPayment.payment_initiated_count;
            delete bookingPayment.payment_cancelled_count;
            delete bookingPayment.payment_failed_count;
        }
        return paymentObj;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get payment by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getPaymentById = getPaymentById;
//# sourceMappingURL=payment.service.js.map