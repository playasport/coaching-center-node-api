import { Types } from 'mongoose';
import { BookingModel, PaymentStatus, BookingStatus } from '../../models/booking.model';
import { TransactionModel, TransactionStatus, TransactionSource, TransactionType } from '../../models/transaction.model';
import { BatchModel } from '../../models/batch.model';
import { ParticipantModel } from '../../models/participant.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { UserModel } from '../../models/user.model';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { getPaymentService } from '../common/payment/PaymentService';
import { config } from '../../config/env';
import type { BookingSummaryInput, VerifyPaymentInput, DeleteOrderInput, BookSlotInput } from '../../validations/booking.validation';
import { queueEmail, queueSms, queueWhatsApp } from '../common/notificationQueue.service';
import { createAndSendNotification } from '../common/notification.service';
import { createAuditTrail } from '../common/auditTrail.service';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import {
  getBookingRequestAcademySms,
  getBookingRequestAcademyWhatsApp,
  getBookingRequestSentUserSms,
  getBookingRequestSentUserWhatsApp,
  getBookingCancelledUserSms,
  getBookingCancelledUserWhatsApp,
  getBookingCancelledAcademySms,
  getBookingCancelledAcademyWhatsApp,
  getPaymentVerifiedUserSms,
  getPaymentVerifiedAcademySms,
  getPaymentVerifiedUserWhatsApp,
  getPaymentVerifiedAcademyWhatsApp,
  EmailTemplates,
  EmailSubjects,
  getBookingRequestAcademyEmailText,
  getBookingRequestSentUserEmailText,
  getBookingConfirmationUserEmailText,
  getBookingConfirmationCenterEmailText,
  getBookingConfirmationAdminEmailText,
  getBookingCancelledUserEmailText,
  getBookingCancelledAcademyEmailText,
  getBookingCancelledAdminEmailText,
  getBookingRequestAcademyPush,
  getBookingRequestSentUserPush,
  getBookingRequestAdminPush,
  getBookingConfirmationUserPush,
  getBookingConfirmationAcademyPush,
  getBookingConfirmationAdminPush,
  getBookingCancelledUserPush,
  getBookingCancelledAcademyPush,
} from '../common/notificationMessages';
// Import helper functions
import {
  validateAndFetchParticipants,
  validateBatchAndCenter,
  validateParticipantEnrollment,
  validateSlotAvailability,
  validateParticipantEligibility,
} from './booking.helpers.validation';
import {
  calculatePriceBreakdownAndCommission,
  roundToTwoDecimals,
} from './booking.helpers.calculation';
import {
  generateBookingId,
  calculateAge,
  getBookingStatusMessage,
  isPaymentLinkEnabled,
  canCancelBooking,
  canDownloadInvoice,
} from './booking.helpers.utils';

// Get payment service instance
const paymentService = getPaymentService();

// Re-export generateBookingId for backward compatibility
export { generateBookingId };

export interface BookingSummary {
  batch: {
    id: string;
    name: string;
    sport: {
      id: string;
      name: string;
    };
    center: {
      id: string;
      name: string;
      logo?: string | null;
      address?: {
        line1: string | null;
        line2: string;
        city: string;
        state: string;
        country: string | null;
        pincode: string;
      } | null;
      experience?: number | null;
    };
    scheduled: {
      start_date: Date;
      start_time: string;
      end_time: string;
      training_days: string[];
    };
    duration: {
      count: number;
      type: string;
    };
    admission_fee?: number | null;
    base_price: number;
    discounted_price?: number | null;
  };
  participants: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
  }>;
  amount: number;
  currency: string;
      breakdown: {
        admission_fee_per_participant?: number;
        admission_fee?: number;
        base_fee?: number;
        per_participant_fee?: number;
        platform_fee?: number;
        subtotal?: number;
        gst?: number;
        gst_percentage?: number;
        total: number;
      };
      priceBreakdown?: {
        admission_fee_per_participant: number;
        total_admission_fee: number;
        base_fee_per_participant: number;
        total_base_fee: number;
        batch_amount: number;
        platform_fee: number;
        subtotal: number;
        gst_percentage: number;
        gst_amount: number;
        total_amount: number;
        participant_count: number;
        currency: string;
        calculated_at: Date;
      };
      commission?: {
        rate: number;
        amount: number;
        payoutAmount: number;
        calculatedAt: Date;
      };
}

// RazorpayOrderResponse is now PaymentOrderResponse from payment service
export type RazorpayOrderResponse = import('../common/payment/interfaces/IPaymentGateway').PaymentOrderResponse;

/**
 * Limited booking data for order responses
 */
export interface CancelledBookingResponse {
  id: string;
  booking_id: string;
  status: string;
  amount: number;
  currency: string;
  payment: {
    razorpay_order_id: string;
    status: string;
    failure_reason?: string | null;
  };
  batch: {
    id: string;
    name: string;
  };
  center: {
    id: string;
    name: string;
  };
  sport: {
    id: string;
    name: string;
  };
}

// Booking slot response (minimal data)
export interface BookSlotResponse {
  id: string;
  booking_id: string;
  status: BookingStatus;
  amount: number;
  currency: string;
  payment: {
    status: PaymentStatus;
  };
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
  createdAt: Date;
}

// Payment order response
export interface PaymentOrderResponse {
  booking: {
    id: string;
    booking_id: string;
    status: BookingStatus;
    amount: number;
    currency: string;
    payment: {
      razorpay_order_id: string;
      status: PaymentStatus;
    };
  };
  razorpayOrder: {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
    status: string;
    created_at: number;
  };
}

// Cancel booking response
export interface CancelBookingResponse {
  id: string;
  booking_id: string;
  status: BookingStatus;
  amount: number;
  currency: string;
  payment: {
    status: PaymentStatus;
    failure_reason?: string | null;
  };
  cancellation_reason?: string | null;
  cancelled_by?: 'user' | 'academy' | 'system' | null;
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
}

// Booking summary response (restricted - only what client needs)
export interface BookingSummaryResponse {
  batch: {
    id: string;
    name: string;
    sport: {
      id: string;
      name: string;
    };
    center: {
      id: string;
      name: string;
      logo?: string | null;
      address?: {
        line1: string | null;
        line2: string;
        city: string;
        state: string;
        country: string | null;
        pincode: string;
      } | null;
      experience?: number | null;
    };
    scheduled: {
      start_date: Date;
      start_time: string;
      end_time: string;
      training_days: string[];
    };
    duration: {
      count: number;
      type: string;
    };
    admission_fee?: number | null;
    base_price: number;
    discounted_price?: number | null;
  };
  participants: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
  }>;
  amount: number;
  currency: string;
  breakdown: {
    admission_fee_per_participant?: number;
    admission_fee?: number;
    base_fee?: number;
    per_participant_fee?: number;
    platform_fee?: number;
    subtotal?: number;
    gst?: number;
    gst_percentage?: number;
    total: number;
  };
}

// Verified payment response (restricted - only what client needs)
export interface VerifiedPaymentResponse {
  id: string;
  booking_id: string;
  status: BookingStatus;
  amount: number;
  currency: string;
  payment: {
    razorpay_order_id: string;
    status: PaymentStatus;
    payment_method?: string | null;
    paid_at?: Date | null;
  };
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

export interface CreatedBookingResponse {
  id: string;
  booking_id: string;
  status: string;
  amount: number;
  currency: string;
  payment: {
    razorpay_order_id: string;
    status: string;
  };
  batch: {
    id: string;
    name: string;
  };
  center: {
    id: string;
    name: string;
  };
  sport: {
    id: string;
    name: string;
  };
}

// Re-export calculateAge for backward compatibility
export { calculateAge };


/**
 * Get booking summary before creating order
 */
export const getBookingSummary = async (
  data: BookingSummaryInput,
  userId: string
): Promise<BookingSummaryResponse> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Validate participants and batch/center in parallel (independent operations)
    const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
    const [participants, batchAndCenter] = await Promise.all([
      validateAndFetchParticipants(participantIds, userObjectId),
      validateBatchAndCenter(data.batchId),
    ]);

    const { batch, coachingCenter } = batchAndCenter;

    // Validate slot availability and participant enrollment in parallel (independent operations)
    const participantObjectIds = participants.map(p => p._id);
    await Promise.all([
      validateSlotAvailability(batch, participants.length),
      validateParticipantEnrollment(participantObjectIds, batch._id),
    ]);

    // Validate participant eligibility (age, gender, disability) - depends on participants, batch, and center
    await validateParticipantEligibility(participants, batch, coachingCenter);

    // Calculate amount
    const admissionFeePerParticipant = batch.admission_fee || 0;
    
    // Use discounted_price if available and > 0, otherwise use base_price
    // discounted_price should be <= base_price (validated in batch model)
    const perParticipantFee =
      batch.discounted_price != null && batch.discounted_price > 0
        ? batch.discounted_price
        : batch.base_price;
    const participantCount = participants.length;

    // Calculate base amount: (admission fee + base fee) * participant count
    const totalAdmissionFee = roundToTwoDecimals(admissionFeePerParticipant * participantCount);
    const totalBaseFee = roundToTwoDecimals(perParticipantFee * participantCount);
    const baseAmount = roundToTwoDecimals(totalAdmissionFee + totalBaseFee);

    // Get fee configuration from settings (fallback to config for backward compatibility)
    // Fetch all settings in parallel to reduce database queries
    const { getSettings } = await import('../common/settings.service');
    const settings = await getSettings(false);
    
    const platformFee = (settings.fees?.platform_fee as number | undefined) ?? config.booking.platformFee;
    const gstPercentage = (settings.fees?.gst_percentage as number | undefined) ?? config.booking.gstPercentage;
    const isGstEnabled = (settings.fees?.gst_enabled as boolean | undefined) ?? true;

    // Subtotal = base amount only (without platform fee)
    // This allows frontend to show: subtotal, then platform fee, then GST, then total
    const subtotal = roundToTwoDecimals(baseAmount);

    // GST calculation - applied only on platform_fee, not on the entire amount
    const gst = isGstEnabled ? roundToTwoDecimals((platformFee * gstPercentage) / 100) : 0;

    // Total amount: baseAmount + platformFee + GST (on platform_fee only)
    const totalAmount = roundToTwoDecimals(baseAmount + platformFee + gst);

    if (totalAmount <= 0) {
      throw new ApiError(400, 'Booking amount must be greater than zero');
    }

    // Calculate price breakdown and commission (for internal use, not returned to client)
    // These are calculated but not included in the response
    await calculatePriceBreakdownAndCommission(
      admissionFeePerParticipant,
      perParticipantFee,
      participantCount,
      baseAmount
    );

    // Return only relevant data (exclude internal priceBreakdown and commission)
    const response: BookingSummaryResponse = {
      batch: {
        id: batch._id.toString(),
        name: batch.name,
        sport: {
          id: (batch.sport as any)?._id?.toString() || (batch.sport as any)?.id || '',
          name: (batch.sport as any)?.name || '',
        },
        center: {
          id: (batch.center as any)?._id?.toString() || (batch.center as any)?.id || '',
          name: (batch.center as any)?.center_name || '',
          logo: (batch.center as any)?.logo || null,
          address: coachingCenter.location?.address || null,
          experience: coachingCenter.experience ?? null,
        },
        scheduled: batch.scheduled,
        duration: batch.duration,
        admission_fee: batch.admission_fee,
        base_price: batch.base_price,
        discounted_price: batch.discounted_price,
      },
      participants: participants.map(p => {
        const dob = p.dob ? new Date(p.dob) : null;
        const age = dob ? calculateAge(dob, new Date()) : null;
        return {
          id: p._id.toString(),
          firstName: p.firstName,
          lastName: p.lastName,
          age,
        };
      }),
      amount: totalAmount,
      currency: 'INR',
      breakdown: {
        admission_fee_per_participant: admissionFeePerParticipant > 0 ? roundToTwoDecimals(admissionFeePerParticipant) : undefined,
        admission_fee: totalAdmissionFee > 0 ? roundToTwoDecimals(totalAdmissionFee) : undefined,
        base_fee: totalBaseFee > 0 ? roundToTwoDecimals(totalBaseFee) : undefined,
        per_participant_fee: perParticipantFee > 0 ? roundToTwoDecimals(perParticipantFee) : undefined,
        platform_fee: platformFee > 0 ? roundToTwoDecimals(platformFee) : undefined,
        subtotal: subtotal > 0 ? roundToTwoDecimals(subtotal) : undefined,
        gst: gst > 0 ? roundToTwoDecimals(gst) : undefined,
        gst_percentage: gstPercentage,
        total: roundToTwoDecimals(totalAmount),
      },
    };

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get booking summary:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      data: { batchId: data.batchId, participantIds: data.participantIds },
    });
    // Include the actual error message if it's an Error instance
    const errorMessage = error instanceof Error ? error.message : 'Failed to get booking summary';
    throw new ApiError(500, errorMessage);
  }
};


/**
 * Book slot - Create booking request (new flow)
 * This creates a booking with SLOT_BOOKED status, occupies slots, and sends notifications
 */
export const bookSlot = async (
  data: BookSlotInput,
  userId: string
): Promise<BookSlotResponse> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get booking summary - this already does all validations
    const summary = await getBookingSummary(
      {
        batchId: data.batchId,
        participantIds: data.participantIds,
      },
      userId
    );

    // All validations are already done in getBookingSummary
    const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
    const participantObjectIds = participantIds.map(id => new Types.ObjectId(id));
    const batchObjectId = new Types.ObjectId(data.batchId);
    
    // Validate and convert center and sport IDs to ObjectIds
    // The summary returns IDs as strings, but we need to validate they exist and are valid
    const centerId = summary.batch.center.id;
    const sportId = summary.batch.sport.id;
    
    if (!centerId || !Types.ObjectId.isValid(centerId)) {
      logger.error('Invalid center ID in booking summary', {
        centerId,
        summary: JSON.stringify(summary.batch.center),
      });
      throw new ApiError(400, `Invalid center ID in booking summary: ${centerId || 'undefined'}`);
    }
    if (!sportId || !Types.ObjectId.isValid(sportId)) {
      logger.error('Invalid sport ID in booking summary', {
        sportId,
        summary: JSON.stringify(summary.batch.sport),
      });
      throw new ApiError(400, `Invalid sport ID in booking summary: ${sportId || 'undefined'}`);
    }
    
    const centerObjectId = new Types.ObjectId(centerId);
    const sportObjectId = new Types.ObjectId(sportId);

    // Use data from summary instead of re-fetching batch
    // Summary already has all the batch data we need
    const admissionFeePerParticipant = summary.batch.admission_fee || 0;
    const perParticipantFee = summary.batch.discounted_price !== null && summary.batch.discounted_price !== undefined 
      ? summary.batch.discounted_price 
      : summary.batch.base_price;
    const participantCount = participantIds.length;
    const totalAdmissionFee = roundToTwoDecimals(admissionFeePerParticipant * participantCount);
    const totalBaseFee = roundToTwoDecimals(perParticipantFee * participantCount);
    const baseAmount = roundToTwoDecimals(totalAdmissionFee + totalBaseFee);
    
    // Parallelize price calculation and booking ID generation (independent operations)
    const [priceBreakdownAndCommission, bookingId] = await Promise.all([
      calculatePriceBreakdownAndCommission(
        admissionFeePerParticipant,
        perParticipantFee,
        participantCount,
        baseAmount
      ),
      generateBookingId(),
    ]);
    
    const { priceBreakdown, commission } = priceBreakdownAndCommission;

    // Create booking record with SLOT_BOOKED status (no payment order yet)
    const bookingData: any = {
      user: userObjectId,
      participants: participantObjectIds,
      batch: batchObjectId,
      center: centerObjectId,
      sport: sportObjectId,
      amount: summary.amount,
      currency: summary.currency,
      status: BookingStatus.SLOT_BOOKED, // User has booked the slot, waiting for academy approval
      booking_id: bookingId,
      payment: {
        amount: summary.amount,
        currency: summary.currency,
        status: PaymentStatus.NOT_INITIATED, // Payment not initiated yet, waiting for academy approval
        payment_initiated_count: 0, // Initialize payment attempt counters
        payment_cancelled_count: 0,
        payment_failed_count: 0,
      },
      commission: commission || null,
      priceBreakdown: priceBreakdown || null,
      notes: data.notes || null,
    };

    const booking = new BookingModel(bookingData);
    await booking.save();

    // Fetch notification data in parallel (batch name, center details, user details, academy owner)
    // Use summary data where possible to avoid redundant queries
    const [centerDetails, userDetails, academyOwner] = await Promise.all([
      CoachingCenterModel.findById(centerObjectId).select('center_name user email mobile_number').lean(),
      UserModel.findById(userObjectId).select('id firstName lastName email mobile').lean(),
      // Fetch academy owner in parallel if center has user reference
      (async () => {
        const center = await CoachingCenterModel.findById(centerObjectId).select('user').lean();
        if (center?.user) {
          return UserModel.findById(center.user).select('id email mobile').lean();
        }
        return null;
      })(),
    ]);

    const centerOwnerId = (centerDetails as any)?.user?.toString();
    const participantNames = summary.participants.map(p => `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Participant').join(', ');
    const batchName = summary.batch.name; // Use from summary instead of re-fetching
    const centerName = (centerDetails as any)?.center_name || 'Academy';
    const userName = userDetails ? `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || userDetails.email || 'User' : 'User';

    // Create audit trail and send notifications in parallel (fire-and-forget for notifications)
    // Audit trail is important, but notifications can be async
    const auditTrailPromise = createAuditTrail(
      ActionType.BOOKING_REQUESTED,
      ActionScale.MEDIUM,
      `Booking request created for batch ${batchName}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: centerObjectId,
        bookingId: booking._id,
        metadata: {
          batchId: data.batchId,
          participantCount: participantIds.length,
          amount: summary.amount,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for booking', { error, bookingId: booking.id });
    });

    // Notification to Academy Owner (Push + Email + SMS + WhatsApp) - fire-and-forget
    if (centerOwnerId && academyOwner) {
      // Fire-and-forget notifications (don't await, but catch errors)
      (async () => {
        try {
          // Push notification (fire-and-forget)
          const academyPushNotification = getBookingRequestAcademyPush({
            batchName,
            userName,
            participants: participantNames,
          });
          createAndSendNotification({
            recipientType: 'academy',
            recipientId: academyOwner.id,
            title: academyPushNotification.title,
            body: academyPushNotification.body,
            channels: ['push'],
            priority: 'high',
            data: {
              type: 'booking_request',
              bookingId: booking.id || booking.booking_id,
              batchId: data.batchId,
              centerId: summary.batch.center.id,
            },
          }).catch((error) => {
            logger.error('Failed to send push notification to academy owner', { error, bookingId: booking.booking_id || booking.id });
          });

          // Email notification (async)
          const academyEmail = (centerDetails as any)?.email || academyOwner.email;
          if (academyEmail) {
            queueEmail(academyEmail, EmailSubjects.BOOKING_REQUEST_ACADEMY, {
              template: EmailTemplates.BOOKING_REQUEST_ACADEMY,
              text: getBookingRequestAcademyEmailText({
                batchName,
                userName,
                participants: participantNames,
              }),
              templateVariables: {
                centerName,
                batchName,
                userName,
                participants: participantNames,
                bookingId: booking.booking_id || booking.id,
                year: new Date().getFullYear(),
              },
              priority: 'high',
              metadata: {
                type: 'booking_request',
                bookingId: booking.booking_id || booking.id,
                recipient: 'academy',
              },
            });
          }

          // SMS notification (async)
          const academyMobile = (centerDetails as any)?.mobile_number || academyOwner.mobile;
          if (academyMobile) {
            const smsMessage = getBookingRequestAcademySms({
              batchName,
              userName,
              participants: participantNames,
              bookingId: booking.id,
            });
            queueSms(academyMobile, smsMessage, 'high', {
              type: 'booking_request',
              bookingId: booking.id,
              recipient: 'academy',
            });
          }

          // WhatsApp notification (async)
          if (academyMobile) {
            const whatsappMessage = getBookingRequestAcademyWhatsApp({
              batchName,
              userName,
              participants: participantNames,
              bookingId: booking.booking_id || booking.id,
            });
            queueWhatsApp(academyMobile, whatsappMessage, 'high', {
              type: 'booking_request',
              bookingId: booking.booking_id || booking.id,
              recipient: 'academy',
            });
          }
        } catch (error) {
          logger.error('Failed to send academy notifications', { error, bookingId: booking.id });
        }
      })().catch(() => {
        // Errors already logged in try-catch
      });
    }

    // Notification to User (Push + Email + SMS + WhatsApp)
    // Push notification (fire-and-forget)
    const userPushNotification = getBookingRequestSentUserPush({
      batchName,
    });
    const userNotificationPromise = createAndSendNotification({
      recipientType: 'user',
      recipientId: userId,
      title: userPushNotification.title,
      body: userPushNotification.body,
      channels: ['push'],
      priority: 'medium',
      data: {
        type: 'booking_request_sent',
        bookingId: booking.booking_id || booking.id,
        batchId: data.batchId,
      },
    }).catch((error) => {
      logger.error('Failed to send push notification to user', { error, bookingId: booking.booking_id || booking.id });
    });

    // Email notification (async)
    if (userDetails?.email) {
      queueEmail(userDetails.email, EmailSubjects.BOOKING_REQUEST_SENT_USER, {
        template: EmailTemplates.BOOKING_REQUEST_SENT_USER,
        text: getBookingRequestSentUserEmailText({
          batchName,
          centerName,
        }),
        templateVariables: {
          userName,
          batchName,
          centerName,
          participants: participantNames,
          bookingId: booking.booking_id || booking.id,
          year: new Date().getFullYear(),
        },
        priority: 'medium',
        metadata: {
          type: 'booking_request_sent',
          bookingId: booking.booking_id || booking.id,
          recipient: 'user',
        },
      });
    }

    // SMS notification (async)
    if (userDetails?.mobile) {
      const smsMessage = getBookingRequestSentUserSms({
        batchName,
        centerName,
        bookingId: booking.id,
      });
      queueSms(userDetails.mobile, smsMessage, 'medium', {
        type: 'booking_request_sent',
        bookingId: booking.id,
        recipient: 'user',
      });
    }

    // WhatsApp notification (async)
    if (userDetails?.mobile) {
      const whatsappMessage = getBookingRequestSentUserWhatsApp({
        batchName,
        centerName,
        participants: participantNames,
        bookingId: booking.booking_id || booking.id,
      });
      queueWhatsApp(userDetails.mobile, whatsappMessage, 'medium', {
        type: 'booking_request_sent',
        bookingId: booking.booking_id || booking.id,
        recipient: 'user',
      });
    }

    // Notification to Admin (role-based) - fire-and-forget
    const adminPushNotification = getBookingRequestAdminPush({
      userName: userDetails?.firstName || 'User',
      batchName,
      centerName,
    });
    const adminNotificationPromise = createAndSendNotification({
      recipientType: 'role',
      roles: [DefaultRoles.ADMIN, DefaultRoles.SUPER_ADMIN],
      title: adminPushNotification.title,
      body: adminPushNotification.body,
      channels: ['push'],
      priority: 'medium',
      data: {
        type: 'booking_request_admin',
        bookingId: booking.booking_id || booking.id,
        batchId: data.batchId,
        centerId: summary.batch.center.id,
      },
    }).catch((error) => {
      logger.error('Failed to send admin notification', { error, bookingId: booking.booking_id || booking.id });
    });

    // Wait for audit trail (important for tracking), but don't block on notifications
    await auditTrailPromise;

    logger.info(`Booking request created: ${booking.id} for user ${userId}`);

    // Construct response directly from booking object and summary data (no need to re-fetch)
    // This avoids an extra database query with populate
    const response: BookSlotResponse = {
      id: booking.id || (booking._id as any)?.toString() || '',
      booking_id: booking.booking_id || '',
      status: booking.status as BookingStatus,
      amount: booking.amount,
      currency: booking.currency,
      payment: {
        status: booking.payment.status,
      },
      batch: {
        id: batchObjectId.toString(),
        name: batchName,
      },
      center: {
        id: centerObjectId.toString(),
        center_name: centerName,
      },
      sport: {
        id: sportObjectId.toString(),
        name: summary.batch.sport.name,
      },
      createdAt: booking.createdAt || new Date(),
    };

    // Don't await notifications - they're fire-and-forget
    // This allows the API to return immediately while notifications are processed in background
    Promise.all([userNotificationPromise, adminNotificationPromise]).catch(() => {
      // Errors already logged in individual catch blocks
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to book slot:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      data: {
        batchId: data.batchId,
        participantIds: data.participantIds,
        userId,
      },
    });
    // Include the actual error message for debugging
    throw new ApiError(500, `Failed to book slot`);
  }
};

/**
 * Create payment order after academy approval
 * This is called after academy approves the booking request
 */
export const createPaymentOrder = async (
  bookingId: string,
  userId: string
): Promise<PaymentOrderResponse> => {
  try {
    // Validate user first
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Find booking - must be APPROVED status
    const booking = await BookingModel.findOne({
      id: bookingId,
      user: userObjectId,
      status: BookingStatus.APPROVED,
      is_deleted: false,
    }).lean();

    if (!booking) {
      throw new ApiError(404, 'booking not found');
    }

    // Validate booking amount
    if (!booking.amount || booking.amount <= 0) {
      throw new ApiError(400, 'Invalid booking amount. Cannot create payment order.');
    }

    if (!booking.currency || booking.currency.trim() === '') {
      throw new ApiError(400, 'Booking currency is required.');
    }

    // Create Razorpay order and prepare update data in parallel
    const currentInitiatedCount = booking.payment?.payment_initiated_count || 0;
    const receipt = `booking_${Date.now()}_${userObjectId.toString().slice(-6)}`;
    
    // Convert amount to paise (smallest currency unit for INR)
    const amountInPaise = Math.round(booking.amount * 100);
    
    if (amountInPaise <= 0 || amountInPaise < 100) {
      throw new ApiError(400, 'Payment amount must be at least ₹1.00 (100 paise).');
    }

    // Create order (this is the main external API call)
    const paymentOrder = await paymentService.createOrder({
      amount: amountInPaise,
      currency: booking.currency.toUpperCase(),
      receipt,
      notes: {
        userId: userId,
        bookingId: booking.id,
        batchId: booking.batch.toString(),
        centerId: booking.center.toString(),
      },
    });

    // Update booking with razorpay order ID and payment status
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          'payment.razorpay_order_id': paymentOrder.id,
          'payment.status': PaymentStatus.INITIATED, // Payment initiated, waiting for user to complete payment
          'payment.payment_initiated_count': currentInitiatedCount + 1,
        },
      },
      { new: true }
    )
      .select('id booking_id status amount currency payment')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to update booking with payment order');
    }

    // Create transaction record when payment is initiated
    try {
      await TransactionModel.findOneAndUpdate(
        {
          booking: booking._id,
          razorpay_order_id: paymentOrder.id,
        },
        {
          $set: {
            // Only update fields that should be updated if transaction already exists
            razorpay_payment_id: null, // Will be set when payment is verified
            razorpay_signature: null, // Will be set when payment is verified
            payment_method: null, // Will be set when payment is verified
            processed_at: null, // Will be set when payment is verified
          },
          $setOnInsert: {
            // Only set these fields when creating a new document
            user: booking.user,
            booking: booking._id,
            razorpay_order_id: paymentOrder.id,
            amount: booking.amount,
            currency: booking.currency,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.PENDING, // Set status only on insert
            source: TransactionSource.USER_VERIFICATION, // Set source only on insert
          },
        },
        { upsert: true, new: true, lean: true }
      );
      logger.info('Transaction record created/updated for payment initiation', {
        bookingId: booking.id,
        razorpay_order_id: paymentOrder.id,
      });
    } catch (transactionError: any) {
      // Log but don't fail payment order creation
      logger.error('Failed to create transaction record for payment initiation', {
        bookingId: booking.id,
        razorpay_order_id: paymentOrder.id,
        error: transactionError instanceof Error ? transactionError.message : transactionError,
        stack: transactionError instanceof Error ? transactionError.stack : undefined,
      });
    }

    // Create audit trail asynchronously (non-blocking) - don't await
    createAuditTrail(
      ActionType.PAYMENT_INITIATED,
      ActionScale.MEDIUM,
      `Payment order created for booking ${booking.booking_id || booking.id}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: {
          razorpayOrderId: paymentOrder.id,
          amount: booking.amount,
          payment_initiated_count: currentInitiatedCount + 1,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for payment initiation', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : error,
      });
    });

    logger.info(`Payment order created for booking: ${booking.id}`);

    // Return only relevant data
    const response: PaymentOrderResponse = {
      booking: {
        id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
        booking_id: updatedBooking.booking_id || '',
        status: updatedBooking.status as BookingStatus,
        amount: updatedBooking.amount,
        currency: updatedBooking.currency,
        payment: {
          razorpay_order_id: updatedBooking.payment.razorpay_order_id || paymentOrder.id,
          status: updatedBooking.payment.status,
        },
      },
      razorpayOrder: {
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        receipt: paymentOrder.receipt,
        status: paymentOrder.status,
        created_at: paymentOrder.created_at,
      },
    };

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create payment order:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, 'Failed to create payment order');
  }
};

/**
 * Verify Razorpay payment and update booking status
 */
export const verifyPayment = async (
  data: VerifyPaymentInput,
  userId: string
): Promise<VerifiedPaymentResponse> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Find booking by razorpay_order_id
    const booking = await BookingModel.findOne({
      'payment.razorpay_order_id': data.razorpay_order_id,
      user: userObjectId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Check if payment is already verified
    if (booking.payment.status === PaymentStatus.SUCCESS) {
      throw new ApiError(400, 'Payment has already been verified');
    }

    // Check if payment is initiated (should be INITIATED or PENDING for legacy)
    if (booking.payment.status !== PaymentStatus.INITIATED && booking.payment.status !== PaymentStatus.PENDING) {
      throw new ApiError(400, `Payment cannot be verified. Current status: ${booking.payment.status}. Payment must be initiated first.`);
    }

    // Parallelize signature verification and payment fetch
    // Signature verification is fast (local crypto), payment fetch is external API call
    // Run them in parallel to reduce total latency
    const [isValidSignature, razorpayPayment] = await Promise.all([
      paymentService.verifyPaymentSignature(
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature
      ),
      paymentService.fetchPayment(data.razorpay_payment_id),
    ]);

    if (!isValidSignature) {
      // Payment failed due to invalid signature - increment payment_failed_count
      const currentFailedCount = booking.payment?.payment_failed_count || 0;
      const newFailedCount = currentFailedCount + 1;
      await Promise.all([
        BookingModel.findByIdAndUpdate(
          booking._id,
          {
            $set: {
              'payment.status': PaymentStatus.FAILED,
              'payment.failure_reason': 'Invalid payment signature',
              'payment.payment_failed_count': newFailedCount,
            },
          }
        ),
        createAuditTrail(
          ActionType.PAYMENT_FAILED,
          ActionScale.MEDIUM,
          `Payment verification failed (invalid signature) for booking ${booking.booking_id || booking.id}`,
          'Booking',
          booking._id,
          {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              reason: 'Invalid payment signature',
              payment_failed_count: newFailedCount,
            },
          }
        ),
      ]);
      logger.warn('Payment signature verification failed', {
        bookingId: booking.id,
        userId,
        orderId: data.razorpay_order_id,
      });
      throw new ApiError(400, 'Invalid payment signature');
    }

    // Verify payment status and amount (razorpayPayment already fetched in parallel above)
    if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
      // Payment failed - increment payment_failed_count
      const currentFailedCount = booking.payment?.payment_failed_count || 0;
      const newFailedCount = currentFailedCount + 1;
      await Promise.all([
        BookingModel.findByIdAndUpdate(
          booking._id,
          {
            $set: {
              'payment.status': PaymentStatus.FAILED,
              'payment.failure_reason': `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`,
              'payment.payment_failed_count': newFailedCount,
            },
          }
        ),
        createAuditTrail(
          ActionType.PAYMENT_FAILED,
          ActionScale.MEDIUM,
          `Payment verification failed (status: ${razorpayPayment.status}) for booking ${booking.booking_id || booking.id}`,
          'Booking',
          booking._id,
          {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_status: razorpayPayment.status,
              reason: `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`,
              payment_failed_count: newFailedCount,
            },
          }
        ),
      ]);
      throw new ApiError(400, `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`);
    }

    // Verify amount matches (convert from paise to rupees)
    const expectedAmount = Math.round(booking.amount * 100);
    if (razorpayPayment.amount !== expectedAmount) {
      // Payment failed due to amount mismatch - increment payment_failed_count
      const currentFailedCount = booking.payment?.payment_failed_count || 0;
      const newFailedCount = currentFailedCount + 1;
      await Promise.all([
        BookingModel.findByIdAndUpdate(
          booking._id,
          {
            $set: {
              'payment.status': PaymentStatus.FAILED,
              'payment.failure_reason': `Payment amount mismatch. Expected: ${expectedAmount}, Received: ${razorpayPayment.amount}`,
              'payment.payment_failed_count': newFailedCount,
            },
          }
        ),
        createAuditTrail(
          ActionType.PAYMENT_FAILED,
          ActionScale.MEDIUM,
          `Payment verification failed (amount mismatch) for booking ${booking.booking_id || booking.id}`,
          'Booking',
          booking._id,
          {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              expected_amount: expectedAmount,
              received_amount: razorpayPayment.amount,
              reason: 'Payment amount mismatch',
              payment_failed_count: newFailedCount,
            },
          }
        ),
      ]);
      logger.error('Payment amount mismatch', {
        bookingId: booking.id,
        expected: expectedAmount,
        received: razorpayPayment.amount,
      });
      throw new ApiError(400, 'Payment amount does not match booking amount');
    }

    // Update booking and transaction in parallel for better performance
    // Transaction update is fire-and-forget (we don't need to wait for it)
    const bookingUpdatePromise = BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          status: BookingStatus.CONFIRMED,
          'payment.razorpay_payment_id': data.razorpay_payment_id,
          'payment.razorpay_signature': data.razorpay_signature,
          'payment.status': PaymentStatus.SUCCESS,
          'payment.payment_method': razorpayPayment.method || null,
          'payment.paid_at': new Date(),
        },
      },
      { new: true }
    )
      .populate('batch', 'id name')
      .populate('center', 'id center_name email mobile_number')
      .populate('sport', 'id name')
      .select('id booking_id status amount currency payment batch center sport updatedAt')
      .lean();

    // Update transaction record - MUST await this before creating payout
    // Payout creation needs the transaction to exist
    const transactionUpdatePromise = TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_order_id: data.razorpay_order_id,
      },
      {
        $set: {
          // Update these fields when transaction exists (or set for new document)
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          status: TransactionStatus.SUCCESS,
          payment_method: razorpayPayment.method || null,
          processed_at: new Date(),
        },
        $setOnInsert: {
          // Only set these fields when creating a new document (shouldn't happen, but safety)
          user: booking.user,
          booking: booking._id,
          razorpay_order_id: data.razorpay_order_id,
          amount: booking.amount,
          currency: booking.currency,
          type: TransactionType.PAYMENT,
          source: TransactionSource.USER_VERIFICATION,
          // Note: status is in $set above, so it will be set for both insert and update
        },
      },
      { upsert: true, new: true, lean: true }
    );

    const updatedBooking = await bookingUpdatePromise;

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to update booking');
    }

    // Wait for transaction to be created/updated before creating payout
    let transaction: any = null;
    try {
      transaction = await transactionUpdatePromise;
      if (!transaction) {
        logger.error('Transaction not found or failed to create', {
          bookingId: booking.id,
          razorpay_order_id: data.razorpay_order_id,
        });
        // Try to fetch transaction from database as fallback
        transaction = await TransactionModel.findOne({
          booking: booking._id,
          razorpay_order_id: data.razorpay_order_id,
        }).select('id').lean();
        if (transaction) {
          logger.info('Transaction found in database after update failed', {
            bookingId: booking.id,
            transactionId: transaction.id,
          });
        }
      } else {
        logger.info('Transaction created/updated successfully', {
          bookingId: booking.id,
          transactionId: transaction.id,
          razorpay_order_id: data.razorpay_order_id,
        });
      }
    } catch (transactionError: any) {
      // Log error but don't fail the payment verification
      logger.error('Failed to update/create transaction record', {
        bookingId: booking.id,
        razorpay_order_id: data.razorpay_order_id,
        error: transactionError instanceof Error ? transactionError.message : transactionError,
        stack: transactionError instanceof Error ? transactionError.stack : undefined,
      });
      // Try to fetch existing transaction as fallback
      try {
        transaction = await TransactionModel.findOne({
          booking: booking._id,
          razorpay_order_id: data.razorpay_order_id,
        }).select('id').lean();
        if (transaction) {
          logger.info('Found existing transaction after update error', {
            bookingId: booking.id,
            transactionId: transaction.id,
          });
        }
      } catch (fetchError) {
        logger.error('Failed to fetch transaction as fallback', {
          bookingId: booking.id,
          error: fetchError instanceof Error ? fetchError.message : fetchError,
        });
      }
    }

    // Create audit trail for successful payment verification
    await createAuditTrail(
      ActionType.PAYMENT_SUCCESS,
      ActionScale.CRITICAL,
      `Payment verified successfully for booking ${updatedBooking.booking_id || updatedBooking.id}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          payment_method: razorpayPayment.method || null,
          amount: booking.amount,
          currency: booking.currency,
          transaction_id: transaction?.id || null,
        },
      }
    ).catch((error) => {
      // Log but don't fail payment verification
      logger.error('Failed to create audit trail for payment verification', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : error,
      });
    });

    logger.info(`Payment verified successfully for booking: ${booking.id}`);

    // Note: payout_status will be set when payout is actually created/transferred
    // Remains NOT_INITIATED during payment verification, will be updated when payout is created

    // Create payout record (non-blocking - enqueue in background)
    // Only create payout if commission and priceBreakdown exist and payoutAmount > 0
    if (booking.commission && booking.commission.payoutAmount > 0 && booking.priceBreakdown) {
      try {
        // Get center to find academy owner
        const center = await CoachingCenterModel.findById(booking.center)
          .select('user')
          .lean();

        if (!center) {
          logger.warn('Center not found for payout creation', {
            bookingId: booking.id,
            centerId: booking.center?.toString(),
          });
        } else if (!center.user) {
          logger.warn('Center has no user (academy owner) for payout creation', {
            bookingId: booking.id,
            centerId: center._id?.toString(),
          });
        } else {
          const academyUser = await UserModel.findById(center.user).select('id').lean();
          if (!academyUser) {
            logger.warn('Academy user not found for payout creation', {
              bookingId: booking.id,
              centerUserId: center.user.toString(),
            });
          } else {
            // Get transaction ID - use transaction from above if available, otherwise fetch it
            let transactionForPayout: any = null;
            if (transaction && transaction.id) {
              transactionForPayout = transaction;
              logger.info('Using transaction from update for payout creation', {
                bookingId: booking.id,
                transactionId: transaction.id,
              });
            } else {
              // Try to find transaction if it wasn't created/updated above
              logger.info('Transaction not available from update, fetching from database', {
                bookingId: booking.id,
                razorpay_order_id: data.razorpay_order_id,
              });
              transactionForPayout = await TransactionModel.findOne({
                booking: booking._id,
                razorpay_order_id: data.razorpay_order_id,
              }).select('id').lean();
            }

            if (transactionForPayout && transactionForPayout.id) {
              // Create payout record directly (synchronous)
              try {
                const { createPayoutRecord } = await import('../common/payoutCreation.service');
                const result = await createPayoutRecord({
                  bookingId: booking.id,
                  transactionId: transactionForPayout.id,
                  academyUserId: academyUser.id,
                  amount: booking.amount,
                  batchAmount: booking.priceBreakdown.batch_amount,
                  commissionRate: booking.commission.rate,
                  commissionAmount: booking.commission.amount,
                  payoutAmount: booking.commission.payoutAmount,
                  currency: booking.currency,
                });

                if (result.success && !result.skipped) {
                  logger.info('Payout record created successfully', {
                    bookingId: booking.id,
                    transactionId: transactionForPayout.id,
                    payoutId: result.payoutId,
                    payoutAmount: booking.commission.payoutAmount,
                    commissionRate: booking.commission.rate,
                    commissionAmount: booking.commission.amount,
                    batchAmount: booking.priceBreakdown.batch_amount,
                  });
                } else if (result.skipped) {
                  logger.info('Payout creation skipped', {
                    bookingId: booking.id,
                    reason: result.reason,
                    payoutId: result.payoutId,
                    payoutAmount: booking.commission.payoutAmount,
                  });
                }
              } catch (payoutError: any) {
                logger.error('Failed to create payout record', {
                  error: payoutError.message || payoutError,
                  bookingId: booking.id,
                  transactionId: transactionForPayout?.id,
                  academyUserId: academyUser.id,
                  stack: payoutError.stack,
                });
              }
            } else {
              logger.error('Transaction not found for payout creation', {
                bookingId: booking.id,
                razorpay_order_id: data.razorpay_order_id,
                centerId: center._id?.toString(),
                academyUserId: academyUser.id,
                transactionFromUpdate: transaction ? (transaction.id ? 'has id' : 'exists but no id') : 'null',
              });
            }
          }
        }
      } catch (payoutError: any) {
        // Log but don't fail payment verification
        logger.error('Failed to create payout record (outer catch)', {
          error: payoutError.message || payoutError,
          bookingId: booking.id,
          stack: payoutError.stack,
        });
      }
    } else {
      // Log why payout creation was skipped
      if (!booking.commission) {
        logger.warn('Payout creation skipped: commission not found', { bookingId: booking.id });
      } else if (!booking.commission.payoutAmount || booking.commission.payoutAmount <= 0) {
        logger.warn('Payout creation skipped: payoutAmount is 0 or negative', {
          bookingId: booking.id,
          payoutAmount: booking.commission.payoutAmount,
        });
      } else if (!booking.priceBreakdown) {
        logger.warn('Payout creation skipped: priceBreakdown not found', { bookingId: booking.id });
      }
    }

    // Send confirmation emails/SMS asynchronously (non-blocking)
    // Don't await - let it run in background
    (async () => {
      try {
        // Fetch all required data for notifications (since we don't populate user/participants in response)
        const [batchDetails, userDetails, participantDetails, centerDetails] = await Promise.all([
          BatchModel.findById(booking.batch).lean(),
          UserModel.findById(booking.user).select('id firstName lastName email mobile').lean(),
          ParticipantModel.find({ _id: { $in: booking.participants } }).select('id firstName lastName').lean(),
          CoachingCenterModel.findById(booking.center).select('id center_name email mobile_number user').lean(),
        ]);
        
        if (!batchDetails) {
          logger.warn(`Batch not found for booking ${booking.id}`);
          return;
        }
        
        // Format date and time
        const startDate = batchDetails.scheduled?.start_date
          ? new Date(batchDetails.scheduled.start_date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'N/A';

        const startTime = batchDetails.scheduled?.start_time || 'N/A';
        const endTime = batchDetails.scheduled?.end_time || 'N/A';
        const trainingDays = batchDetails.scheduled?.training_days
          ? batchDetails.scheduled.training_days.join(', ')
          : 'N/A';

        // Format participant names
        const participantNames = (participantDetails || [])
          .map((p: any) => {
            const firstName = p.firstName || '';
            const lastName = p.lastName || '';
            return `${firstName} ${lastName}`.trim() || p.id || 'Participant';
          })
          .join(', ');

        // Get user details
        const user = userDetails as any;
        const userName = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
          : 'User';
        const userEmail = user?.email;
        const userMobile = user?.mobile;

        // Get center details
        const center = centerDetails as any;
        const centerName = center?.center_name || 'Coaching Center';
        const centerEmail = center?.email;
        const centerMobile = center?.mobile_number;

        // Get sport and batch details
        const sport = (updatedBooking.sport as any);
        const sportName = sport?.name || 'Sport';
        const batchName = batchDetails.name || 'Batch';

        // Prepare email template variables
        const emailTemplateVariables = {
          userName,
          bookingId: updatedBooking.id,
          batchName,
          sportName,
          centerName,
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          trainingDays,
          amount: updatedBooking.amount.toFixed(2),
          currency: updatedBooking.currency,
          paymentId: data.razorpay_payment_id,
          year: new Date().getFullYear(),
        };

        // Generate invoice PDF for email attachment
        let invoiceBuffer: Buffer | null = null;
        try {
          const { generateBookingInvoice } = await import('../admin/invoice.service');
          invoiceBuffer = await generateBookingInvoice(updatedBooking.id);
        } catch (invoiceError) {
          logger.error('Failed to generate invoice for email', {
            bookingId: updatedBooking.id,
            error: invoiceError instanceof Error ? invoiceError.message : invoiceError,
          });
          // Continue without invoice attachment if generation fails
        }

        // Queue emails using notification queue (non-blocking)
        // Send email to user with invoice attachment
        if (userEmail) {
          queueEmail(userEmail, EmailSubjects.BOOKING_CONFIRMATION_USER, {
            template: EmailTemplates.BOOKING_CONFIRMATION_USER,
            text: getBookingConfirmationUserEmailText({
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              batchName,
              centerName,
            }),
            templateVariables: emailTemplateVariables,
            priority: 'high',
            metadata: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              recipient: 'user',
            },
            attachments: invoiceBuffer
              ? [
                  {
                    filename: `invoice-${updatedBooking.booking_id || updatedBooking.id}.pdf`,
                    content: invoiceBuffer,
                    contentType: 'application/pdf',
                  },
                ]
              : undefined,
          });
        }

        // Send email to coaching center
        if (centerEmail) {
          queueEmail(centerEmail, EmailSubjects.BOOKING_CONFIRMATION_CENTER, {
            template: EmailTemplates.BOOKING_CONFIRMATION_CENTER,
            text: getBookingConfirmationCenterEmailText({
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              batchName,
              userName,
            }),
            templateVariables: {
              ...emailTemplateVariables,
              userEmail: userEmail || 'N/A',
            },
            priority: 'high',
            metadata: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              recipient: 'coaching_center',
            },
          });
        }

        // Send email to admin
        if (config.admin.email) {
          queueEmail(config.admin.email, EmailSubjects.BOOKING_CONFIRMATION_ADMIN, {
            template: EmailTemplates.BOOKING_CONFIRMATION_ADMIN,
            text: getBookingConfirmationAdminEmailText({
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              batchName,
              centerName,
            }),
            templateVariables: {
              ...emailTemplateVariables,
              userEmail: userEmail || 'N/A',
            },
            priority: 'high',
            metadata: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              recipient: 'admin',
            },
          });
        }

        // Prepare SMS messages using notification messages
        const userSmsMessage = getPaymentVerifiedUserSms({
          userName: userName || 'User',
          bookingId: updatedBooking.booking_id || updatedBooking.id,
          batchName,
          sportName,
          centerName,
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          currency: updatedBooking.currency,
          amount: updatedBooking.amount.toFixed(2),
        });
        
        const centerSmsMessage = getPaymentVerifiedAcademySms({
          bookingId: updatedBooking.booking_id || updatedBooking.id,
          batchName,
          sportName,
          userName: userName || 'N/A',
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          currency: updatedBooking.currency,
          amount: updatedBooking.amount.toFixed(2),
        });

        // Queue SMS notifications using notification queue (non-blocking)
        // Send SMS to user
        if (userMobile) {
          queueSms(userMobile, userSmsMessage, 'high', {
            type: 'booking_confirmation',
            bookingId: updatedBooking.booking_id || updatedBooking.id,
            recipient: 'user',
          });
        } else {
          logger.warn('User mobile number not available for SMS', {
            bookingId: booking.booking_id || booking.id,
          });
        }

        // Send SMS to coaching center
        if (centerMobile) {
          queueSms(centerMobile, centerSmsMessage, 'high', {
            type: 'booking_confirmation',
            bookingId: updatedBooking.id,
            recipient: 'coaching_center',
          });
        } else {
          logger.warn('Coaching center mobile number not available for SMS', {
            bookingId: booking.id,
          });
        }

        // Prepare WhatsApp messages using notification messages
        const userWhatsAppMessage = getPaymentVerifiedUserWhatsApp({
          userName: userName || 'User',
          bookingId: updatedBooking.booking_id || updatedBooking.id,
          batchName,
          sportName,
          centerName,
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          currency: updatedBooking.currency,
          amount: updatedBooking.amount.toFixed(2),
        });
        
        const centerWhatsAppMessage = getPaymentVerifiedAcademyWhatsApp({
          bookingId: updatedBooking.id,
          batchName,
          sportName,
          userName: userName || 'N/A',
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          currency: updatedBooking.currency,
          amount: updatedBooking.amount.toFixed(2),
        });

        // Queue WhatsApp notifications using notification queue (non-blocking)
        // Send WhatsApp to user
        if (userMobile) {
          queueWhatsApp(userMobile, userWhatsAppMessage, 'high', {
            type: 'booking_confirmation',
            bookingId: updatedBooking.booking_id || updatedBooking.id,
            recipient: 'user',
          });
        } else {
          logger.warn('User mobile number not available for WhatsApp', {
            bookingId: booking.booking_id || booking.id,
          });
        }

        // Send WhatsApp to coaching center
        if (centerMobile) {
          queueWhatsApp(centerMobile, centerWhatsAppMessage, 'high', {
            type: 'booking_confirmation',
            bookingId: updatedBooking.booking_id || updatedBooking.id,
            recipient: 'coaching_center',
          });
        } else {
          logger.warn('Coaching center mobile number not available for WhatsApp', {
            bookingId: booking.booking_id || booking.id,
          });
        }

        // Push notifications (fire-and-forget)
        // Push notification to User
        if (user?.id) {
          const userPushNotification = getBookingConfirmationUserPush({
            bookingId: updatedBooking.booking_id || updatedBooking.id,
            batchName,
            centerName,
          });
          createAndSendNotification({
            recipientType: 'user',
            recipientId: user.id,
            title: userPushNotification.title,
            body: userPushNotification.body,
            channels: ['push'],
            priority: 'high',
            data: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.booking_id || updatedBooking.id,
              batchId: booking.batch.toString(),
              centerId: booking.center.toString(),
            },
          }).catch((error) => {
            logger.error('Failed to send push notification to user', {
              bookingId: booking.id,
              userId: user.id,
              error: error instanceof Error ? error.message : error,
            });
          });
        }

        // Push notification to Academy Owner
        // Get center owner ID
        const centerOwnerId = (centerDetails as any)?.user?.toString();
        if (centerOwnerId) {
          const academyPushNotification = getBookingConfirmationAcademyPush({
            bookingId: updatedBooking.booking_id || updatedBooking.id,
            batchName,
            userName,
          });
          createAndSendNotification({
            recipientType: 'academy',
            recipientId: centerOwnerId,
            title: academyPushNotification.title,
            body: academyPushNotification.body,
            channels: ['push'],
            priority: 'high',
            data: {
              type: 'booking_confirmation_academy',
              bookingId: updatedBooking.id || updatedBooking.booking_id,
              batchId: booking.batch.toString(),
              centerId: booking.center.toString(),
            },
          }).catch((error) => {
            logger.error('Failed to send push notification to academy owner', {
              bookingId: booking.id,
              centerOwnerId,
              error: error instanceof Error ? error.message : error,
            });
          });
        }

        // Push notification to Admin (role-based)
        const adminPushNotification = getBookingConfirmationAdminPush({
          bookingId: updatedBooking.booking_id || updatedBooking.id,
          batchName,
          centerName,
        });
        createAndSendNotification({
          recipientType: 'role',
          roles: [DefaultRoles.ADMIN, DefaultRoles.SUPER_ADMIN],
          title: adminPushNotification.title,
          body: adminPushNotification.body,
          channels: ['push'],
          priority: 'high',
          data: {
            type: 'booking_confirmation_admin',
            bookingId: updatedBooking.booking_id || updatedBooking.id,
            batchId: booking.batch.toString(),
            centerId: booking.center.toString(),
          },
        }).catch((error) => {
          logger.error('Failed to send push notification to admin', {
            bookingId: booking.id,
            error: error instanceof Error ? error.message : error,
          });
        });

        logger.info(`Booking confirmation notifications queued for booking: ${booking.id}`);
      } catch (notificationError) {
        // Log error but don't fail the payment verification
        logger.error('Error sending booking confirmation notifications', {
          bookingId: booking.id,
          error: notificationError instanceof Error ? notificationError.message : notificationError,
        });
      }
    })().catch((error) => {
      // Catch any unhandled errors in the async function
      logger.error('Unhandled error in background notification sending', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : error,
      });
    });

    // Return only relevant data
    const response: VerifiedPaymentResponse = {
      id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
      booking_id: updatedBooking.booking_id || '',
      status: updatedBooking.status as BookingStatus,
      amount: updatedBooking.amount,
      currency: updatedBooking.currency,
      payment: {
        razorpay_order_id: updatedBooking.payment.razorpay_order_id || '',
        status: updatedBooking.payment.status,
        payment_method: updatedBooking.payment.payment_method || razorpayPayment.method || null,
        paid_at: updatedBooking.payment.paid_at || new Date(),
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

    // Return immediately without waiting for notifications
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to verify payment:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, 'Failed to verify payment');
  }
};

/**
 * User booking list item interface
 */
export interface UserBookingListItem {
  booking_id: string;
  id: string;
  batch: {
    id: string;
    name: string;
    scheduled: {
      start_date: Date;
      start_time: string;
      end_time: string;
      training_days: string[];
    };
    duration: {
      count: number;
      type: string;
    };
  };
  center: {
    id: string;
    center_name: string;
    logo?: string | null;
  };
  sport: {
    id: string;
    name: string;
    logo?: string | null;
  };
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    age?: number | null;
    profilePhoto?: string | null;
  }>;
  amount: number;
  currency: string;
  status: BookingStatus;
  status_message: string; // User-friendly message based on booking and payment status
  payment_status: PaymentStatus | string; // Payment status (returns 'paid' when payment status is SUCCESS, otherwise returns PaymentStatus)
  can_download_invoice: boolean; // Flag to indicate if invoice can be downloaded
  payment_enabled: boolean; // Flag to indicate if payment link should be enabled
  rejection_reason?: string | null; // Rejection reason if status is REJECTED
  created_at: Date;
}

export interface UserBookingsResult {
  data: UserBookingListItem[];
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
 * Get user bookings with enrolled batches
 */
export const getUserBookings = async (
  userId: string,
  params: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
  } = {}
): Promise<UserBookingsResult> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Build query - show all bookings (not just paid ones) to support new booking flow
    // Users can see bookings in SLOT_BOOKED, APPROVED, REJECTED, CONFIRMED, etc.
    const query: any = {
      user: userObjectId,
      is_deleted: false,
    };

    // Filter by booking status if provided
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

    // Get total count and bookings in parallel
    const [total, bookings] = await Promise.all([
      BookingModel.countDocuments(query),
      BookingModel.find(query)
        .populate('participants', 'id firstName lastName dob profilePhoto')
        .populate('batch', 'id name scheduled duration')
        .populate({
          path: 'batch',
          populate: {
            path: 'sport',
            select: 'id name logo',
          },
        })
        .populate({
          path: 'batch',
          populate: {
            path: 'center',
            select: 'id center_name logo',
          },
        })
        .select('booking_id id participants batch amount currency status payment.status rejection_reason createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Transform bookings to return required fields
    const transformedBookings: UserBookingListItem[] = bookings.map((booking: any) => {
      const bookingStatus = booking.status || BookingStatus.PENDING;
      const paymentStatus = booking.payment?.status || PaymentStatus.PENDING;
      
      return {
        booking_id: booking.booking_id || booking.id,
        id: booking.id,
        batch: {
          id: booking.batch?._id?.toString() || booking.batch?.id || '',
          name: booking.batch?.name || 'N/A',
          scheduled: booking.batch?.scheduled || {
            start_date: new Date(),
            start_time: '',
            end_time: '',
            training_days: [],
          },
          duration: booking.batch?.duration || {
            count: 0,
            type: '',
          },
        },
        participants: (booking.participants || []).map((p: any) => {
          const dob = p.dob ? new Date(p.dob) : null;
          const age = dob ? calculateAge(dob, new Date()) : null;
          return {
            id: p._id?.toString() || p.id || '',
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            age,
            profilePhoto: p.profilePhoto || null,
          };
        }),
        center: {
          id: booking.batch?.center?._id?.toString() || booking.batch?.center?.id || '',
          center_name: booking.batch?.center?.center_name || 'N/A',
          logo: booking.batch?.center?.logo || null,
        },
        sport: {
          id: booking.batch?.sport?._id?.toString() || booking.batch?.sport?.id || '',
          name: booking.batch?.sport?.name || 'N/A',
          logo: booking.batch?.sport?.logo || null,
        },
        amount: booking.amount || 0,
        currency: booking.currency || 'INR',
        status: bookingStatus,
        status_message: getBookingStatusMessage(bookingStatus, paymentStatus),
        payment_status: paymentStatus === PaymentStatus.SUCCESS ? 'paid' : paymentStatus,
        payment_enabled: isPaymentLinkEnabled(bookingStatus, paymentStatus),
        can_download_invoice: canDownloadInvoice(bookingStatus, paymentStatus),
        rejection_reason: bookingStatus === BookingStatus.REJECTED ? booking.rejection_reason || null : null,
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
    logger.error('Failed to get user bookings:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to get user bookings');
  }
};

// Booking details response
export interface BookingDetailsResponse {
  id: string;
  booking_id: string;
  status: BookingStatus;
  amount: number;
  currency: string;
  payment: {
    razorpay_order_id?: string | null;
    status: PaymentStatus | string; // Returns 'paid' when payment status is SUCCESS, otherwise returns PaymentStatus
    payment_method?: string | null;
    paid_at?: Date | null;
    failure_reason?: string | null;
  };
  payment_enabled: boolean; // Flag to indicate if payment link should be enabled
  can_cancel: boolean; // Flag to indicate if booking can be cancelled
  can_download_invoice: boolean; // Flag to indicate if invoice can be downloaded
  rejection_reason?: string | null; // Rejection reason if status is REJECTED
  cancellation_reason?: string | null; // Cancellation reason if status is CANCELLED
  batch: {
    id: string;
    name: string;
    scheduled: {
      start_date: Date;
      start_time: string;
      end_time: string;
      training_days: string[];
    };
    duration: {
      count: number;
      type: string;
    };
  };
  center: {
    id: string;
    center_name: string;
    logo?: string | null;
    address?: {
      line1: string | null;
      line2: string;
      city: string;
      state: string;
      country: string | null;
      pincode: string;
      latitude?: number | null;
      longitude ?: number | null;
    } | null;
  };
  sport: {
    id: string;
    name: string;
    logo?: string | null;
  };
  participants: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    profilePhoto?: string | null;
  }>;
  notes?: string | null;
  status_message: string;
  created_at: Date;
}

/**
 * Get booking details by ID
 */
export const getBookingDetails = async (
  bookingId: string,
  userId: string
): Promise<BookingDetailsResponse> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Fetch booking with all related data (using custom id field, not MongoDB _id)
    const booking = await BookingModel.findOne({
      id: bookingId,
      user: userObjectId,
      is_deleted: false,
    })
      .populate('participants', 'id firstName lastName dob profilePhoto')
      .populate({
        path: 'batch',
        select: 'id name scheduled duration',
        populate: [
          {
            path: 'sport',
            select: 'id name logo',
          },
          {
            path: 'center',
            select: 'id center_name logo location',
          },
        ],
      })
      .select('id booking_id status amount currency payment participants batch notes rejection_reason cancellation_reason createdAt')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    const bookingStatus = booking.status || BookingStatus.PENDING;
    const paymentStatus = booking.payment?.status || PaymentStatus.PENDING;

    // Calculate participant ages
    const participants = (booking.participants || []).map((p: any) => {
      const dob = p.dob ? new Date(p.dob) : null;
      const age = dob ? calculateAge(dob, new Date()) : null;
      return {
        id: p._id?.toString() || p.id || '',
        firstName: p.firstName || null,
        lastName: p.lastName || null,
        age,
        profilePhoto: p.profilePhoto || null,
      };
    });

    // Transform batch data
    const batchData = booking.batch as any;
    const centerData = batchData?.center as any;
    const sportData = batchData?.sport as any;

    const response: BookingDetailsResponse = {
      id: booking._id?.toString() || booking.id || '',
      booking_id: booking.booking_id || '',
      status: bookingStatus,
      amount: booking.amount || 0,
      currency: booking.currency || 'INR',
      payment: {
        razorpay_order_id: booking.payment?.razorpay_order_id || null,
        status: paymentStatus === PaymentStatus.SUCCESS ? 'paid' : paymentStatus,
        payment_method: booking.payment?.payment_method || null,
        paid_at: booking.payment?.paid_at || null,
        failure_reason: booking.payment?.failure_reason || null,
      },
      payment_enabled: isPaymentLinkEnabled(bookingStatus, paymentStatus),
      can_cancel: canCancelBooking(bookingStatus, paymentStatus),
      can_download_invoice: canDownloadInvoice(bookingStatus, paymentStatus),
      rejection_reason: bookingStatus === BookingStatus.REJECTED ? booking.rejection_reason || null : null,
      cancellation_reason: bookingStatus === BookingStatus.CANCELLED ? booking.cancellation_reason || null : null,
      batch: {
        id: batchData?._id?.toString() || batchData?.id || '',
        name: batchData?.name || 'N/A',
        scheduled: batchData?.scheduled || {
          start_date: new Date(),
          start_time: '',
          end_time: '',
          training_days: [],
        },
        duration: batchData?.duration || {
          count: 0,
          type: '',
        },
      },
      center: {
        id: centerData?._id?.toString() || centerData?.id || '',
        center_name: centerData?.center_name || 'N/A',
        logo: centerData?.logo || null,
        address: centerData?.location?.address
          ? {
              ...centerData.location.address,
              lat: centerData.location.latitude || centerData.location.lat || null,
              long: centerData.location.longitude || centerData.location.long || null,
            }
          : null,
      },
      sport: {
        id: sportData?._id?.toString() || sportData?.id || '',
        name: sportData?.name || 'N/A',
        logo: sportData?.logo || null,
      },
      participants,
      notes: booking.notes || null,
      status_message: getBookingStatusMessage(bookingStatus, paymentStatus),
      created_at: booking.createdAt,
    };

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get booking details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      bookingId,
    });
    throw new ApiError(500, 'Failed to get booking details');
  }
};

/**
 * Download booking invoice as PDF (user-side)
 */
export const downloadBookingInvoice = async (
  bookingId: string,
  userId: string
): Promise<Buffer> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Find booking and verify ownership
    const booking = await BookingModel.findOne({
      id: bookingId,
      user: userObjectId,
      is_deleted: false,
    }).lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Check if invoice can be downloaded (payment must be successful)
    if (booking.payment?.status !== PaymentStatus.SUCCESS) {
      throw new ApiError(400, 'Invoice can only be downloaded for successful payments');
    }

    // Import and use admin invoice service (reuse existing logic)
    const { generateBookingInvoice } = await import('../admin/invoice.service');
    return await generateBookingInvoice(bookingId);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to download booking invoice:', {
      error: error instanceof Error ? error.message : error,
      bookingId,
      userId,
    });
    throw new ApiError(500, 'Failed to download invoice');
  }
};

/**
 * Cancel payment order (only updates payment status, does not cancel booking)
 * Used when user initiates payment but cancels it before completing
 */
export const deleteOrder = async (
  data: DeleteOrderInput,
  userId: string
): Promise<CancelledBookingResponse> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Find booking by razorpay_order_id (no populate needed for validation)
    const booking = await BookingModel.findOne({
      'payment.razorpay_order_id': data.razorpay_order_id,
      user: userObjectId,
      is_deleted: false,
    })
      .select('_id id booking_id status payment batch center sport amount currency')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Check if payment is already verified/successful
    if (booking.payment.status === PaymentStatus.SUCCESS) {
      throw new ApiError(400, 'Cannot cancel order with successful payment. Please request a refund instead.');
    }

    // Check if payment is already cancelled
    if (booking.payment.status === PaymentStatus.CANCELLED) {
      throw new ApiError(400, 'Order is already cancelled');
    }

    // Only update payment status to CANCELLED, don't cancel the booking
    // Increment payment_cancelled_count each time payment is cancelled
    const currentCancelledCount = booking.payment?.payment_cancelled_count || 0;
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          'payment.status': PaymentStatus.CANCELLED,
          'payment.failure_reason': 'Payment order cancelled by user',
          'payment.payment_cancelled_count': currentCancelledCount + 1,
        },
      },
      { new: true }
    )
      .select('id booking_id status amount currency payment batch center sport')
      .populate('batch', '_id id name')
      .populate('center', '_id id center_name')
      .populate('sport', '_id id name')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to cancel order');
    }

    // Update transaction record if exists
    await TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_order_id: data.razorpay_order_id,
      },
      {
        $set: {
          status: TransactionStatus.CANCELLED,
          source: TransactionSource.USER_VERIFICATION,
          failure_reason: 'Payment order cancelled by user',
        },
      },
      { upsert: false } // Don't create if doesn't exist
    );

    // Create audit trail for payment order cancellation
    await createAuditTrail(
      ActionType.PAYMENT_FAILED,
      ActionScale.MEDIUM,
      `Payment order cancelled by user for booking ${booking.booking_id || booking.id}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: {
          razorpay_order_id: data.razorpay_order_id,
          previousPaymentStatus: booking.payment.status,
          bookingStatus: booking.status,
          reason: 'Payment order cancelled by user',
          payment_cancelled_count: currentCancelledCount + 1,
          cancelledAt: new Date().toISOString(),
        },
      }
    );

    logger.info(`Payment order cancelled: ${booking.id} for user ${userId}, Razorpay Order ID: ${data.razorpay_order_id}`);

    // Return limited data (booking status remains unchanged, only payment status changed)
    const cancelledBooking: CancelledBookingResponse = {
      id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
      booking_id: updatedBooking.booking_id || '',
      status: updatedBooking.status || booking.status, // Keep original booking status
      amount: updatedBooking.amount || 0,
      currency: updatedBooking.currency || 'INR',
      payment: {
        razorpay_order_id: updatedBooking.payment?.razorpay_order_id || data.razorpay_order_id,
        status: updatedBooking.payment?.status || PaymentStatus.CANCELLED,
        failure_reason: updatedBooking.payment?.failure_reason || 'Payment order cancelled by user',
      },
      batch: {
        id: (updatedBooking.batch as any)?._id?.toString() || (updatedBooking.batch as any)?.id || '',
        name: (updatedBooking.batch as any)?.name || '',
      },
      center: {
        id: (updatedBooking.center as any)?._id?.toString() || (updatedBooking.center as any)?.id || '',
        name: (updatedBooking.center as any)?.center_name || '',
      },
      sport: {
        id: (updatedBooking.sport as any)?._id?.toString() || (updatedBooking.sport as any)?.id || '',
        name: (updatedBooking.sport as any)?.name || '',
      },
    };

    return cancelledBooking;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to cancel order:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, 'Failed to cancel order');
  }
};

/**
 * Cancel booking by user with reason
 * Prevents cancellation after payment success
 */
export const cancelBooking = async (
  bookingId: string,
  reason: string,
  userId: string
): Promise<CancelBookingResponse> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Find booking by ID
    const booking = await BookingModel.findOne({
      id: bookingId,
      user: userObjectId,
      is_deleted: false,
    })
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Check if booking is already cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(400, 'Booking is already cancelled');
    }

    // Check if booking is completed
    if (booking.status === BookingStatus.COMPLETED) {
      throw new ApiError(400, 'Cannot cancel a completed booking');
    }

    // Check if booking is confirmed (payment successful)
    if (booking.status === BookingStatus.CONFIRMED) {
      throw new ApiError(400, 'Cannot cancel a confirmed booking. Please request a refund instead.');
    }

    // Prevent cancellation after payment success
    if (booking.payment.status === PaymentStatus.SUCCESS) {
      throw new ApiError(400, 'Cannot cancel booking after payment is successful. Please request a refund instead.');
    }

    // Update booking status to CANCELLED
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          status: BookingStatus.CANCELLED,
          'payment.status': booking.payment.status === PaymentStatus.INITIATED || booking.payment.status === PaymentStatus.PENDING 
            ? PaymentStatus.CANCELLED 
            : booking.payment.status, // Only update payment status if it's INITIATED or PENDING
          'payment.failure_reason': reason,
          cancellation_reason: reason, // Store cancellation reason in separate field
          cancelled_by: 'user', // User cancelled the booking
        },
      },
      { new: true }
    )
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .select('id booking_id status amount currency payment cancellation_reason cancelled_by batch center sport')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to cancel booking');
    }

    // Update transaction record if exists
    if (booking.payment.razorpay_order_id) {
      await TransactionModel.findOneAndUpdate(
        {
          booking: booking._id,
          razorpay_order_id: booking.payment.razorpay_order_id,
        },
        {
          $set: {
            status: TransactionStatus.CANCELLED,
            source: TransactionSource.USER_VERIFICATION,
            failure_reason: reason,
          },
        },
        { upsert: false } // Don't create if doesn't exist
      );
    }

    // Create audit trail
    await createAuditTrail(
      ActionType.BOOKING_CANCELLED,
      ActionScale.MEDIUM,
      `Booking cancelled by user: ${reason}`,
      'Booking',
      booking._id,
      {
        userId: userObjectId,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: {
          reason: reason,
          cancelledBy: 'user',
          cancelledAt: new Date().toISOString(),
          previousStatus: booking.status,
          previousPaymentStatus: booking.payment.status,
        },
      }
    );

    // Send notifications for cancellation (async, non-blocking)
    (async () => {
      try {
        // Fetch required data for notifications
        const [userDetails, centerDetails, batchDetails] = await Promise.all([
          UserModel.findById(booking.user).select('id firstName lastName email mobile').lean(),
          CoachingCenterModel.findById(booking.center).select('id center_name user email mobile_number').lean(),
          BatchModel.findById(booking.batch).select('id name').lean(),
        ]);

        const batchName = batchDetails?.name || 'batch';
        const centerName = (centerDetails as any)?.center_name || 'Academy';
        const user = userDetails as any;
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
        const centerOwnerId = (centerDetails as any)?.user?.toString();

        // Notification to User (Push + Email + SMS + WhatsApp)
        if (user?.id) {
          // Push notification
          const userPushNotification = getBookingCancelledUserPush({
            batchName,
            reason: reason || null,
          });
          await createAndSendNotification({
            recipientType: 'user',
            recipientId: user.id,
            title: userPushNotification.title,
            body: userPushNotification.body,
            channels: ['push'],
            priority: 'medium',
            data: {
              type: 'booking_cancelled',
              bookingId: booking.booking_id || booking.id,
              batchId: booking.batch.toString(),
              reason: reason || null,
            },
          });

          // Email notification (async)
          if (user.email) {
            queueEmail(user.email, EmailSubjects.BOOKING_CANCELLED_USER, {
              template: EmailTemplates.BOOKING_CANCELLED_USER,
              text: getBookingCancelledUserEmailText({
                batchName,
                centerName,
                reason: reason || null,
              }),
              templateVariables: {
                userName,
                batchName,
                centerName,
                bookingId: booking.booking_id || booking.id,
                reason: reason || null,
                year: new Date().getFullYear(),
              },
              priority: 'medium',
              metadata: {
                type: 'booking_cancelled',
                bookingId: booking.booking_id || booking.id,
                recipient: 'user',
              },
            });
          }

          // SMS notification (async)
          if (user.mobile) {
            const smsMessage = getBookingCancelledUserSms({
              batchName,
              centerName,
              bookingId: booking.booking_id || booking.id,
              reason: reason || null,
            });
            queueSms(user.mobile, smsMessage, 'medium', {
              type: 'booking_cancelled',
              bookingId: booking.booking_id || booking.id,
              recipient: 'user',
            });
          }

          // WhatsApp notification (async)
          if (user.mobile) {
            const whatsappMessage = getBookingCancelledUserWhatsApp({
              batchName,
              centerName,
              bookingId: booking.booking_id || booking.id,
              reason: reason || null,
            });
            queueWhatsApp(user.mobile, whatsappMessage, 'medium', {
              type: 'booking_cancelled',
              bookingId: booking.booking_id || booking.id,
              recipient: 'user',
            });
          }
        }

        // Notification to Academy Owner (Push + Email + SMS + WhatsApp)
        if (centerOwnerId) {
          const academyOwner = await UserModel.findById(centerOwnerId).select('id email mobile').lean();
          if (academyOwner) {
            // Push notification
            const academyPushNotification = getBookingCancelledAcademyPush({
              bookingId: booking.booking_id || booking.id,
              batchName,
              userName,
              reason: reason || null,
            });
            await createAndSendNotification({
              recipientType: 'academy',
              recipientId: academyOwner.id,
              title: academyPushNotification.title,
              body: academyPushNotification.body,
              channels: ['push'],
              priority: 'medium',
              data: {
                type: 'booking_cancelled_academy',
                bookingId: booking.id || booking.booking_id,
                batchId: booking.batch.toString(),
                reason: reason || null,
              },
            });

            // Email notification (async)
            const academyEmail = (centerDetails as any)?.email || academyOwner.email;
            if (academyEmail) {
              queueEmail(academyEmail, EmailSubjects.BOOKING_CANCELLED_ACADEMY, {
                template: EmailTemplates.BOOKING_CANCELLED_ACADEMY,
                text: getBookingCancelledAcademyEmailText({
                  bookingId: booking.booking_id || booking.id,
                  batchName,
                  userName,
                  reason: reason || null,
                }),
                templateVariables: {
                  centerName,
                  batchName,
                  userName,
                  userEmail: user?.email || 'N/A',
                  bookingId: booking.booking_id || booking.id,
                  reason: reason || null,
                  year: new Date().getFullYear(),
                },
                priority: 'medium',
                metadata: {
                  type: 'booking_cancelled',
                  bookingId: booking.booking_id || booking.id,
                  recipient: 'academy',
                },
              });
            }

            // SMS notification (async)
            const academyMobile = (centerDetails as any)?.mobile_number || academyOwner.mobile;
            if (academyMobile) {
              const smsMessage = getBookingCancelledAcademySms({
                bookingId: booking.booking_id || booking.id,
                batchName,
                userName,
                reason: reason || null,
              });
              queueSms(academyMobile, smsMessage, 'medium', {
                type: 'booking_cancelled',
                bookingId: booking.booking_id || booking.id,
                recipient: 'academy',
              });
            }

            // WhatsApp notification (async)
            if (academyMobile) {
              const whatsappMessage = getBookingCancelledAcademyWhatsApp({
                bookingId: booking.id,
                batchName,
                userName,
                reason: reason || null,
              });
              queueWhatsApp(academyMobile, whatsappMessage, 'medium', {
                type: 'booking_cancelled',
                bookingId: booking.id,
                recipient: 'academy',
              });
            }
          }
        }

        // Notification to Admin (Email only, async)
        if (config.admin.email) {
          queueEmail(config.admin.email, EmailSubjects.BOOKING_CANCELLED_ADMIN, {
            template: EmailTemplates.BOOKING_CANCELLED_ADMIN,
            text: getBookingCancelledAdminEmailText({
              bookingId: booking.booking_id || booking.id,
              batchName,
              centerName,
              userName,
              reason: reason || null,
            }),
            templateVariables: {
              userName,
              userEmail: user?.email || 'N/A',
              batchName,
              centerName,
              bookingId: booking.booking_id || booking.id,
              reason: reason || null,
              year: new Date().getFullYear(),
            },
            priority: 'medium',
            metadata: {
              type: 'booking_cancelled',
              bookingId: booking.booking_id || booking.id,
              recipient: 'admin',
            },
          });
        }

        logger.info(`Booking cancellation notifications queued for booking: ${booking.id}`);
      } catch (notificationError) {
        // Log error but don't fail the cancellation
        logger.error('Error sending booking cancellation notifications', {
          bookingId: booking.id,
          error: notificationError instanceof Error ? notificationError.message : notificationError,
        });
      }
    })().catch((error) => {
      // Catch any unhandled errors in the async function
      logger.error('Unhandled error in background notification sending for cancellation', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : error,
      });
    });

    logger.info(`Booking cancelled: ${booking.id} by user ${userId}, Reason: ${reason}`);

    // Return only relevant data
    const response: CancelBookingResponse = {
      id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
      booking_id: updatedBooking.booking_id || '',
      status: updatedBooking.status as BookingStatus,
      amount: updatedBooking.amount,
      currency: updatedBooking.currency,
      payment: {
        status: updatedBooking.payment.status,
        failure_reason: updatedBooking.payment.failure_reason || reason,
      },
      cancellation_reason: updatedBooking.cancellation_reason || reason,
      cancelled_by: updatedBooking.cancelled_by || 'user',
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
    };

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to cancel booking:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      bookingId,
      userId,
    });
    throw new ApiError(500, 'Failed to cancel booking');
  }
};


