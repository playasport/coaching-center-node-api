import { Types } from 'mongoose';
import { BookingModel, Booking, PaymentStatus, BookingStatus } from '../../models/booking.model';
import { TransactionModel, TransactionType, TransactionStatus, TransactionSource } from '../../models/transaction.model';
import { BatchModel } from '../../models/batch.model';
import { ParticipantModel } from '../../models/participant.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BatchStatus } from '../../enums/batchStatus.enum';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import { Gender } from '../../enums/gender.enum';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { getPaymentService } from '../common/payment/PaymentService';
import { config } from '../../config/env';
import type { BookingSummaryInput, CreateOrderInput, VerifyPaymentInput, DeleteOrderInput } from '../../validations/booking.validation';
import { queueEmail, queueSms } from '../common/notificationQueue.service';

// Get payment service instance
const paymentService = getPaymentService();

/**
 * Generate unique booking ID (format: BK-YYYY-NNNN)
 * Example: BK-2024-0001, BK-2024-0002, etc.
 */
export const generateBookingId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;

  // Find the highest booking_id for this year using prefix match (more efficient than regex)
  // Using $gte and $lt for better index utilization
  const nextYearPrefix = `BK-${year + 1}-`;
  const lastBooking = await BookingModel.findOne({
    booking_id: {
      $gte: prefix,
      $lt: nextYearPrefix,
    },
  })
    .sort({ booking_id: -1 })
    .select('booking_id')
    .lean()
    .limit(1);

  let sequence = 1;
  if (lastBooking && lastBooking.booking_id) {
    // Extract sequence number from last booking_id (e.g., BK-2024-0123 -> 123)
    const lastSequence = parseInt(lastBooking.booking_id.replace(prefix, ''), 10);
    if (!isNaN(lastSequence) && lastSequence >= 0) {
      sequence = lastSequence + 1;
    }
  }

  // Format sequence with leading zeros (4 digits)
  const formattedSequence = sequence.toString().padStart(4, '0');
  return `${prefix}${formattedSequence}`;
};

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

/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Calculate age from date of birth
 * Exported for use in other services
 */
export const calculateAge = (dob: Date, currentDate: Date): number => {
  const birthDate = new Date(dob);
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Map participant gender to Gender enum (now gender is already a string, so just return it)
 * Participant gender is now stored as string: 'male', 'female', 'other'
 */
const mapParticipantGenderToEnum = (gender: string | null | undefined): Gender | null => {
  if (!gender) return null;
  // Gender is already a string enum value, just validate and return
  if (Object.values(Gender).includes(gender as Gender)) {
    return gender as Gender;
  }
  return null;
};

/**
 * Common validation: Validate and fetch participants
 */
const validateAndFetchParticipants = async (
  participantIds: string[],
  userObjectId: Types.ObjectId
): Promise<any[]> => {
  if (participantIds.length === 0) {
    throw new ApiError(400, 'At least one participant ID is required');
  }

  // Validate all participant IDs
  for (const participantId of participantIds) {
    if (!Types.ObjectId.isValid(participantId)) {
      throw new ApiError(400, `Invalid participant ID: ${participantId}`);
    }
  }

  // Check for duplicate participant IDs
  const uniqueParticipantIds = [...new Set(participantIds)];
  if (uniqueParticipantIds.length !== participantIds.length) {
    throw new ApiError(400, 'Duplicate participant IDs are not allowed');
  }

  // Fetch all participants
  const participants = await ParticipantModel.find({
    _id: { $in: participantIds.map(id => new Types.ObjectId(id)) },
    is_deleted: false,
    is_active: true,
  }).lean();

  if (participants.length !== participantIds.length) {
    throw new ApiError(404, 'One or more participants not found or inactive');
  }

  // Verify all participants belong to user
  for (const participant of participants) {
    if (participant.userId.toString() !== userObjectId.toString()) {
      throw new ApiError(403, `Participant ${participant._id} does not belong to you`);
    }
  }

  return participants;
};

/**
 * Common validation: Validate batch and fetch coaching center
 */
const validateBatchAndCenter = async (batchId: string): Promise<{ batch: any; coachingCenter: any }> => {
  if (!Types.ObjectId.isValid(batchId)) {
    throw new ApiError(400, 'Invalid batch ID');
  }

  const batch = await BatchModel.findById(batchId)
    .select('_id id name sport center is_allowed_disabled status is_active is_deleted age capacity scheduled duration admission_fee base_price discounted_price gender')
    .populate('sport', 'id name')
    .populate('center', 'id center_name logo')
    .lean();

  // Validate batch exists
  if (!batch) {
    throw new ApiError(404, 'Batch not found');
  }

  // Validate batch is not deleted
  if (batch.is_deleted) {
    throw new ApiError(400, 'Batch has been deleted and is not available for booking');
  }

  // Validate batch is active (not disabled)
  if (!batch.is_active) {
    throw new ApiError(400, 'Batch is disabled and not available for booking');
  }

  // Check if batch is published
  if (batch.status !== BatchStatus.PUBLISHED) {
    throw new ApiError(400, 'Batch is not published and not available for booking');
  }

  // Use populated coaching center data (already fetched in populate)
  const populatedCenter = batch.center as any;
  if (!populatedCenter) {
    throw new ApiError(404, 'Coaching center not found');
  }

  // Fetch full coaching center details for validation (only if we need more fields than populated)
  // Since we only populated 'id center_name logo', we need to fetch full details for age/gender validation
  const centerId = populatedCenter._id || populatedCenter.id;
  const coachingCenter = await CoachingCenterModel.findById(centerId)
    .select('id center_name logo age allowed_genders allowed_disabled is_only_for_disabled is_active is_deleted status approval_status location experience')
    .lean();

  // Validate coaching center exists
  if (!coachingCenter) {
    throw new ApiError(404, 'Coaching center not found');
  }

  // Validate coaching center is not deleted
  if (coachingCenter.is_deleted) {
    throw new ApiError(400, 'Coaching center has been deleted and is not available for booking');
  }

  // Validate coaching center is active (not disabled)
  if (!coachingCenter.is_active) {
    throw new ApiError(400, 'Coaching center is disabled and not available for booking');
  }

  // Validate coaching center is published
  if (coachingCenter.status !== CoachingCenterStatus.PUBLISHED) {
    throw new ApiError(400, 'Coaching center is not published and not available for booking');
  }

  // Validate coaching center is approved
  if (coachingCenter.approval_status !== 'approved') {
    throw new ApiError(400, 'Coaching center is not approved and not available for booking');
  }

  return { batch, coachingCenter };
};

/**
 * Common validation: Check if participants are already enrolled in the batch
 */
const validateParticipantEnrollment = async (
  participantIds: Types.ObjectId[],
  batchId: Types.ObjectId
): Promise<void> => {
  // Check if any participant is already enrolled in this batch
  // First check without populate for faster query
  const existingBookings = await BookingModel.find({
    batch: batchId,
    participants: { $in: participantIds },
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    is_deleted: false,
  })
    .select('participants')
    .lean();

  if (existingBookings.length > 0) {
    // Find which participants are already enrolled
    const enrolledParticipantIds = new Set<string>();
    
    for (const booking of existingBookings) {
      for (const bookingParticipantId of booking.participants) {
        const participantIdStr = bookingParticipantId.toString();
        if (participantIds.some(id => id.toString() === participantIdStr)) {
          enrolledParticipantIds.add(participantIdStr);
        }
      }
    }

    if (enrolledParticipantIds.size > 0) {
      // Only fetch participant names if we need to show them in error message
      const enrolledIdsArray = Array.from(enrolledParticipantIds).map(id => new Types.ObjectId(id));
      const enrolledParticipants = await ParticipantModel.find({
        _id: { $in: enrolledIdsArray },
      })
        .select('firstName lastName')
        .lean();

      const participantNames = enrolledParticipants.map(p => {
        const firstName = p.firstName || '';
        const lastName = p.lastName || '';
        return `${firstName} ${lastName}`.trim() || p._id.toString();
      });

      const namesStr = participantNames.length > 0 
        ? participantNames.join(', ')
        : 'one or more participants';
      throw new ApiError(
        400,
        `${namesStr} ${participantNames.length === 1 ? 'is' : 'are'} already enrolled in this batch`
      );
    }
  }
};

/**
 * Common validation: Validate slot availability
 */
const validateSlotAvailability = async (
  batch: any,
  requestedSlots: number
): Promise<void> => {
  // Use aggregation to count total participants efficiently
  const result = await BookingModel.aggregate([
    {
      $match: {
        batch: batch._id,
        status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        is_deleted: false,
      },
    },
    {
      $project: {
        participantCount: { $size: { $ifNull: ['$participants', []] } },
      },
    },
    {
      $group: {
        _id: null,
        totalBookedParticipants: { $sum: '$participantCount' },
      },
    },
  ]);

  const totalBookedParticipants = result.length > 0 ? (result[0].totalBookedParticipants || 0) : 0;

  // Check if adding new participants would exceed capacity
  const totalAfterBooking = totalBookedParticipants + requestedSlots;

  if (batch.capacity.max !== null && batch.capacity.max !== undefined && totalAfterBooking > batch.capacity.max) {
    const availableSlots = batch.capacity.max - totalBookedParticipants;
    throw new ApiError(400, `Insufficient slots available. Only ${availableSlots} slot(s) remaining. Requested: ${requestedSlots}`);
  }
};

/**
 * Common validation: Validate participant eligibility (age, gender, disability)
 * 
 * Validates:
 * 1. Age: Participant age must be within batch and coaching center age ranges
 * 2. Gender: Participant gender must be allowed by coaching center
 * 3. Disability: 
 *    - If coaching center is ONLY for disabled (is_only_for_disabled = true): participant MUST have disability
 *    - If coaching center does NOT allow disabled (allowed_disabled = false): participant MUST NOT have disability
 *    - Note: Batches inherit disability eligibility from their coaching center
 */
const validateParticipantEligibility = async (
  participants: any[],
  batch: any,
  coachingCenter: any
): Promise<void> => {
  const currentDate = new Date();

  for (const participant of participants) {
    // Age Validation
    if (!participant.dob) {
      throw new ApiError(400, `Participant ${participant.firstName || participant._id} does not have a date of birth. Age validation is required.`);
    }

    const participantAge = calculateAge(participant.dob, currentDate);

    // Check against batch age range
    if (participantAge < batch.age.min || participantAge > batch.age.max) {
      throw new ApiError(
        400,
        `Participant ${participant.firstName || participant._id} age (${participantAge}) is outside the batch age range (${batch.age.min}-${batch.age.max} years)`
      );
    }

    // Check against coaching center age range
    if (participantAge < coachingCenter.age.min || participantAge > coachingCenter.age.max) {
      throw new ApiError(
        400,
        `Participant ${participant.firstName || participant._id} age (${participantAge}) is outside the coaching center age range (${coachingCenter.age.min}-${coachingCenter.age.max} years)`
      );
    }

    // Gender Validation
    // If participant gender is null or empty, allow all genders (skip validation)
    // If batch/center gender restrictions are null or empty, allow all genders
    // First check batch-level gender restriction (batch can be more restrictive than center)
    // Then check center-level gender restriction
    if (participant.gender !== null && participant.gender !== undefined && participant.gender !== '') {
      const participantGender = mapParticipantGenderToEnum(participant.gender);

      if (participantGender) {
        // Check batch gender restriction first (batch can override center setting)
        // If batch.gender is null or empty array, allow all genders
        if (batch.gender && Array.isArray(batch.gender) && batch.gender.length > 0) {
          const batchAllowedGenders = batch.gender.map((g: string) => g.toLowerCase());
          if (!batchAllowedGenders.includes(participantGender.toLowerCase())) {
            const allowedGendersStr = batch.gender.join(', ');
            throw new ApiError(
              400,
              `Participant ${participant.firstName || participant._id} gender (${participantGender}) is not allowed for this batch. Batch allowed genders: ${allowedGendersStr}`
            );
          }
        }
        // If batch.gender is null/empty, skip batch validation (allow all)

        // Also check coaching center gender restriction (for consistency)
        // If coachingCenter.allowed_genders is null or empty array, allow all genders
        if (coachingCenter.allowed_genders && Array.isArray(coachingCenter.allowed_genders) && coachingCenter.allowed_genders.length > 0) {
          if (!coachingCenter.allowed_genders.includes(participantGender)) {
            const allowedGendersStr = coachingCenter.allowed_genders.join(', ');
            throw new ApiError(
              400,
              `Participant ${participant.firstName || participant._id} gender (${participantGender}) is not allowed by the coaching center. Allowed genders: ${allowedGendersStr}`
            );
          }
        }
        // If coachingCenter.allowed_genders is null/empty, skip center validation (allow all)
      }
    }
    // If participant.gender is null/undefined/empty, skip all gender validation (allow all)

    // Disability Validation
    // Check if participant has a disability (0 = no, 1 = yes)
    const hasDisability = participant.disability === 1;

    // First check batch-level disability setting (batch can override center setting)
    if (!batch.is_allowed_disabled && hasDisability) {
      throw new ApiError(
        400,
        `Participant ${participant.firstName || participant._id || 'Unknown'} has a disability. This batch (${batch.name || 'Unknown'}) does not allow disabled participants.`
      );
    }

    // Then validate against coaching center disability settings
    if (coachingCenter.is_only_for_disabled) {
      // Coaching center is ONLY for disabled participants
      if (!hasDisability) {
        throw new ApiError(
          400,
          `Participant ${participant.firstName || participant._id || 'Unknown'} does not have a disability. This coaching center (${coachingCenter.center_name || 'Unknown'}) is exclusively for disabled participants.`
        );
      }
    } else {
      // Coaching center is NOT exclusively for disabled participants
      // Check if it allows disabled participants at all
      if (!coachingCenter.allowed_disabled && hasDisability) {
        throw new ApiError(
          400,
          `Participant ${participant.firstName || participant._id || 'Unknown'} has a disability. This coaching center (${coachingCenter.center_name || 'Unknown'}) does not allow disabled participants.`
        );
      }
    }

    // Note: Batch-level setting (is_allowed_disabled) takes precedence over center setting
    // If batch allows disabled but center doesn't, batch setting is checked first and will fail
    // If batch doesn't allow disabled, participant with disability cannot book regardless of center setting
  }
};

/**
 * Get booking summary before creating order
 */
export const getBookingSummary = async (
  data: BookingSummaryInput,
  userId: string
): Promise<BookingSummary> => {
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
    
    // Use discounted_price if available, otherwise use base_price
    // discounted_price should be <= base_price (validated in batch model)
    const perParticipantFee = batch.discounted_price !== null && batch.discounted_price !== undefined 
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

    // Subtotal before GST
    const subtotal = roundToTwoDecimals(baseAmount + platformFee);

    // GST calculation (from settings, default from config if not set, only if GST is enabled)
    const gst = isGstEnabled ? roundToTwoDecimals((subtotal * gstPercentage) / 100) : 0;

    // Total amount including GST (if enabled)
    const totalAmount = roundToTwoDecimals(subtotal + gst);

    if (totalAmount <= 0) {
      throw new ApiError(400, 'Booking amount must be greater than zero');
    }

    return {
      batch: {
        id: batch._id.toString(),
        name: batch.name,
        sport: {
          id: (batch.sport as any)._id?.toString() || (batch.sport as any).id,
          name: (batch.sport as any).name,
        },
        center: {
          id: (batch.center as any)._id?.toString() || (batch.center as any).id,
          name: (batch.center as any).center_name,
          logo: (batch.center as any).logo || null,
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
 * Create Razorpay order and booking record
 */
export const createOrder = async (
  data: CreateOrderInput,
  userId: string
): Promise<{ booking: CreatedBookingResponse; razorpayOrder: RazorpayOrderResponse }> => {
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
    // We only need to fetch ObjectIds for creating the booking record (minimal queries)
    const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
    const participantObjectIds = participantIds.map(id => new Types.ObjectId(id));
    const batchObjectId = new Types.ObjectId(data.batchId);
    const centerObjectId = new Types.ObjectId(summary.batch.center.id);
    const sportObjectId = new Types.ObjectId(summary.batch.sport.id);

    // Generate booking ID and create payment order in parallel (independent operations)
    const [bookingId, paymentOrder] = await Promise.all([
      generateBookingId(),
      (async () => {
        const orderData = {
          amount: Math.round(summary.amount * 100), // Convert to paise (multiply by 100)
          currency: summary.currency,
          receipt: `booking_${Date.now()}_${userObjectId.toString().slice(-6)}`,
          notes: {
            userId: userId,
            participantIds: data.participantIds,
            batchId: data.batchId,
            centerId: summary.batch.center.id,
            sportId: summary.batch.sport.id,
          },
        };
        return paymentService.createOrder(orderData);
      })(),
    ]);

    // Create booking record
    const bookingData: any = {
      user: userObjectId,
      participants: participantObjectIds,
      batch: batchObjectId,
      center: centerObjectId,
      sport: sportObjectId,
      amount: summary.amount,
      currency: summary.currency,
      status: BookingStatus.PENDING,
      booking_id: bookingId,
      payment: {
        razorpay_order_id: paymentOrder.id,
        amount: summary.amount,
        currency: summary.currency,
        status: PaymentStatus.PENDING,
      },
      notes: data.notes || null,
    };

    const booking = new BookingModel(bookingData);
    
    // Prepare transaction data (before saving booking to get _id)
    const transactionData: any = {
      user: userObjectId,
      razorpay_order_id: paymentOrder.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.PENDING,
      source: TransactionSource.USER_VERIFICATION,
      amount: summary.amount,
      currency: summary.currency,
      metadata: {
        participantIds: data.participantIds,
        batchId: data.batchId,
        notes: data.notes,
      },
    };

    // Save booking first to get _id, then save transaction in parallel
    await booking.save();
    transactionData.booking = booking._id;
    
    const transaction = new TransactionModel(transactionData);
    await transaction.save();

    logger.info(`Booking created: ${booking.id} for user ${userId}, Transaction: ${transaction.id}`);

    // Build response directly from existing data (no additional database query needed)
    // We already have all the data from summary and what we just created
    const createdBooking: CreatedBookingResponse = {
      id: booking.id || booking._id.toString(),
      booking_id: bookingId,
      status: BookingStatus.PENDING,
      amount: summary.amount,
      currency: summary.currency,
      payment: {
        razorpay_order_id: paymentOrder.id,
        status: PaymentStatus.PENDING,
      },
      batch: {
        id: summary.batch.id,
        name: summary.batch.name,
      },
      center: {
        id: summary.batch.center.id,
        name: summary.batch.center.name,
      },
      sport: {
        id: summary.batch.sport.id,
        name: summary.batch.sport.name,
      },
    };

    return {
      booking: createdBooking,
      razorpayOrder: paymentOrder,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create order:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, 'Failed to create order');
  }
};

/**
 * Verify Razorpay payment and update booking status
 */
export const verifyPayment = async (
  data: VerifyPaymentInput,
  userId: string
): Promise<Booking> => {
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

    // Verify payment signature using payment service
    const isValidSignature = await paymentService.verifyPaymentSignature(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature
    );

    if (!isValidSignature) {
      logger.warn('Payment signature verification failed', {
        bookingId: booking.id,
        userId,
        orderId: data.razorpay_order_id,
      });
      throw new ApiError(400, 'Invalid payment signature');
    }

    // Fetch payment details using payment service
    const razorpayPayment = await paymentService.fetchPayment(data.razorpay_payment_id);

    // Verify payment status and amount
    if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
      throw new ApiError(400, `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`);
    }

    // Verify amount matches (convert from paise to rupees)
    const expectedAmount = Math.round(booking.amount * 100);
    if (razorpayPayment.amount !== expectedAmount) {
      logger.error('Payment amount mismatch', {
        bookingId: booking.id,
        expected: expectedAmount,
        received: razorpayPayment.amount,
      });
      throw new ApiError(400, 'Payment amount does not match booking amount');
    }

    // Update booking with payment details
    const updatedBooking = await BookingModel.findByIdAndUpdate(
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
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name')
      .populate('center', 'id center_name email mobile_number')
      .populate('sport', 'id name')
      .lean();

    if (!updatedBooking) {
      throw new ApiError(500, 'Failed to update booking');
    }

    // Update or create transaction record
    await TransactionModel.findOneAndUpdate(
      {
        booking: booking._id,
        razorpay_order_id: data.razorpay_order_id,
      },
      {
        $set: {
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          status: TransactionStatus.SUCCESS,
          source: TransactionSource.USER_VERIFICATION,
          payment_method: razorpayPayment.method || null,
          processed_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`Payment verified successfully for booking: ${booking.id}`);

    // Send confirmation emails/SMS asynchronously (non-blocking)
    // Don't await - let it run in background
    (async () => {
      try {
        // Fetch batch details for scheduled information
        // Use the original booking's batch ID (ObjectId) before population
        const batchId = booking.batch;
        const batchDetails = await BatchModel.findById(batchId).lean();
        
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
        const participantNames = (updatedBooking.participants as any[])
          .map((p: any) => {
            const firstName = p.firstName || '';
            const lastName = p.lastName || '';
            return `${firstName} ${lastName}`.trim() || p.id || 'Participant';
          })
          .join(', ');

        // Get user details
        const user = updatedBooking.user as any;
        const userName = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
          : 'User';
        const userEmail = user?.email;
        const userMobile = user?.mobile;

        // Get center details
        const center = updatedBooking.center as any;
        const centerName = center?.center_name || 'Coaching Center';
        const centerEmail = center?.email;
        const centerMobile = center?.mobile_number;

        // Get sport and batch details
        const sport = updatedBooking.sport as any;
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

        // Queue emails using notification queue (non-blocking)
        // Send email to user
        if (userEmail) {
          queueEmail(userEmail, 'Booking Confirmed - PlayAsport', {
            template: 'booking-confirmation-user.html',
            text: `Your booking ${updatedBooking.id} has been confirmed for ${batchName} at ${centerName}.`,
            templateVariables: emailTemplateVariables,
            priority: 'high',
            metadata: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.id,
              recipient: 'user',
            },
          });
        }

        // Send email to coaching center
        if (centerEmail) {
          queueEmail(centerEmail, 'New Booking Received - PlayAsport', {
            template: 'booking-confirmation-center.html',
            text: `You have received a new booking ${updatedBooking.id} for ${batchName} from ${userName}.`,
            templateVariables: {
              ...emailTemplateVariables,
              userEmail: userEmail || 'N/A',
            },
            priority: 'high',
            metadata: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.id,
              recipient: 'coaching_center',
            },
          });
        }

        // Send email to admin
        if (config.admin.email) {
          queueEmail(config.admin.email, 'New Booking Notification - PlayAsport', {
            template: 'booking-confirmation-admin.html',
            text: `A new booking ${updatedBooking.id} has been confirmed for ${batchName} at ${centerName}.`,
            templateVariables: {
              ...emailTemplateVariables,
              userEmail: userEmail || 'N/A',
            },
            priority: 'high',
            metadata: {
              type: 'booking_confirmation',
              bookingId: updatedBooking.id,
              recipient: 'admin',
            },
          });
        }

        // Prepare SMS messages
        const userNameForSms = userName || 'User';
        const userSmsMessage = `Dear ${userNameForSms}, your booking ${updatedBooking.id} for ${batchName} (${sportName}) at ${centerName} has been confirmed. Participants: ${participantNames}. Start Date: ${startDate}, Time: ${startTime}-${endTime}. Amount Paid: ${updatedBooking.currency} ${updatedBooking.amount.toFixed(2)}. Thank you for choosing PlayAsport!`;
        
        const centerSmsMessage = `New booking ${updatedBooking.id} received for ${batchName} (${sportName}). Customer: ${userName || 'N/A'}. Participants: ${participantNames}. Start Date: ${startDate}, Time: ${startTime}-${endTime}. Amount: ${updatedBooking.currency} ${updatedBooking.amount.toFixed(2)}. - PlayAsport`;

        // Queue SMS notifications using notification queue (non-blocking)
        // Send SMS to user
        if (userMobile) {
          queueSms(userMobile, userSmsMessage, 'high', {
            type: 'booking_confirmation',
            bookingId: updatedBooking.id,
            recipient: 'user',
          });
        } else {
          logger.warn('User mobile number not available for SMS', {
            bookingId: booking.id,
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

    // Return immediately without waiting for notifications
    return updatedBooking as Booking;
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
    sport: {
      id: string;
      name: string;
    };
    center: {
      id: string;
      center_name: string;
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
  };
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  amount: number;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  invoice_id: string | null;
  created_at: Date;
  updated_at: Date;
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

    // Build query - only show paid bookings (payment status = success)
    const query: any = {
      user: userObjectId,
      is_deleted: false,
      'payment.status': PaymentStatus.SUCCESS, // Only show paid bookings
    };

    // Filter by status if provided
    if (params.status) {
      query.status = params.status;
    }

    // Note: paymentStatus filter is removed - we always show only paid bookings
    // If paymentStatus filter is provided, it's ignored (only paid bookings are shown)

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Get total count and bookings in parallel
    const [total, bookings] = await Promise.all([
      BookingModel.countDocuments(query),
      BookingModel.find(query)
        .populate('participants', 'id firstName lastName')
        .populate('batch', 'id name scheduled duration')
        .populate({
          path: 'batch',
          populate: {
            path: 'sport',
            select: 'id name',
          },
        })
        .populate({
          path: 'batch',
          populate: {
            path: 'center',
            select: 'id center_name',
          },
        })
        .select('booking_id id participants batch amount currency status payment.status payment.payment_method payment.razorpay_order_id createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Transform bookings to return required fields
    const transformedBookings: UserBookingListItem[] = bookings.map((booking: any) => ({
      booking_id: booking.booking_id || booking.id,
      id: booking.id,
      batch: {
        id: booking.batch?._id?.toString() || booking.batch?.id || '',
        name: booking.batch?.name || 'N/A',
        sport: {
          id: booking.batch?.sport?._id?.toString() || booking.batch?.sport?.id || '',
          name: booking.batch?.sport?.name || 'N/A',
        },
        center: {
          id: booking.batch?.center?._id?.toString() || booking.batch?.center?.id || '',
          center_name: booking.batch?.center?.center_name || 'N/A',
        },
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
      participants: (booking.participants || []).map((p: any) => ({
        id: p._id?.toString() || p.id || '',
        firstName: p.firstName || '',
        lastName: p.lastName || '',
      })),
      amount: booking.amount || 0,
      currency: booking.currency || 'INR',
      status: booking.status || BookingStatus.PENDING,
      payment_status: booking.payment?.status || PaymentStatus.PENDING,
      payment_method: booking.payment?.payment_method || null,
      invoice_id: booking.payment?.razorpay_order_id || null,
      created_at: booking.createdAt,
      updated_at: booking.updatedAt,
    }));

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

/**
 * Delete/Cancel order and mark payment status as failed
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

    // Check if payment is already failed or cancelled
    if (booking.payment.status === PaymentStatus.FAILED || booking.payment.status === PaymentStatus.CANCELLED) {
      throw new ApiError(400, 'Order is already cancelled or failed');
    }

    // Update booking: mark payment status as failed and booking status as cancelled
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          status: BookingStatus.CANCELLED,
          'payment.status': PaymentStatus.FAILED,
          'payment.failure_reason': 'Order cancelled by user',
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
          status: TransactionStatus.FAILED,
          source: TransactionSource.USER_VERIFICATION,
        },
      },
      { upsert: false } // Don't create if doesn't exist
    );

    logger.info(`Order cancelled: ${booking.id} for user ${userId}, Razorpay Order ID: ${data.razorpay_order_id}`);

    // Return limited data
    const cancelledBooking: CancelledBookingResponse = {
      id: updatedBooking.id || (updatedBooking._id as any)?.toString() || '',
      booking_id: updatedBooking.booking_id || '',
      status: updatedBooking.status || BookingStatus.CANCELLED,
      amount: updatedBooking.amount || 0,
      currency: updatedBooking.currency || 'INR',
      payment: {
        razorpay_order_id: updatedBooking.payment?.razorpay_order_id || data.razorpay_order_id,
        status: updatedBooking.payment?.status || PaymentStatus.FAILED,
        failure_reason: updatedBooking.payment?.failure_reason || 'Order cancelled by user',
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


