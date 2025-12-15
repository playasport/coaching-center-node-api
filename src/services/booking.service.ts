import { Types } from 'mongoose';
import { BookingModel, Booking, PaymentStatus, BookingStatus } from '../models/booking.model';
import { TransactionModel, TransactionType, TransactionStatus, TransactionSource } from '../models/transaction.model';
import { BatchModel } from '../models/batch.model';
import { ParticipantModel } from '../models/participant.model';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import { BatchStatus } from '../enums/batchStatus.enum';
import { Gender } from '../enums/gender.enum';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { getUserObjectId } from '../utils/userCache';
import { getPaymentService } from './payment/PaymentService';
import { config } from '../config/env';
import type { BookingSummaryInput, CreateOrderInput, VerifyPaymentInput, DeleteOrderInput } from '../validations/booking.validation';
import {
  sendBookingConfirmationUserEmail,
  sendBookingConfirmationCenterEmail,
  sendBookingConfirmationAdminEmail,
} from './email.service';
import {
  sendBookingConfirmationUserSms,
  sendBookingConfirmationCenterSms,
} from './sms.service';

// Get payment service instance
const paymentService = getPaymentService();

/**
 * Generate unique booking ID (format: BK-YYYY-NNNN)
 * Example: BK-2024-0001, BK-2024-0002, etc.
 */
export const generateBookingId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;

  // Find the highest booking_id for this year
  const lastBooking = await BookingModel.findOne({
    booking_id: { $regex: `^${prefix}` },
  })
    .sort({ booking_id: -1 })
    .select('booking_id')
    .lean();

  let sequence = 1;
  if (lastBooking && lastBooking.booking_id) {
    // Extract sequence number from last booking_id (e.g., BK-2024-0123 -> 123)
    const lastSequence = parseInt(lastBooking.booking_id.replace(prefix, ''), 10);
    if (!isNaN(lastSequence)) {
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
    fee_structure?: any;
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
export type RazorpayOrderResponse = import('./payment/interfaces/IPaymentGateway').PaymentOrderResponse;

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
    .populate('sport', 'id name')
    .populate('center', 'id center_name logo')
    .lean();

  if (!batch || batch.is_deleted || !batch.is_active) {
    throw new ApiError(404, 'Batch not found or inactive');
  }

  // Check if batch is published
  if (batch.status !== BatchStatus.PUBLISHED) {
    throw new ApiError(400, 'Batch is not available for booking');
  }

  // Fetch coaching center details for validation
  const centerId = (batch.center as any)._id || (batch.center as any).id;
  const coachingCenter = await CoachingCenterModel.findById(centerId).lean();

  if (!coachingCenter || coachingCenter.is_deleted || !coachingCenter.is_active) {
    throw new ApiError(404, 'Coaching center not found or inactive');
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
  const existingBookings = await BookingModel.find({
    batch: batchId,
    participants: { $in: participantIds },
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    is_deleted: false,
  })
    .populate('participants', 'firstName lastName')
    .lean();

  if (existingBookings.length > 0) {
    // Find which participants are already enrolled
    const enrolledParticipantIds = new Set<string>();
    const participantNames: string[] = [];

    for (const booking of existingBookings) {
      for (const bookingParticipantId of booking.participants) {
        const participantIdStr = (bookingParticipantId as any)._id?.toString() || (bookingParticipantId as any).toString();
        if (participantIds.some(id => id.toString() === participantIdStr)) {
          enrolledParticipantIds.add(participantIdStr);
          const participant = booking.participants.find((p: any) => {
            const pId = p._id?.toString() || p.toString();
            return pId === participantIdStr;
          });
          if (participant) {
            const name = (participant as any).firstName || (participant as any).lastName 
              ? `${(participant as any).firstName || ''} ${(participant as any).lastName || ''}`.trim()
              : participantIdStr;
            participantNames.push(name);
          }
        }
      }
    }

    if (enrolledParticipantIds.size > 0) {
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
 * Common validation: Validate slot availabilityo
 */
const validateSlotAvailability = async (
  batch: any,
  requestedSlots: number
): Promise<void> => {
  const existingBookings = await BookingModel.find({
    batch: batch._id,
    status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    is_deleted: false,
  }).lean();

  // Count total participants in existing bookings
  let totalBookedParticipants = 0;
  for (const booking of existingBookings) {
    totalBookedParticipants += booking.participants.length;
  }

  // Check if adding new participants would exceed capacity
  const totalAfterBooking = totalBookedParticipants + requestedSlots;

  if (batch.capacity.max !== null && batch.capacity.max !== undefined && totalAfterBooking > batch.capacity.max) {
    const availableSlots = batch.capacity.max - totalBookedParticipants;
    throw new ApiError(400, `Insufficient slots available. Only ${availableSlots} slot(s) remaining. Requested: ${requestedSlots}`);
  }
};

/**
 * Common validation: Validate participant eligibility (age, gender, disability)
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
    if (participant.gender !== null && participant.gender !== undefined) {
      const participantGender = mapParticipantGenderToEnum(participant.gender);

      if (participantGender && coachingCenter.allowed_genders && coachingCenter.allowed_genders.length > 0) {
        if (!coachingCenter.allowed_genders.includes(participantGender)) {
          const allowedGendersStr = coachingCenter.allowed_genders.join(', ');
          throw new ApiError(
            400,
            `Participant ${participant.firstName || participant._id} gender (${participantGender}) is not allowed. Allowed genders: ${allowedGendersStr}`
          );
        }
      }
    }

    // Disability Validation
    const hasDisability = participant.disability === 1;

    if (coachingCenter.is_only_for_disabled) {
      // Center is only for disabled participants
      if (!hasDisability) {
        throw new ApiError(
          400,
          `Participant ${participant.firstName || participant._id} does not have a disability. This coaching center is only for disabled participants.`
        );
      }
    } else {
      // Center is not only for disabled
      if (!coachingCenter.allowed_disabled && hasDisability) {
        throw new ApiError(
          400,
          `Participant ${participant.firstName || participant._id} has a disability. This coaching center does not allow disabled participants.`
        );
      }
    }
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

    // Validate participants using common function
    const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
    const participants = await validateAndFetchParticipants(participantIds, userObjectId);

    // Validate batch and coaching center using common function
    const { batch, coachingCenter } = await validateBatchAndCenter(data.batchId);

    // Validate slot availability using common function
    await validateSlotAvailability(batch, participants.length);

    // Validate participant eligibility (age, gender, disability) using common function
    await validateParticipantEligibility(participants, batch, coachingCenter);

    // Validate if participants are already enrolled in this batch
    const participantObjectIds = participants.map(p => p._id);
    await validateParticipantEnrollment(participantObjectIds, batch._id);

    // Calculate amount
    const admissionFeePerParticipant = batch.admission_fee || 0;
    let baseFee = 0;

    // Calculate base fee from fee_structure if available
    if (batch.fee_structure) {
      // This is a simplified calculation - you may need to adjust based on your fee structure logic
      const feeConfig = batch.fee_structure.fee_configuration;
      if (feeConfig && typeof feeConfig === 'object') {
        // Try to get base_price from fee_configuration
        if ('base_price' in feeConfig && typeof feeConfig.base_price === 'number') {
          baseFee = feeConfig.base_price;
        } else if ('price' in feeConfig && typeof feeConfig.price === 'number') {
          baseFee = feeConfig.price;
        }
      }
    }

    const perParticipantFee = baseFee;
    const participantCount = participants.length;

    // Calculate base amount: (admission fee + base fee) * participant count
    const totalAdmissionFee = roundToTwoDecimals(admissionFeePerParticipant * participantCount);
    const totalBaseFee = roundToTwoDecimals(perParticipantFee * participantCount);
    const baseAmount = roundToTwoDecimals(totalAdmissionFee + totalBaseFee);

    // Platform fee (from config, default 200)
    const platformFee = config.booking.platformFee;

    // Subtotal before GST
    const subtotal = roundToTwoDecimals(baseAmount + platformFee);

    // GST calculation (from config, default 18%)
    const gstPercentage = config.booking.gstPercentage;
    const gst = roundToTwoDecimals((subtotal * gstPercentage) / 100);

    // Total amount including GST
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
        fee_structure: batch.fee_structure,
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
        admission_fee: totalAdmissionFee > 0 ? roundToTwoDecimals(totalAdmissionFee) : undefined,
        base_fee: baseFee > 0 ? roundToTwoDecimals(baseFee) : undefined,
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
    });
    throw new ApiError(500, 'Failed to get booking summary');
  }
};

/**
 * Create Razorpay order and booking record
 */
export const createOrder = async (
  data: CreateOrderInput,
  userId: string
): Promise<{ booking: Booking; razorpayOrder: RazorpayOrderResponse }> => {
  try {
    // Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get booking summary to calculate amount
    const summary = await getBookingSummary(
      {
        batchId: data.batchId,
        participantIds: data.participantIds,
      },
      userId
    );

    // All validations are done in getBookingSummary, but we also validate here for safety
    // Validate participants using common function
    const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
    const participants = await validateAndFetchParticipants(participantIds, userObjectId);

    // Validate batch and coaching center using common function
    const { batch, coachingCenter } = await validateBatchAndCenter(data.batchId);

    // Validate slot availability using common function
    await validateSlotAvailability(batch, participants.length);

    // Validate participant eligibility (age, gender, disability) using common function
    await validateParticipantEligibility(participants, batch, coachingCenter);

    // Validate if participants are already enrolled in this batch
    const participantObjectIds = participants.map(p => p._id);
    await validateParticipantEnrollment(participantObjectIds, batch._id);

    // Create payment order using payment service
    const orderData = {
      amount: Math.round(summary.amount * 100), // Convert to paise (multiply by 100)
      currency: summary.currency,
      receipt: `booking_${Date.now()}_${userObjectId.toString().slice(-6)}`,
      notes: {
        userId: userId,
        participantIds: data.participantIds,
        batchId: data.batchId,
        centerId: (batch.center as any)._id?.toString() || (batch.center as any).id,
        sportId: (batch.sport as any)._id?.toString() || (batch.sport as any).id,
      },
    };

    const paymentOrder = await paymentService.createOrder(orderData);

    // Generate unique booking ID
    const bookingId = await generateBookingId();

    // Create booking record
    const bookingData: any = {
      user: userObjectId,
      participants: participantObjectIds,
      batch: batch._id,
      center: (batch.center as any)._id,
      sport: (batch.sport as any)._id,
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
    await booking.save();

    // Create transaction record
    const transactionData: any = {
      booking: booking._id,
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

    const transaction = new TransactionModel(transactionData);
    await transaction.save();

    logger.info(`Booking created: ${booking.id} for user ${userId}, Transaction: ${transaction.id}`);

    // Populate booking before returning
    const populatedBooking = await BookingModel.findById(booking._id)
      .populate('user', 'id firstName lastName email')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .lean();

    return {
      booking: populatedBooking as Booking,
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
    const isValidSignature = paymentService.verifyPaymentSignature(
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

    // Send confirmation emails to user, coaching center, and admin
    try {
      // Fetch batch details for scheduled information
      // Use the original booking's batch ID (ObjectId) before population
      const batchId = booking.batch;
      const batchDetails = await BatchModel.findById(batchId).lean();
      
      if (!batchDetails) {
        logger.warn(`Batch not found for booking ${booking.id}`);
      } else {
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

        // Prepare email data
        const emailData = {
          bookingId: updatedBooking.id,
          batchName,
          sportName,
          centerName,
          userName,
          userEmail: userEmail || undefined,
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          trainingDays,
          amount: updatedBooking.amount,
          currency: updatedBooking.currency,
          paymentId: data.razorpay_payment_id,
        };

        // Send emails in parallel (don't wait for all to complete)
        const emailPromises: Promise<string>[] = [];

        // Send email to user
        if (userEmail) {
          emailPromises.push(
            sendBookingConfirmationUserEmail(userEmail, emailData).catch((error) => {
              logger.error('Failed to send booking confirmation email to user', {
                bookingId: booking.id,
                userEmail,
                error: error instanceof Error ? error.message : error,
              });
              return 'Failed';
            })
          );
        }

        // Send email to coaching center
        if (centerEmail) {
          emailPromises.push(
            sendBookingConfirmationCenterEmail(centerEmail, emailData).catch((error) => {
              logger.error('Failed to send booking confirmation email to coaching center', {
                bookingId: booking.id,
                centerEmail,
                error: error instanceof Error ? error.message : error,
              });
              return 'Failed';
            })
          );
        }

        // Send email to admin
        if (config.admin.email) {
          emailPromises.push(
            sendBookingConfirmationAdminEmail(config.admin.email, emailData).catch((error) => {
              logger.error('Failed to send booking confirmation email to admin', {
                bookingId: booking.id,
                adminEmail: config.admin.email,
                error: error instanceof Error ? error.message : error,
              });
              return 'Failed';
            })
          );
        }

        // Wait for all emails to be sent (but don't fail if email sending fails)
        await Promise.allSettled(emailPromises);
        logger.info(`Booking confirmation emails sent for booking: ${booking.id}`);

        // Prepare SMS data
        const smsData = {
          bookingId: updatedBooking.id,
          batchName,
          sportName,
          centerName,
          userName,
          participants: participantNames,
          startDate,
          startTime,
          endTime,
          amount: updatedBooking.amount,
          currency: updatedBooking.currency,
        };

        // Send SMS notifications
        try {
          // Send SMS to user
          if (userMobile) {
            sendBookingConfirmationUserSms(userMobile, smsData);
          } else {
            logger.warn('User mobile number not available for SMS', {
              bookingId: booking.id,
            });
          }

          // Send SMS to coaching center
          if (centerMobile) {
            sendBookingConfirmationCenterSms(centerMobile, smsData);
          } else {
            logger.warn('Coaching center mobile number not available for SMS', {
              bookingId: booking.id,
            });
          }

          logger.info(`Booking confirmation SMS sent for booking: ${booking.id}`);
        } catch (smsError) {
          // Log error but don't fail the payment verification
          logger.error('Error sending booking confirmation SMS', {
            bookingId: booking.id,
            error: smsError instanceof Error ? smsError.message : smsError,
          });
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the payment verification
      logger.error('Error sending booking confirmation notifications', {
        bookingId: booking.id,
        error: notificationError instanceof Error ? notificationError.message : notificationError,
      });
    }

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

    // Build query
    const query: any = {
      user: userObjectId,
      is_deleted: false,
    };

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

    // Get bookings with populated data
    const bookings = await BookingModel.find(query)
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
      .lean();

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
      .populate('user', 'id firstName lastName email')
      .populate('participants', 'id firstName lastName')
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
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

    return updatedBooking as Booking;
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

