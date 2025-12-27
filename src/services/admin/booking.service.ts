import { Types } from 'mongoose';
import { BookingModel, Booking, PaymentStatus, BookingStatus } from '../../models/booking.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

export interface GetAdminBookingsParams {
  page?: number;
  limit?: number;
  userId?: string;
  centerId?: string;
  batchId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminBookingListItem {
  booking_id: string;
  id: string;
  user_name: string;
  student_name: string; // Participant name(s)
  batch_name: string;
  center_name: string;
  sport_name: string;
  amount: number;
  payment_status: string;
  payment_method: string | null;
  invoice_id: string | null;
  status: string;
  created_at: Date;
}

export interface AdminPaginatedBookingsResult {
  bookings: AdminBookingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingStats {
  total: number;
  byStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
  totalAmount: number;
  amountByPaymentStatus: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}

/**
 * Get all bookings for admin with filters and pagination
 */
export const getAllBookings = async (
  params: GetAdminBookingsParams = {}
): Promise<AdminPaginatedBookingsResult> => {
  try {
    const query: any = { is_deleted: false };

    // Filter by user if provided
    if (params.userId) {
      const userObjectId = await getUserObjectId(params.userId);
      if (userObjectId) {
        query.user = userObjectId;
      }
    }

    // Filter by center if provided
    if (params.centerId) {
      if (Types.ObjectId.isValid(params.centerId)) {
        query.center = new Types.ObjectId(params.centerId);
      }
    }

    // Filter by batch if provided
    if (params.batchId) {
      if (Types.ObjectId.isValid(params.batchId)) {
        query.batch = new Types.ObjectId(params.batchId);
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
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await BookingModel.countDocuments(query);

    // Get bookings with population
    const bookings = await BookingModel.find(query)
      .populate('user', 'firstName lastName email mobile')
      .populate('participants', 'firstName lastName')
      .populate('batch', 'name')
      .populate('center', 'center_name')
      .populate('sport', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedBookings: AdminBookingListItem[] = bookings.map((booking: any) => {
      let studentName = 'N/A';
      if (booking.participants && Array.isArray(booking.participants)) {
        studentName = booking.participants
          .map((p: any) => `${p?.firstName || ''} ${p?.lastName || ''}`.trim())
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
  } catch (error) {
    logger.error('Admin failed to get bookings:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get booking by ID for admin
 */
export const getBookingById = async (id: string): Promise<Booking | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const booking = await BookingModel.findOne({ ...query, is_deleted: false })
      .populate('user', 'id firstName lastName email mobile profileImage')
      .populate('participants', 'id firstName lastName dob gender')
      .populate('batch', 'id name scheduled duration capacity age')
      .populate('center', 'id center_name email mobile_number location logo')
      .populate('sport', 'id name logo')
      .lean();

    return booking as Booking | null;
  } catch (error) {
    logger.error('Admin failed to get booking by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update booking status by admin
 */
export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus
): Promise<Booking | null> => {
  try {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
    const booking = await BookingModel.findOne(query);
    
    if (!booking || booking.is_deleted) {
      throw new ApiError(404, 'Booking not found');
    }

    const updatedBooking = await BookingModel.findOneAndUpdate(
      query,
      { $set: { status } },
      { new: true }
    )
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name scheduled')
      .populate('center', 'id center_name email mobile_number')
      .populate('sport', 'id name')
      .lean();

    logger.info(`Booking status updated to ${status} by admin for booking ${bookingId}`);
    return updatedBooking as Booking | null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to update booking status:', error);
    throw new ApiError(500, 'Failed to update booking status');
  }
};

/**
 * Soft delete booking by admin
 */
export const deleteBooking = async (id: string): Promise<void> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const booking = await BookingModel.findOne(query);
    
    if (!booking || booking.is_deleted) {
      throw new ApiError(404, 'Booking not found');
    }

    await BookingModel.findOneAndUpdate(
      query,
      { 
        $set: { 
          is_deleted: true,
          deletedAt: new Date()
        } 
      }
    );

    logger.info(`Booking ${id} soft deleted by admin`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to delete booking:', error);
    throw new ApiError(500, 'Failed to delete booking');
  }
};

/**
 * Get booking statistics for admin dashboard
 */
export const getBookingStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<BookingStats> => {
  try {
    const dateQuery: any = {
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
    const total = await BookingModel.countDocuments(dateQuery);

    // Get counts by booking status
    const statusCounts = await BookingModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item: any) => {
      byStatus[item._id] = item.count;
    });

    // Get counts by payment status
    const paymentStatusCounts = await BookingModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$payment.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byPaymentStatus: Record<string, number> = {};
    paymentStatusCounts.forEach((item: any) => {
      byPaymentStatus[item._id] = item.count;
    });

    // Get amount statistics
    const totalAmountResult = await BookingModel.aggregate([
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
    const amountByPaymentStatusResult = await BookingModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$payment.status',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const amountByPaymentStatus: Record<string, number> = {};
    amountByPaymentStatusResult.forEach((item: any) => {
      amountByPaymentStatus[item._id] = item.totalAmount;
    });

    // Get payment method statistics
    const paymentMethodStats = await BookingModel.aggregate([
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

    const byPaymentMethod: Record<string, number> = {};
    paymentMethodStats.forEach((item: any) => {
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
  } catch (error) {
    logger.error('Admin failed to get booking stats:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
