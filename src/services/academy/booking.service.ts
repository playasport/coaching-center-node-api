import { Types } from 'mongoose';
import { BookingModel, Booking, PaymentStatus, BookingStatus } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

export interface GetAcademyBookingsParams {
  page?: number;
  limit?: number;
  centerId?: string;
  batchId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
}

export interface BookingListItem {
  booking_id: string;
  id: string;
  user_name: string;
  student_name: string; // Participant name(s)
  batch_name: string;
  center_name: string;
  amount: number;
  payment_status: string;
  payment_method: string | null;
  invoice_id: string | null;
  created_at: Date;
}

export interface PaginatedBookingsResult {
  data: BookingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Get bookings for academy (coaching centers owned by user)
 */
export const getAcademyBookings = async (
  userId: string,
  params: GetAcademyBookingsParams = {}
): Promise<PaginatedBookingsResult> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
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

    const centerIds = coachingCenters.map(center => center._id as Types.ObjectId);

    // Build query
    const query: any = {
      center: { $in: centerIds },
      is_deleted: false,
    };

    // Filter by center if provided
    if (params.centerId) {
      if (!Types.ObjectId.isValid(params.centerId)) {
        throw new ApiError(400, 'Invalid center ID');
      }
      const centerObjectId = new Types.ObjectId(params.centerId);
      // Verify center belongs to user
      if (!centerIds.some(id => id.toString() === centerObjectId.toString())) {
        throw new ApiError(403, 'Center does not belong to you');
      }
      query.center = centerObjectId;
    }

    // Filter by batch if provided
    if (params.batchId) {
      if (!Types.ObjectId.isValid(params.batchId)) {
        throw new ApiError(400, 'Invalid batch ID');
      }
      query.batch = new Types.ObjectId(params.batchId);
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
    const total = await BookingModel.countDocuments(query);

    // Get bookings with minimal population for listing
    const bookings = await BookingModel.find(query)
      .populate('user', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .populate('batch', 'name')
      .populate('center', 'center_name')
      .select('booking_id id amount priceBreakdown payment.status payment.payment_method payment.razorpay_order_id user participants batch center createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    // Transform bookings to return only required fields
    const transformedBookings: BookingListItem[] = bookings.map((booking: any) => {
      // Format participant names (student names)
      let studentName = 'N/A';
      if (booking.participants && Array.isArray(booking.participants) && booking.participants.length > 0) {
        const participantNames = booking.participants
          .map((p: any) => {
            const firstName = p?.firstName || '';
            const lastName = p?.lastName || '';
            return `${firstName} ${lastName}`.trim();
          })
          .filter((name: string) => name.length > 0);
        studentName = participantNames.join(', ') || 'N/A';
      }

      // For academy, show only batch_amount (what they earn), not total amount with platform fee and GST
      const batchAmount = booking.priceBreakdown?.batch_amount || booking.amount || 0;

      return {
        booking_id: booking.booking_id || booking.id, // Use booking_id if available, fallback to id
        id: booking.id,
        user_name: booking.user
          ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim()
          : 'N/A',
        student_name: studentName,
        batch_name: booking.batch?.name || 'N/A',
        center_name: booking.center?.center_name || 'N/A',
        amount: batchAmount, // Show only batch amount (admission fee + base fee), hide platform fee and GST
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
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get academy bookings:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to get academy bookings');
  }
};

/**
 * Get booking by ID for academy
 */
export const getAcademyBookingById = async (
  bookingId: string,
  userId: string
): Promise<Booking> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id').lean();

    if (coachingCenters.length === 0) {
      logger.warn('No coaching centers found for academy user', { userId });
      throw new ApiError(404, 'Booking not found');
    }

    const centerIds = coachingCenters.map(center => center._id as Types.ObjectId);

    // Find booking with full details using id field (UUID string)
    const booking = await BookingModel.findOne({
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
      logger.warn('Booking not found', { bookingId, centerIds });
      throw new ApiError(404, 'Booking not found');
    }

    // For academy, replace amount with batch_amount (what they earn)
    const bookingData = booking as any;
    if (bookingData.priceBreakdown?.batch_amount) {
      bookingData.amount = bookingData.priceBreakdown.batch_amount;
      // Also update payment amount if exists
      if (bookingData.payment) {
        bookingData.payment.amount = bookingData.priceBreakdown.batch_amount;
      }
    }

    return bookingData as Booking;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get academy booking:', {
      error: error instanceof Error ? error.message : error,
      bookingId,
      userId,
    });
    throw new ApiError(500, 'Failed to get academy booking');
  }
};

/**
 * Update booking status for academy
 */
export const updateAcademyBookingStatus = async (
  bookingId: string,
  status: BookingStatus,
  userId: string
): Promise<Booking> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id').lean();

    if (coachingCenters.length === 0) {
      throw new ApiError(404, 'Booking not found');
    }

    const centerIds = coachingCenters.map(center => center._id as Types.ObjectId);

    // Find booking
    const booking = await BookingModel.findOne({
      id: bookingId,
      center: { $in: centerIds },
      is_deleted: false,
    }).lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Validate status transition
    if (status === BookingStatus.CANCELLED && booking.status === BookingStatus.COMPLETED) {
      throw new ApiError(400, 'Cannot cancel a completed booking');
    }

    if (status === BookingStatus.COMPLETED && booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(400, 'Cannot complete a cancelled booking');
    }

    // Update booking status
    const updatedBooking = await BookingModel.findOneAndUpdate(
      { id: bookingId },
      { $set: { status } },
      { new: true }
    )
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name scheduled')
      .populate('center', 'id center_name email mobile_number')
      .populate('sport', 'id name')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(404, 'Booking not found');
    }

    logger.info(`Booking status updated: ${bookingId} to ${status} by academy user ${userId}`);

    return updatedBooking as Booking;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update academy booking status:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to update booking status');
  }
};

