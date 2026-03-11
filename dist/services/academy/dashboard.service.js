"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademyDashboard = void 0;
const booking_model_1 = require("../../models/booking.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const batch_model_1 = require("../../models/batch.model");
const payout_model_1 = require("../../models/payout.model");
const user_model_1 = require("../../models/user.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const academyDashboardCache_1 = require("../../utils/academyDashboardCache");
/**
 * Get academy dashboard statistics
 */
const getAcademyDashboard = async (academyUserId) => {
    try {
        // Try to get from cache first
        const cached = await (0, academyDashboardCache_1.getCachedAcademyDashboard)(academyUserId);
        if (cached) {
            logger_1.logger.debug('Returning cached academy dashboard', { academyUserId });
            return cached;
        }
        // Find academy user
        const academyUser = await user_model_1.UserModel.findOne({ id: academyUserId }).select('_id').lean();
        if (!academyUser) {
            throw new ApiError_1.ApiError(404, 'Academy user not found');
        }
        const academyUserObjectId = academyUser._id;
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: academyUserObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            // Return empty stats if no centers
            const emptyStats = {
                total_users: 0,
                total_students: 0,
                total_bookings: 0,
                total_active_batches: 0,
                total_earnings: 0,
                monthly_earnings: [],
                recent_bookings: [],
            };
            await (0, academyDashboardCache_1.cacheAcademyDashboard)(academyUserId, emptyStats);
            return emptyStats;
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Execute all queries in parallel for better performance
        const [totalUsersResult, totalStudentsResult, totalBookingsResult, activeBatchesResult, earningsResult, monthlyEarningsResult, recentBookingsResult,] = await Promise.all([
            // Total unique users (from bookings)
            booking_model_1.BookingModel.aggregate([
                {
                    $match: {
                        center: { $in: centerIds },
                        is_deleted: false,
                    },
                },
                {
                    $group: {
                        _id: '$user',
                    },
                },
                {
                    $count: 'total',
                },
            ]),
            // Total unique students (from participants in bookings)
            booking_model_1.BookingModel.aggregate([
                {
                    $match: {
                        center: { $in: centerIds },
                        is_deleted: false,
                    },
                },
                {
                    $unwind: '$participants',
                },
                {
                    $group: {
                        _id: '$participants',
                    },
                },
                {
                    $count: 'total',
                },
            ]),
            // Total bookings
            booking_model_1.BookingModel.countDocuments({
                center: { $in: centerIds },
                is_deleted: false,
            }),
            // Total active batches (is_active = true)
            batch_model_1.BatchModel.countDocuments({
                center: { $in: centerIds },
                is_active: true,
                is_deleted: false,
            }),
            // Total earnings (sum of completed payout amounts)
            payout_model_1.PayoutModel.aggregate([
                {
                    $match: {
                        academy_user: academyUserObjectId,
                        status: payout_model_1.PayoutStatus.COMPLETED,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$payout_amount' },
                    },
                },
            ]),
            // Monthly earnings for last 12 months
            payout_model_1.PayoutModel.aggregate([
                {
                    $match: {
                        academy_user: academyUserObjectId,
                        status: payout_model_1.PayoutStatus.COMPLETED,
                        processed_at: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$processed_at' },
                            month: { $month: '$processed_at' },
                        },
                        earnings: { $sum: '$payout_amount' },
                    },
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 }, // Sort ascending to get oldest first
                },
                {
                    $limit: 12,
                },
            ]),
            // Recent 5 bookings with populated data
            booking_model_1.BookingModel.find({
                center: { $in: centerIds },
                is_deleted: false,
            })
                .populate('participants', 'firstName lastName')
                .populate({
                path: 'batch',
                select: 'name',
                populate: {
                    path: 'sport',
                    select: 'name',
                },
            })
                .select('id booking_id participants batch createdAt status')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);
        // Extract results
        const total_users = totalUsersResult[0]?.total || 0;
        const total_students = totalStudentsResult[0]?.total || 0;
        const total_bookings = totalBookingsResult;
        const total_active_batches = activeBatchesResult;
        const total_earnings = earningsResult[0]?.total || 0;
        // Format monthly earnings (already sorted ascending - oldest first)
        const monthly_earnings = monthlyEarningsResult.map((item) => {
            const year = item._id.year;
            const month = String(item._id.month).padStart(2, '0');
            return {
                month: `${year}-${month}`,
                earnings: item.earnings,
            };
        });
        // Format recent bookings
        const recent_bookings = recentBookingsResult.map((booking) => {
            // Get student names
            const participants = Array.isArray(booking.participants)
                ? booking.participants
                : booking.participants
                    ? [booking.participants]
                    : [];
            const studentNames = participants
                .map((p) => {
                const firstName = p?.firstName || '';
                const lastName = p?.lastName || '';
                return `${firstName} ${lastName}`.trim();
            })
                .filter((name) => name.length > 0)
                .join(', ');
            // Get batch and sport names
            const batchName = booking.batch?.name || 'N/A';
            const sportName = booking.batch?.sport?.name || 'N/A';
            return {
                id: booking.id || booking._id?.toString() || '',
                booking_id: booking.booking_id || null,
                student_name: studentNames || 'N/A',
                batch_name: batchName,
                sport_name: sportName,
                booking_time: booking.createdAt || new Date(),
                booking_status: booking.status || 'N/A',
            };
        });
        const dashboardStats = {
            total_users,
            total_students,
            total_bookings,
            total_active_batches,
            total_earnings,
            monthly_earnings,
            recent_bookings,
        };
        // Cache the result
        await (0, academyDashboardCache_1.cacheAcademyDashboard)(academyUserId, dashboardStats);
        return dashboardStats;
    }
    catch (error) {
        logger_1.logger.error('Error fetching academy dashboard:', {
            error: error.message || error,
            stack: error.stack,
            academyUserId,
        });
        // Re-throw ApiError as-is
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to fetch dashboard statistics');
    }
};
exports.getAcademyDashboard = getAcademyDashboard;
//# sourceMappingURL=dashboard.service.js.map