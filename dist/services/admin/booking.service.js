"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingStats = exports.deleteBooking = exports.updateBookingStatus = exports.getBookingById = exports.getAllBookings = void 0;
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../../models/booking.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
/**
 * Get all bookings for admin with filters and pagination
 */
const getAllBookings = async (params = {}) => {
    try {
        const query = { is_deleted: false };
        // Filter by user if provided
        if (params.userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(params.userId);
            if (userObjectId) {
                query.user = userObjectId;
            }
        }
        // Filter by center if provided
        if (params.centerId) {
            if (mongoose_1.Types.ObjectId.isValid(params.centerId)) {
                query.center = new mongoose_1.Types.ObjectId(params.centerId);
            }
        }
        // Filter by batch if provided
        if (params.batchId) {
            if (mongoose_1.Types.ObjectId.isValid(params.batchId)) {
                query.batch = new mongoose_1.Types.ObjectId(params.batchId);
            }
        }
        // Filter by status if provided
        if (params.status) {
            query.status = params.status;
        }
        // Filter by payment status if provided
        if (params.paymentStatus) {
            query['payment.status'] = params.paymentStatus;
        }
        // Search by booking ID or Razorpay order ID
        if (params.search) {
            const searchRegex = new RegExp(params.search, 'i');
            query.$or = [
                { booking_id: searchRegex },
                { 'payment.razorpay_order_id': searchRegex },
                { 'payment.razorpay_payment_id': searchRegex }
            ];
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Sorting
        const sortField = params.sortBy || 'createdAt';
        const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await booking_model_1.BookingModel.countDocuments(query);
        // Get bookings with population
        const bookings = await booking_model_1.BookingModel.find(query)
            .populate('user', 'firstName lastName email mobile')
            .populate('participants', 'firstName lastName')
            .populate('batch', 'name')
            .populate('center', 'center_name')
            .populate('sport', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const transformedBookings = bookings.map((booking) => {
            let studentName = 'N/A';
            if (booking.participants && Array.isArray(booking.participants)) {
                studentName = booking.participants
                    .map((p) => `${p?.firstName || ''} ${p?.lastName || ''}`.trim())
                    .filter(Boolean)
                    .join(', ') || 'N/A';
            }
            return {
                booking_id: booking.booking_id || booking.id,
                id: booking.id,
                user_name: booking.user
                    ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim()
                    : 'N/A',
                student_name: studentName,
                batch_name: booking.batch?.name || 'N/A',
                center_name: booking.center?.center_name || 'N/A',
                sport_name: booking.sport?.name || 'N/A',
                amount: booking.amount,
                payment_status: booking.payment?.status || 'pending',
                payment_method: booking.payment?.payment_method || null,
                invoice_id: booking.payment?.razorpay_order_id || null,
                status: booking.status,
                created_at: booking.createdAt,
            };
        });
        return {
            bookings: transformedBookings,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get bookings:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllBookings = getAllBookings;
/**
 * Get booking by ID for admin
 */
const getBookingById = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const booking = await booking_model_1.BookingModel.findOne({ ...query, is_deleted: false })
            .populate('user', 'id firstName lastName email mobile profileImage')
            .populate('participants', 'id firstName lastName dob gender')
            .populate('batch', 'id name scheduled duration capacity age')
            .populate('center', 'id center_name email mobile_number location logo')
            .populate('sport', 'id name logo')
            .lean();
        return booking;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get booking by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getBookingById = getBookingById;
/**
 * Update booking status by admin
 */
const updateBookingStatus = async (bookingId, status) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
        const booking = await booking_model_1.BookingModel.findOne(query);
        if (!booking || booking.is_deleted) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const updatedBooking = await booking_model_1.BookingModel.findOneAndUpdate(query, { $set: { status } }, { new: true })
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName lastName')
            .populate('batch', 'id name scheduled')
            .populate('center', 'id center_name email mobile_number')
            .populate('sport', 'id name')
            .lean();
        logger_1.logger.info(`Booking status updated to ${status} by admin for booking ${bookingId}`);
        return updatedBooking;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to update booking status:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update booking status');
    }
};
exports.updateBookingStatus = updateBookingStatus;
/**
 * Soft delete booking by admin
 */
const deleteBooking = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const booking = await booking_model_1.BookingModel.findOne(query);
        if (!booking || booking.is_deleted) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        await booking_model_1.BookingModel.findOneAndUpdate(query, {
            $set: {
                is_deleted: true,
                deletedAt: new Date()
            }
        });
        logger_1.logger.info(`Booking ${id} soft deleted by admin`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to delete booking:', error);
        throw new ApiError_1.ApiError(500, 'Failed to delete booking');
    }
};
exports.deleteBooking = deleteBooking;
/**
 * Get booking statistics for admin dashboard
 */
const getBookingStats = async (params) => {
    try {
        const dateQuery = {
            is_deleted: false,
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
        const total = await booking_model_1.BookingModel.countDocuments(dateQuery);
        // Get counts by booking status
        const statusCounts = await booking_model_1.BookingModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byStatus = {};
        statusCounts.forEach((item) => {
            byStatus[item._id] = item.count;
        });
        // Get counts by payment status
        const paymentStatusCounts = await booking_model_1.BookingModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$payment.status',
                    count: { $sum: 1 },
                },
            },
        ]);
        const byPaymentStatus = {};
        paymentStatusCounts.forEach((item) => {
            byPaymentStatus[item._id] = item.count;
        });
        // Get amount statistics
        const totalAmountResult = await booking_model_1.BookingModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);
        const totalAmount = totalAmountResult[0]?.totalAmount || 0;
        // Get amount by payment status
        const amountByPaymentStatusResult = await booking_model_1.BookingModel.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$payment.status',
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);
        const amountByPaymentStatus = {};
        amountByPaymentStatusResult.forEach((item) => {
            amountByPaymentStatus[item._id] = item.totalAmount;
        });
        // Get payment method statistics
        const paymentMethodStats = await booking_model_1.BookingModel.aggregate([
            {
                $match: {
                    ...dateQuery,
                    'payment.payment_method': { $ne: null },
                },
            },
            {
                $group: {
                    _id: '$payment.payment_method',
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
            byStatus,
            byPaymentStatus,
            totalAmount,
            amountByPaymentStatus,
            byPaymentMethod,
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get booking stats:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getBookingStats = getBookingStats;
//# sourceMappingURL=booking.service.js.map