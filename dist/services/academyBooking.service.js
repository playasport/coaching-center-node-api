"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAcademyBookingStatus = exports.getAcademyBookingById = exports.getAcademyBookings = void 0;
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../models/booking.model");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const userCache_1 = require("../utils/userCache");
/**
 * Get bookings for academy (coaching centers owned by user)
 */
const getAcademyBookings = async (userId, params = {}) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            return {
                data: [],
                pagination: {
                    page: 1,
                    limit: params.limit || 10,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Build query
        const query = {
            center: { $in: centerIds },
            is_deleted: false,
        };
        // Filter by center if provided
        if (params.centerId) {
            if (!mongoose_1.Types.ObjectId.isValid(params.centerId)) {
                throw new ApiError_1.ApiError(400, 'Invalid center ID');
            }
            const centerObjectId = new mongoose_1.Types.ObjectId(params.centerId);
            // Verify center belongs to user
            if (!centerIds.some(id => id.toString() === centerObjectId.toString())) {
                throw new ApiError_1.ApiError(403, 'Center does not belong to you');
            }
            query.center = centerObjectId;
        }
        // Filter by batch if provided
        if (params.batchId) {
            if (!mongoose_1.Types.ObjectId.isValid(params.batchId)) {
                throw new ApiError_1.ApiError(400, 'Invalid batch ID');
            }
            query.batch = new mongoose_1.Types.ObjectId(params.batchId);
        }
        // Filter by status if provided
        if (params.status) {
            query.status = params.status;
        }
        // Filter by payment status if provided
        if (params.paymentStatus) {
            query['payment.status'] = params.paymentStatus;
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Get total count
        const total = await booking_model_1.BookingModel.countDocuments(query);
        // Get bookings with minimal population for listing
        const bookings = await booking_model_1.BookingModel.find(query)
            .populate('user', 'firstName lastName')
            .populate('participants', 'firstName lastName')
            .populate('batch', 'name')
            .populate('center', 'center_name')
            .select('booking_id id amount payment.status payment.payment_method payment.razorpay_order_id user participants batch center createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalPages = Math.ceil(total / limit);
        // Transform bookings to return only required fields
        const transformedBookings = bookings.map((booking) => {
            // Format participant names (student names)
            let studentName = 'N/A';
            if (booking.participants && Array.isArray(booking.participants) && booking.participants.length > 0) {
                const participantNames = booking.participants
                    .map((p) => {
                    const firstName = p?.firstName || '';
                    const lastName = p?.lastName || '';
                    return `${firstName} ${lastName}`.trim();
                })
                    .filter((name) => name.length > 0);
                studentName = participantNames.join(', ') || 'N/A';
            }
            return {
                booking_id: booking.booking_id || booking.id, // Use booking_id if available, fallback to id
                id: booking.id,
                user_name: booking.user
                    ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim()
                    : 'N/A',
                student_name: studentName,
                batch_name: booking.batch?.name || 'N/A',
                center_name: booking.center?.center_name || 'N/A',
                amount: booking.amount,
                payment_status: booking.payment?.status || 'pending',
                payment_method: booking.payment?.payment_method || null,
                invoice_id: booking.payment?.razorpay_order_id || null,
                created_at: booking.createdAt,
            };
        });
        return {
            data: transformedBookings,
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
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get academy bookings:', {
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get academy bookings');
    }
};
exports.getAcademyBookings = getAcademyBookings;
/**
 * Get booking by ID for academy
 */
const getAcademyBookingById = async (bookingId, userId) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            logger_1.logger.warn('No coaching centers found for academy user', { userId });
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Find booking with full details using id field (UUID string)
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            center: { $in: centerIds },
            is_deleted: false,
        })
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName lastName dob gender')
            .populate('batch', 'id name scheduled duration capacity age')
            .populate('center', 'id center_name email mobile_number')
            .populate('sport', 'id name')
            .lean();
        if (!booking) {
            logger_1.logger.warn('Booking not found', { bookingId, centerIds });
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        return booking;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get academy booking:', {
            error: error instanceof Error ? error.message : error,
            bookingId,
            userId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get academy booking');
    }
};
exports.getAcademyBookingById = getAcademyBookingById;
/**
 * Update booking status for academy
 */
const updateAcademyBookingStatus = async (bookingId, status, userId) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Find booking
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            center: { $in: centerIds },
            is_deleted: false,
        }).lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        // Validate status transition
        if (status === booking_model_1.BookingStatus.CANCELLED && booking.status === booking_model_1.BookingStatus.COMPLETED) {
            throw new ApiError_1.ApiError(400, 'Cannot cancel a completed booking');
        }
        if (status === booking_model_1.BookingStatus.COMPLETED && booking.status === booking_model_1.BookingStatus.CANCELLED) {
            throw new ApiError_1.ApiError(400, 'Cannot complete a cancelled booking');
        }
        // Update booking status
        const updatedBooking = await booking_model_1.BookingModel.findOneAndUpdate({ id: bookingId }, { $set: { status } }, { new: true })
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName lastName')
            .populate('batch', 'id name scheduled')
            .populate('center', 'id center_name email mobile_number')
            .populate('sport', 'id name')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        logger_1.logger.info(`Booking status updated: ${bookingId} to ${status} by academy user ${userId}`);
        return updatedBooking;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update academy booking status:', {
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to update booking status');
    }
};
exports.updateAcademyBookingStatus = updateAcademyBookingStatus;
//# sourceMappingURL=academyBooking.service.js.map