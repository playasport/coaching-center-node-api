import { Types } from 'mongoose';
import { BookingModel } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BatchModel } from '../../models/batch.model';
import { PayoutModel, PayoutStatus } from '../../models/payout.model';
import { UserModel } from '../../models/user.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import {
  getCachedAcademyDashboard,
  cacheAcademyDashboard,
} from '../../utils/academyDashboardCache';

export interface DashboardStats {
  total_users: number;
  total_students: number;
  total_bookings: number;
  total_active_batches: number;
  total_earnings: number;
  monthly_earnings: Array<{
    month: string; // Format: "YYYY-MM"
    earnings: number;
  }>;
  recent_bookings: Array<{
    id: string;
    booking_id: string | null;
    student_name: string; // Comma-separated student names
    batch_name: string;
    sport_name: string;
    booking_time: Date;
    booking_status: string;
  }>;
}

/**
 * Get academy dashboard statistics
 */
export const getAcademyDashboard = async (
  academyUserId: string
): Promise<DashboardStats> => {
  try {
    // Try to get from cache first
    const cached = await getCachedAcademyDashboard(academyUserId);
    if (cached) {
      logger.debug('Returning cached academy dashboard', { academyUserId });
      return cached;
    }

    // Find academy user
    const academyUser = await UserModel.findOne({ id: academyUserId }).select('_id').lean();
    if (!academyUser) {
      throw new ApiError(404, 'Academy user not found');
    }

    const academyUserObjectId = academyUser._id as Types.ObjectId;

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: academyUserObjectId,
      is_deleted: false,
    }).select('_id').lean();

    if (coachingCenters.length === 0) {
      // Return empty stats if no centers
      const emptyStats: DashboardStats = {
        total_users: 0,
        total_students: 0,
        total_bookings: 0,
        total_active_batches: 0,
        total_earnings: 0,
        monthly_earnings: [],
        recent_bookings: [],
      };
      await cacheAcademyDashboard(academyUserId, emptyStats);
      return emptyStats;
    }

    const centerIds = coachingCenters.map(center => center._id as Types.ObjectId);

    // Execute all queries in parallel for better performance
    const [
      totalUsersResult,
      totalStudentsResult,
      totalBookingsResult,
      activeBatchesResult,
      earningsResult,
      monthlyEarningsResult,
      recentBookingsResult,
    ] = await Promise.all([
      // Total unique users (from bookings)
      BookingModel.aggregate([
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
      BookingModel.aggregate([
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
      BookingModel.countDocuments({
        center: { $in: centerIds },
        is_deleted: false,
      }),

      // Total active batches (is_active = true)
      BatchModel.countDocuments({
        center: { $in: centerIds },
        is_active: true,
        is_deleted: false,
      }),

      // Total earnings (sum of completed payout amounts)
      PayoutModel.aggregate([
        {
          $match: {
            academy_user: academyUserObjectId,
            status: PayoutStatus.COMPLETED,
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
      PayoutModel.aggregate([
        {
          $match: {
            academy_user: academyUserObjectId,
            status: PayoutStatus.COMPLETED,
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
      BookingModel.find({
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
    const recent_bookings = recentBookingsResult.map((booking: any) => {
      // Get student names
      const participants = Array.isArray(booking.participants)
        ? booking.participants
        : booking.participants
        ? [booking.participants]
        : [];

      const studentNames = participants
        .map((p: any) => {
          const firstName = p?.firstName || '';
          const lastName = p?.lastName || '';
          return `${firstName} ${lastName}`.trim();
        })
        .filter((name: string) => name.length > 0)
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

    const dashboardStats: DashboardStats = {
      total_users,
      total_students,
      total_bookings,
      total_active_batches,
      total_earnings,
      monthly_earnings,
      recent_bookings,
    };

    // Cache the result
    await cacheAcademyDashboard(academyUserId, dashboardStats);

    return dashboardStats;
  } catch (error: any) {
    logger.error('Error fetching academy dashboard:', {
      error: error.message || error,
      stack: error.stack,
      academyUserId,
    });
    
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, 'Failed to fetch dashboard statistics');
  }
};
