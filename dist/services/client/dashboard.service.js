"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDashboard = void 0;
const booking_model_1 = require("../../models/booking.model");
const participant_model_1 = require("../../models/participant.model");
const userAcademyBookmark_model_1 = require("../../models/userAcademyBookmark.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const getUserDashboard = async (userId) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('errors.userNotFound'));
        }
        const [totalBookings, totalParticipants, totalBookmarks, recentBookings] = await Promise.all([
            booking_model_1.BookingModel.countDocuments({ user: userObjectId, is_deleted: false }),
            participant_model_1.ParticipantModel.countDocuments({ userId: userObjectId, is_deleted: false }),
            userAcademyBookmark_model_1.UserAcademyBookmarkModel.countDocuments({ user: userObjectId }),
            booking_model_1.BookingModel.find({ user: userObjectId, is_deleted: false })
                .populate('batch', 'name')
                .populate('center', 'center_name')
                .populate('sport', 'name')
                .select('id booking_id status amount currency payment.status batch center sport createdAt')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);
        const transformedBookings = recentBookings.map((booking) => ({
            id: booking.id || booking._id,
            booking_id: booking.booking_id || null,
            status: booking.status,
            amount: booking.amount,
            currency: booking.currency,
            payment_status: booking.payment?.status || 'not_initiated',
            batch_name: booking.batch?.name || 'N/A',
            center_name: booking.center?.center_name || 'N/A',
            sport_name: booking.sport?.name || 'N/A',
            created_at: booking.createdAt,
        }));
        return {
            total_bookings: totalBookings,
            total_participants: totalParticipants,
            total_bookmarks: totalBookmarks,
            recent_bookings: transformedBookings,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to get user dashboard:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getUserDashboard = getUserDashboard;
//# sourceMappingURL=dashboard.service.js.map