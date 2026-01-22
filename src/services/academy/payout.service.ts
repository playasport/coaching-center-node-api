import { PayoutModel, PayoutStatus } from '../../models/payout.model';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { UserModel } from '../../models/user.model';

/**
 * Get payouts for academy user (basic data for list)
 */
export const getAcademyPayouts = async (
  academyUserId: string,
  filters: {
    status?: PayoutStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }
): Promise<{
  data: Array<{
    id: string;
    booking_id: string | null;
    payout_amount: number;
    currency: string;
    status: PayoutStatus;
    payout_status: string; // From booking model
    students: string[]; // Array of student names only (e.g., ["John Doe", "Jane Smith"])
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> => {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Find academy user
    const academyUser = await UserModel.findOne({ id: academyUserId }).select('_id').lean();
    if (!academyUser) {
      throw new ApiError(404, 'Academy user not found');
    }

    // Build query
    const query: any = {
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
    const total = await PayoutModel.countDocuments(query);

    // Get payouts with basic data including participants
    const payouts = await PayoutModel.find(query)
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
      const booking = payout.booking as any;
      const participants = Array.isArray(booking?.participants) 
        ? booking.participants 
        : booking?.participants ? [booking.participants] : [];

      // Format students - only names for listing
      const students = participants.map((participant: any) => {
        const firstName = participant?.firstName || '';
        const lastName = participant?.lastName || '';
        return `${firstName} ${lastName}`.trim();
      }).filter((name: string) => name.length > 0);

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
  } catch (error: any) {
    logger.error('Error fetching academy payouts:', {
      error: error.message || error,
      academyUserId,
      filters,
    });
    throw new ApiError(500, 'Failed to fetch payouts');
  }
};

/**
 * Get payout details by ID for academy user
 */
export const getAcademyPayoutById = async (
  payoutId: string,
  academyUserId: string
): Promise<{
  id: string;
  booking: {
    id: string;
    booking_id: string | null;
    currency: string;
    payout_status: string;
  };
  payout_amount: number;
  currency: string;
  status: PayoutStatus;
  failure_reason: string | null;
  processed_at: Date | null;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    gender: string;
    dob: Date | null;
    profilePhoto: string | null;
  }>;
}> => {
  try {
    // Find academy user
    const academyUser = await UserModel.findOne({ id: academyUserId }).select('_id').lean();
    if (!academyUser) {
      throw new ApiError(404, 'Academy user not found');
    }

    // Find payout with participants
    const payout = await PayoutModel.findOne({
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
      throw new ApiError(404, 'Payout not found');
    }

    const booking = payout.booking as any;
    const participants = Array.isArray(booking?.participants) 
      ? booking.participants 
      : booking?.participants ? [booking.participants] : [];

    // Format students/participants
    const students = participants.map((participant: any) => ({
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
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error fetching academy payout:', {
      error: error.message || error,
      payoutId,
      academyUserId,
    });
    throw new ApiError(500, 'Failed to fetch payout');
  }
};

/**
 * Get academy payout statistics
 */
export const getAcademyPayoutStats = async (
  academyUserId: string,
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<{
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  total_pending_amount: number;
  total_completed_amount: number;
  total_failed_amount: number;
}> => {
  try {
    // Find academy user
    const academyUser = await UserModel.findOne({ id: academyUserId }).select('_id').lean();
    if (!academyUser) {
      throw new ApiError(404, 'Academy user not found');
    }

    const query: any = {
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

    const stats = await PayoutModel.aggregate([
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

      if (status === PayoutStatus.PENDING) {
        result.total_pending = count;
        result.total_pending_amount = amount;
      } else if (status === PayoutStatus.PROCESSING) {
        result.total_processing = count;
      } else if (status === PayoutStatus.COMPLETED) {
        result.total_completed = count;
        result.total_completed_amount = amount;
      } else if (status === PayoutStatus.FAILED) {
        result.total_failed = count;
        result.total_failed_amount = amount;
      }
    });

    return result;
  } catch (error: any) {
    logger.error('Error fetching academy payout stats:', {
      error: error.message || error,
      academyUserId,
      filters,
    });
    throw new ApiError(500, 'Failed to fetch payout statistics');
  }
};
