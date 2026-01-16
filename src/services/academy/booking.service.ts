import { Types } from 'mongoose';
import { BookingModel, Booking, PaymentStatus, BookingStatus } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { createAndSendNotification } from '../common/notification.service';
import { queueEmail, queueSms, queueWhatsApp } from '../common/notificationQueue.service';
import { createAuditTrail } from '../common/auditTrail.service';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import {
  getBookingApprovedUserSms,
  getBookingApprovedUserWhatsApp,
  getBookingRejectedUserSms,
  getBookingRejectedUserWhatsApp,
} from '../common/notificationMessages';

export interface GetAcademyBookingsParams {
  page?: number;
  limit?: number;
  centerId?: string;
  batchId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
}

export interface BookingListItem {
  id: string;
  booking_id: string;
  user_name: string;
  student_name: string; // Participant name(s)
  student_count: number; // Number of participants/students in the booking
  batch_name: string;
  center_name: string;
  amount: number;
  status: BookingStatus; // Booking status
  status_message: string; // Custom message based on booking status and payment status
  payment_status: string;
  can_accept_reject: boolean; // Flag to indicate if accept/reject actions should be shown
  rejection_reason?: string | null; // Rejection reason if status is REJECTED
  cancellation_reason?: string | null; // Cancellation reason if status is CANCELLED
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
 * Get academy-friendly status message based on booking status and payment status
 */
const getAcademyBookingStatusMessage = (
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): string => {
  // Handle cancelled bookings
  if (bookingStatus === BookingStatus.CANCELLED) {
    return 'Booking has been cancelled.';
  }

  // Handle completed bookings
  if (bookingStatus === BookingStatus.COMPLETED) {
    return 'Booking completed successfully.';
  }

  // Handle rejected bookings
  if (bookingStatus === BookingStatus.REJECTED) {
    return 'Booking request has been rejected.';
  }

  // Handle confirmed bookings with successful payment
  if (bookingStatus === BookingStatus.CONFIRMED && paymentStatus === PaymentStatus.SUCCESS) {
    return 'Booking confirmed! Payment received successfully.';
  }

  // Handle approved bookings
  if (bookingStatus === BookingStatus.APPROVED) {
    if (paymentStatus === PaymentStatus.NOT_INITIATED) {
      return 'Booking approved. Waiting for customer payment.';
    }
    if (paymentStatus === PaymentStatus.INITIATED) {
      return 'Payment initiated by customer. Waiting for payment completion.';
    }
    if (paymentStatus === PaymentStatus.PENDING || paymentStatus === PaymentStatus.PROCESSING) {
      return 'Payment is being processed.';
    }
    if (paymentStatus === PaymentStatus.FAILED) {
      return 'Payment failed. Customer needs to retry payment.';
    }
    if (paymentStatus === PaymentStatus.SUCCESS) {
      return 'Booking confirmed! Payment received.';
    }
  }

  // Handle slot booked status (waiting for academy approval)
  if (bookingStatus === BookingStatus.SLOT_BOOKED || bookingStatus === BookingStatus.REQUESTED) {
    return 'New booking request. Waiting for your approval.';
  }

  // Handle payment pending (legacy status)
  if (bookingStatus === BookingStatus.PAYMENT_PENDING || bookingStatus === BookingStatus.PENDING) {
    if (paymentStatus === PaymentStatus.INITIATED) {
      return 'Payment initiated. Waiting for completion.';
    }
    if (paymentStatus === PaymentStatus.PENDING || paymentStatus === PaymentStatus.PROCESSING) {
      return 'Payment is being processed.';
    }
    if (paymentStatus === PaymentStatus.FAILED) {
      return 'Payment failed.';
    }
    return 'Payment pending.';
  }

  // Default message
  return bookingStatus;
};

// Academy booking action response (minimal data)
export interface AcademyBookingActionResponse {
  id: string;
  booking_id: string;
  status: BookingStatus;
  amount: number;
  currency: string;
  payment: {
    status: PaymentStatus;
  };
  rejection_reason?: string | null;
  batch: {
    id: string;
    name: string;
  };
  center: {
    id: string;
    center_name: string;
  };
  sport: {
    id: string;
    name: string;
  };
  updatedAt: Date;
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
      .select('booking_id id status amount priceBreakdown payment rejection_reason cancellation_reason user participants batch center createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    // Transform bookings to return only required fields
    const transformedBookings: BookingListItem[] = bookings.map((booking: any) => {
      // Format participant names (student names)
      let studentName = 'N/A';
      const studentCount = booking.participants && Array.isArray(booking.participants) ? booking.participants.length : 0;
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
      
      // Determine if accept/reject actions should be shown
      // Actions are available when booking is in SLOT_BOOKED or REQUESTED status (waiting for academy approval)
      const bookingStatus = booking.status || BookingStatus.PENDING;
      const paymentStatus = booking.payment?.status || PaymentStatus.NOT_INITIATED;
      const canAcceptReject = bookingStatus === BookingStatus.SLOT_BOOKED || bookingStatus === BookingStatus.REQUESTED;
      const statusMessage = getAcademyBookingStatusMessage(bookingStatus, paymentStatus);

      return {
        id: booking.id,
        booking_id: booking.booking_id || booking.id, // Use booking_id if available, fallback to id
        user_name: booking.user
          ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim()
          : 'N/A',
        student_name: studentName,
        student_count: studentCount,
        batch_name: booking.batch?.name || 'N/A',
        center_name: booking.center?.center_name || 'N/A',
        amount: batchAmount, // Show only batch amount (admission fee + base fee), hide platform fee and GST
        status: bookingStatus,
        status_message: statusMessage,
        payment_status: paymentStatus === PaymentStatus.SUCCESS ? 'paid' : (paymentStatus || 'pending'),
        can_accept_reject: canAcceptReject,
        rejection_reason: bookingStatus === BookingStatus.REJECTED ? booking.rejection_reason || null : null,
        cancellation_reason: bookingStatus === BookingStatus.CANCELLED ? booking.cancellation_reason || null : null,
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
      .populate('user', 'id firstName lastName email mobile profileImage')
      .populate('participants', 'id firstName lastName dob gender profilePhoto')
      .populate('batch', 'id name')
      .populate('center', 'id center_name email mobile_number logo')
      .populate('sport', 'id name logo')
      .select('_id id booking_id user participants batch center sport amount currency status notes cancellation_reason rejection_reason payment priceBreakdown createdAt')
      .lean();

    if (!booking) {
      logger.warn('Booking not found', { bookingId, centerIds });
      throw new ApiError(404, 'Booking not found');
    }

    // Transform to match the required response structure
    const bookingData = booking as any;
    
    // Calculate age for participants
    const calculateAgeFromDob = (dob: Date | string | null | undefined): string => {
      if (!dob) return '';
      const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age.toString();
    };

    // Transform participants
    const participants = Array.isArray(bookingData.participants) 
      ? bookingData.participants 
      : bookingData.participants ? [bookingData.participants] : [];
    
    const transformedParticipants = participants.map((participant: any) => ({
      _id: participant._id?.toString() || '',
      firstName: participant.firstName || '',
      lastName: participant.lastName || '',
      profilePhoto: participant.profilePhoto || '',
      gender: participant.gender || '',
      age: calculateAgeFromDob(participant.dob),
      dob: participant.dob || null,
    }));

    // Transform user
    const transformedUser = bookingData.user ? {
      _id: bookingData.user._id?.toString() || '',
      id: bookingData.user.id || '',
      firstName: bookingData.user.firstName || '',
      lastName: bookingData.user.lastName || '',
      email: bookingData.user.email || '',
      mobile: bookingData.user.mobile || '',
      profileImage: bookingData.user.profileImage || '',
    } : null;

    // Transform batch
    const transformedBatch = bookingData.batch ? {
      _id: bookingData.batch._id?.toString() || '',
      name: bookingData.batch.name || '',
    } : null;

    // Transform center
    const transformedCenter = bookingData.center ? {
      _id: bookingData.center._id?.toString() || '',
      center_name: bookingData.center.center_name || '',
      mobile_number: bookingData.center.mobile_number || '',
      logo: bookingData.center.logo || '',
      email: bookingData.center.email || '',
      id: bookingData.center.id || '',
    } : null;

    // Transform sport
    const transformedSport = bookingData.sport ? {
      _id: bookingData.sport._id?.toString() || '',
      name: bookingData.sport.name || '',
      logo: bookingData.sport.logo || '',
    } : null;

    // For academy, show only batch_amount (what they earn), not total amount with platform fee and GST
    // Same logic as listing endpoint
    const amount = bookingData.priceBreakdown?.batch_amount || bookingData.amount || 0;

    // Calculate payment_status
    const paymentStatus = bookingData.payment?.status || PaymentStatus.NOT_INITIATED;
    const payment_status = paymentStatus === PaymentStatus.SUCCESS ? 'paid' : (paymentStatus || 'pending');

    // Calculate can_accept_reject
    const bookingStatus = bookingData.status || BookingStatus.PENDING;
    const can_accept_reject = bookingStatus === BookingStatus.SLOT_BOOKED || bookingStatus === BookingStatus.REQUESTED;

    // Calculate status_message using the same function as list endpoint
    const status_message = getAcademyBookingStatusMessage(bookingStatus, paymentStatus);

    // Return only the required fields
    return {
      _id: bookingData._id?.toString() || '',
      id: bookingData.id || '',
      booking_id: bookingData.booking_id || '',
      user: transformedUser,
      participants: transformedParticipants,
      batch: transformedBatch,
      center: transformedCenter,
      sport: transformedSport,
      amount: amount,
      currency: bookingData.currency || 'INR',
      status: bookingData.status || '',
      status_message: status_message,
      payment_status: payment_status,
      can_accept_reject: can_accept_reject,
      notes: bookingData.notes || null,
      cancellation_reason: bookingData.cancellation_reason || null,
      rejection_reason: bookingData.rejection_reason || null,
      createdAt: bookingData.createdAt || null,
    } as any;
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
 * Approve booking request (academy confirms the booking)
 */
export const approveBookingRequest = async (
  bookingId: string,
  userId: string
): Promise<AcademyBookingActionResponse> => {
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

    // Find booking - must be SLOT_BOOKED status (waiting for academy approval)
    const booking = await BookingModel.findOne({
      id: bookingId,
      center: { $in: centerIds },
      status: { $in: [BookingStatus.SLOT_BOOKED, BookingStatus.REQUESTED] }, // Include legacy REQUESTED for backward compatibility
      is_deleted: false,
    })
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking request not found or already processed');
    }

    // Update booking status to APPROVED
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: { status: BookingStatus.APPROVED },
      },
      { new: true }
    )
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .select('id booking_id status amount currency payment batch center sport updatedAt')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to update booking status');
    }

    // Create audit trail
    await createAuditTrail(
      ActionType.BOOKING_APPROVED,
      ActionScale.HIGH,
      `Booking request approved for batch ${(booking.batch as any)?.name || 'Unknown'}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: {
          batchId: booking.batch.toString(),
          participantCount: booking.participants.length,
        },
      }
    );

    // Send notification to user (Push + Email + SMS + WhatsApp)
    const user = booking.user as any;
    const batchName = (booking.batch as any)?.name || 'batch';
    const centerName = (booking.center as any)?.center_name || 'Academy';
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
    
    if (user?.id) {
      // Push notification
      await createAndSendNotification({
        recipientType: 'user',
        recipientId: user.id,
        title: 'Booking Approved',
        body: `Your booking request for "${batchName}" has been approved. Please proceed with payment.`,
        channels: ['push'],
        priority: 'high',
        data: {
          type: 'booking_approved',
          bookingId: booking.id,
          batchId: booking.batch.toString(),
        },
      });

      // Email notification (async)
      if (user.email) {
        queueEmail(user.email, 'Booking Approved - PlayAsport', {
          template: 'booking-approved-user.html',
          text: `Your booking request for "${batchName}" at "${centerName}" has been approved. Please proceed with payment.`,
          templateVariables: {
            userName,
            batchName,
            centerName,
            bookingId: booking.id,
            year: new Date().getFullYear(),
          },
          priority: 'high',
          metadata: {
            type: 'booking_approved',
            bookingId: booking.id,
            recipient: 'user',
          },
        });
      }

      // SMS notification (async)
      if (user.mobile) {
        const smsMessage = getBookingApprovedUserSms({
          batchName,
          centerName,
          bookingId: booking.id,
        });
        queueSms(user.mobile, smsMessage, 'high', {
          type: 'booking_approved',
          bookingId: booking.id,
          recipient: 'user',
        });
      }

      // WhatsApp notification (async)
      if (user.mobile) {
        const whatsappMessage = getBookingApprovedUserWhatsApp({
          batchName,
          centerName,
          bookingId: booking.id,
        });
        queueWhatsApp(user.mobile, whatsappMessage, 'high', {
          type: 'booking_approved',
          bookingId: booking.id,
          recipient: 'user',
        });
      }
    }

    logger.info(`Booking request approved: ${bookingId} by academy user ${userId}`);

    // Return only relevant data
    const response: AcademyBookingActionResponse = {
      id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
      booking_id: updatedBooking.booking_id || '',
      status: updatedBooking.status as BookingStatus,
      amount: updatedBooking.amount,
      currency: updatedBooking.currency,
      payment: {
        status: updatedBooking.payment.status,
      },
      batch: {
        id: (updatedBooking.batch as any)?._id?.toString() || (updatedBooking.batch as any)?.id || '',
        name: (updatedBooking.batch as any)?.name || '',
      },
      center: {
        id: (updatedBooking.center as any)?._id?.toString() || (updatedBooking.center as any)?.id || '',
        center_name: (updatedBooking.center as any)?.center_name || '',
      },
      sport: {
        id: (updatedBooking.sport as any)?._id?.toString() || (updatedBooking.sport as any)?.id || '',
        name: (updatedBooking.sport as any)?.name || '',
      },
      updatedAt: updatedBooking.updatedAt,
    };

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to approve booking request:', {
      error: error instanceof Error ? error.message : error,
      bookingId,
      userId,
    });
    throw new ApiError(500, 'Failed to approve booking request');
  }
};

/**
 * Reject booking request (academy rejects the booking)
 */
export const rejectBookingRequest = async (
  bookingId: string,
  userId: string,
  reason: string
): Promise<AcademyBookingActionResponse> => {
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

    // Find booking - must be SLOT_BOOKED status (waiting for academy approval)
    const booking = await BookingModel.findOne({
      id: bookingId,
      center: { $in: centerIds },
      status: { $in: [BookingStatus.SLOT_BOOKED, BookingStatus.REQUESTED] }, // Include legacy REQUESTED for backward compatibility
      is_deleted: false,
    })
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking request not found or already processed');
    }

    // Update booking status to REJECTED
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          status: BookingStatus.REJECTED,
          rejection_reason: reason || null, // Store rejection reason in separate field
        },
      },
      { new: true }
    )
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .select('id booking_id status amount currency payment rejection_reason batch center sport updatedAt')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to update booking status');
    }

    // Create audit trail
    await createAuditTrail(
      ActionType.BOOKING_REJECTED,
      ActionScale.MEDIUM,
      `Booking request rejected for batch ${(booking.batch as any)?.name || 'Unknown'} with reason: ${reason || 'No reason provided'}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: {
          batchId: booking.batch.toString(),
          participantCount: booking.participants.length,
          reason: reason || null,
        },
      }
    );

    // Send notification to user (Push + Email + SMS + WhatsApp)
    const user = booking.user as any;
    const batchName = (booking.batch as any)?.name || 'batch';
    const centerName = (booking.center as any)?.center_name || 'Academy';
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
    const rejectionReason = reason ? ` Reason: ${reason}` : '';
    
    if (user?.id) {
      // Push notification
      await createAndSendNotification({
        recipientType: 'user',
        recipientId: user.id,
        title: 'Booking Request Rejected',
        body: `Your booking request for "${batchName}" has been rejected.${rejectionReason}`,
        channels: ['push'],
        priority: 'medium',
        data: {
          type: 'booking_rejected',
          bookingId: booking.id,
          batchId: booking.batch.toString(),
          reason: reason || null,
        },
      });

      // Email notification (async)
      if (user.email) {
        queueEmail(user.email, 'Booking Request Rejected - PlayAsport', {
          template: 'booking-rejected-user.html',
          text: `Your booking request for "${batchName}" at "${centerName}" has been rejected.${rejectionReason}`,
          templateVariables: {
            userName,
            batchName,
            centerName,
            bookingId: booking.id,
            reason: reason || null,
            year: new Date().getFullYear(),
          },
          priority: 'medium',
          metadata: {
            type: 'booking_rejected',
            bookingId: booking.id,
            recipient: 'user',
          },
        });
      }

      // SMS notification (async)
      if (user.mobile) {
        const smsMessage = getBookingRejectedUserSms({
          batchName,
          centerName,
          bookingId: booking.id,
          reason: reason || null,
        });
        queueSms(user.mobile, smsMessage, 'medium', {
          type: 'booking_rejected',
          bookingId: booking.id,
          recipient: 'user',
        });
      }

      // WhatsApp notification (async)
      if (user.mobile) {
        const whatsappMessage = getBookingRejectedUserWhatsApp({
          batchName,
          centerName,
          bookingId: booking.id,
          reason: reason || null,
        });
        queueWhatsApp(user.mobile, whatsappMessage, 'medium', {
          type: 'booking_rejected',
          bookingId: booking.id,
          recipient: 'user',
        });
      }
    }

    logger.info(`Booking request rejected: ${bookingId} by academy user ${userId}`);

    // Return only relevant data
    const response: AcademyBookingActionResponse = {
      id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
      booking_id: updatedBooking.booking_id || '',
      status: updatedBooking.status as BookingStatus,
      amount: updatedBooking.amount,
      currency: updatedBooking.currency,
      payment: {
        status: updatedBooking.payment.status,
      },
      rejection_reason: updatedBooking.rejection_reason || reason || null,
      batch: {
        id: (updatedBooking.batch as any)?._id?.toString() || (updatedBooking.batch as any)?.id || '',
        name: (updatedBooking.batch as any)?.name || '',
      },
      center: {
        id: (updatedBooking.center as any)?._id?.toString() || (updatedBooking.center as any)?.id || '',
        center_name: (updatedBooking.center as any)?.center_name || '',
      },
      sport: {
        id: (updatedBooking.sport as any)?._id?.toString() || (updatedBooking.sport as any)?.id || '',
        name: (updatedBooking.sport as any)?.name || '',
      },
      updatedAt: updatedBooking.updatedAt,
    };

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to reject booking request:', {
      error: error instanceof Error ? error.message : error,
      bookingId,
      userId,
    });
    throw new ApiError(500, 'Failed to reject booking request');
  }
};

