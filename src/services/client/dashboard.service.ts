import { BookingModel } from '../../models/booking.model';
import { ParticipantModel } from '../../models/participant.model';
import { UserAcademyBookmarkModel } from '../../models/userAcademyBookmark.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

export interface UserDashboardResult {
  total_bookings: number;
  total_participants: number;
  total_bookmarks: number;
  recent_bookings: Array<{
    id: string;
    booking_id: string | null;
    status: string;
    amount: number;
    currency: string;
    payment_status: string;
    batch_name: string;
    center_name: string;
    sport_name: string;
    created_at: Date;
  }>;
}

export const getUserDashboard = async (userId: string): Promise<UserDashboardResult> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('errors.userNotFound'));
    }

    const [totalBookings, totalParticipants, totalBookmarks, recentBookings] = await Promise.all([
      BookingModel.countDocuments({ user: userObjectId, is_deleted: false }),

      ParticipantModel.countDocuments({ userId: userObjectId, is_deleted: false }),

      UserAcademyBookmarkModel.countDocuments({ user: userObjectId }),

      BookingModel.find({ user: userObjectId, is_deleted: false })
        .populate('batch', 'name')
        .populate('center', 'center_name')
        .populate('sport', 'name')
        .select('id booking_id status amount currency payment.status batch center sport createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const transformedBookings = recentBookings.map((booking: any) => ({
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to get user dashboard:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
