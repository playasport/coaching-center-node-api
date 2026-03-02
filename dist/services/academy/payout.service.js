"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademyPayoutStats = exports.getAcademyPayoutById = exports.getAcademyPayouts = void 0;
const payout_model_1 = require("../../models/payout.model");
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
const user_model_1 = require("../../models/user.model");
/**
 * Get payouts for academy user (basic data for list)
 */
const getAcademyPayouts = async (academyUserId, filters) => {
    try {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        // Find academy user
        const academyUser = await user_model_1.UserModel.findOne({ id: academyUserId }).select('_id').lean();
        if (!academyUser) {
            throw new ApiError_1.ApiError(404, 'Academy user not found');
        }
        // Build query
        const query = {
            academy_user: academyUser._id,
        };
        if (filters.status) {
            query.status = filters.status;
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
        // Get payouts with basic data including participants
        const payouts = await payout_model_1.PayoutModel.find(query)
            .populate({
            path: 'booking',
            select: 'id booking_id payout_status',
            populate: {
                path: 'participants',
                select: 'id firstName lastName gender dob profilePhoto',
            },
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        // Format response with basic data including student names only
        const formattedPayouts = payouts.map((payout) => {
            const booking = payout.booking;
            const participants = Array.isArray(booking?.participants)
                ? booking.participants
                : booking?.participants ? [booking.participants] : [];
            // Format students - only names for listing
            const students = participants.map((participant) => {
                const firstName = participant?.firstName || '';
                const lastName = participant?.lastName || '';
                return `${firstName} ${lastName}`.trim();
            }).filter((name) => name.length > 0);
            return {
                id: payout.id,
                booking_id: booking?.booking_id || booking?.id || null,
                payout_amount: payout.payout_amount,
                currency: payout.currency,
                status: payout.status,
                payout_status: booking?.payout_status || 'not_initiated',
                students: students, // Array of student names only
            };
        });
        const totalPages = Math.ceil(total / limit);
        return {
            data: formattedPayouts,
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
        logger_1.logger.error('Error fetching academy payouts:', {
            error: error.message || error,
            academyUserId,
            filters,
        });
        throw new ApiError_1.ApiError(500, 'Failed to fetch payouts');
    }
};
exports.getAcademyPayouts = getAcademyPayouts;
/**
 * Get payout details by ID for academy user
 */
const getAcademyPayoutById = async (payoutId, academyUserId) => {
    try {
        // Find academy user
        const academyUser = await user_model_1.UserModel.findOne({ id: academyUserId }).select('_id').lean();
        if (!academyUser) {
            throw new ApiError_1.ApiError(404, 'Academy user not found');
        }
        // Find payout with participants
        const payout = await payout_model_1.PayoutModel.findOne({
            id: payoutId,
            academy_user: academyUser._id,
        })
            .populate({
            path: 'booking',
            select: 'id booking_id currency payout_status',
            populate: {
                path: 'participants',
                select: 'id firstName lastName gender dob profilePhoto',
            },
        })
            .lean();
        if (!payout) {
            throw new ApiError_1.ApiError(404, 'Payout not found');
        }
        const booking = payout.booking;
        const participants = Array.isArray(booking?.participants)
            ? booking.participants
            : booking?.participants ? [booking.participants] : [];
        // Format students/participants
        const students = participants.map((participant) => ({
            id: participant?.id || participant?._id?.toString() || '',
            firstName: participant?.firstName || '',
            lastName: participant?.lastName || '',
            fullName: `${participant?.firstName || ''} ${participant?.lastName || ''}`.trim(),
            gender: participant?.gender || '',
            dob: participant?.dob || null,
            profilePhoto: participant?.profilePhoto || null,
        }));
        // Format response
        return {
            id: payout.id,
            booking: {
                id: booking.id,
                booking_id: booking.booking_id || null,
                currency: booking.currency,
                payout_status: booking.payout_status || 'not_initiated',
            },
            payout_amount: payout.payout_amount,
            currency: payout.currency,
            status: payout.status,
            failure_reason: payout.failure_reason || null,
            processed_at: payout.processed_at || null,
            students: students,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Error fetching academy payout:', {
            error: error.message || error,
            payoutId,
            academyUserId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to fetch payout');
    }
};
exports.getAcademyPayoutById = getAcademyPayoutById;
/**
 * Get academy payout statistics
 */
const getAcademyPayoutStats = async (academyUserId, filters) => {
    try {
        // Find academy user
        const academyUser = await user_model_1.UserModel.findOne({ id: academyUserId }).select('_id').lean();
        if (!academyUser) {
            throw new ApiError_1.ApiError(404, 'Academy user not found');
        }
        const query = {
            academy_user: academyUser._id,
        };
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
        logger_1.logger.error('Error fetching academy payout stats:', {
            error: error.message || error,
            academyUserId,
            filters,
        });
        throw new ApiError_1.ApiError(500, 'Failed to fetch payout statistics');
    }
};
exports.getAcademyPayoutStats = getAcademyPayoutStats;
//# sourceMappingURL=payout.service.js.map