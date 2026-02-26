import { BookingModel } from '../../models/booking.model';
import { BookingStatus, PaymentStatus } from '../../models/booking.model';
import { Gender } from '../../enums/gender.enum';

/**
 * Generate unique booking ID (format: PS-YYYY-NNNN)
 * Example: PS-2024-0001, PS-2024-0002, etc.
 */
export const generateBookingId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PS-${year}-`;

  // Find the highest booking_id for this year using prefix match (more efficient than regex)
  // Using $gte and $lt for better index utilization
  const nextYearPrefix = `PS-${year + 1}-`;
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
    // Extract sequence number from last booking_id (e.g., PS-2024-0123 -> 123)
    const lastSequence = parseInt(lastBooking.booking_id.replace(prefix, ''), 10);
    if (!isNaN(lastSequence) && lastSequence >= 0) {
      sequence = lastSequence + 1;
    }
  }

  // Format sequence with leading zeros (4 digits)
  const formattedSequence = sequence.toString().padStart(4, '0');
  return `${prefix}${formattedSequence}`;
};

/**
 * Round number to 2 decimal places
 */
export const roundToTwoDecimals = (value: number): number => {
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
export const mapParticipantGenderToEnum = (gender: string | null | undefined): Gender | null => {
  if (!gender) return null;
  // Gender is already a string enum value, just validate and return
  if (Object.values(Gender).includes(gender as Gender)) {
    return gender as Gender;
  }
  return null;
};

/**
 * Get user-friendly status message based on booking status and payment status
 */
export const getBookingStatusMessage = (
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): string => {
  // Handle cancelled bookings first
  if (bookingStatus === BookingStatus.CANCELLED) {
    return 'Your booking has been cancelled.';
  }

  // Handle completed bookings
  if (bookingStatus === BookingStatus.COMPLETED) {
    return 'Your booking has been completed successfully.';
  }

  // Handle rejected bookings
  if (bookingStatus === BookingStatus.REJECTED) {
    return 'Your booking request has been rejected by the academy.';
  }

  // Handle confirmed bookings with successful payment
  if (bookingStatus === BookingStatus.CONFIRMED && paymentStatus === PaymentStatus.SUCCESS) {
    return 'Booking confirmed! Your payment was successful.';
  }

  // Handle approved bookings
  if (bookingStatus === BookingStatus.APPROVED) {
    if (paymentStatus === PaymentStatus.NOT_INITIATED) {
      return 'Your booking has been approved. Please proceed with payment to confirm your booking.';
    }
    if (paymentStatus === PaymentStatus.INITIATED) {
      return 'Payment initiated. Please complete the payment to confirm your booking.';
    }
    if (paymentStatus === PaymentStatus.PENDING || paymentStatus === PaymentStatus.PROCESSING) {
      return 'Payment is being processed. Please wait for confirmation.';
    }
    if (paymentStatus === PaymentStatus.FAILED) {
      return 'Payment failed. Please try again or contact support.';
    }
  }

  // Handle slot booked status (waiting for academy approval)
  if (bookingStatus === BookingStatus.SLOT_BOOKED || bookingStatus === BookingStatus.REQUESTED) {
    if (paymentStatus === PaymentStatus.NOT_INITIATED) {
      return 'Your booking request has been sent. Waiting for academy approval.';
    }
  }

  // Handle payment pending (legacy status)
  if (bookingStatus === BookingStatus.PAYMENT_PENDING || bookingStatus === BookingStatus.PENDING) {
    if (paymentStatus === PaymentStatus.INITIATED) {
      return 'Payment initiated. Please complete the payment.';
    }
    if (paymentStatus === PaymentStatus.PENDING || paymentStatus === PaymentStatus.PROCESSING) {
      return 'Payment is being processed. Please wait for confirmation.';
    }
    if (paymentStatus === PaymentStatus.SUCCESS) {
      return 'Payment successful! Your booking is confirmed.';
    }
    if (paymentStatus === PaymentStatus.FAILED) {
      return 'Payment failed. Please try again.';
    }
    return 'Payment is pending. Please complete the payment.';
  }

  // Handle payment statuses
  if (paymentStatus === PaymentStatus.REFUNDED) {
    return 'Your payment has been refunded.';
  }

  if (paymentStatus === PaymentStatus.CANCELLED) {
    return 'Payment was cancelled.';
  }

  // Default fallback
  return 'Booking is being processed.';
};

/**
 * Check if payment link should be enabled based on booking and payment status
 * Includes CANCELLED and FAILED so user can retry payment
 */
export const isPaymentLinkEnabled = (
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): boolean => {
  const canRetryPayment =
    paymentStatus === PaymentStatus.NOT_INITIATED ||
    paymentStatus === PaymentStatus.INITIATED ||
    paymentStatus === PaymentStatus.CANCELLED || // User cancelled - allow retry
    paymentStatus === PaymentStatus.FAILED; // Payment failed - allow retry

  // 1. Booking is APPROVED - enable payment when not yet paid
  if (bookingStatus === BookingStatus.APPROVED) {
    return canRetryPayment;
  }

  // 2. Booking is PAYMENT_PENDING (legacy) and payment is INITIATED, PENDING, CANCELLED, or FAILED
  if (bookingStatus === BookingStatus.PAYMENT_PENDING || bookingStatus === BookingStatus.PENDING) {
    return (
      paymentStatus === PaymentStatus.INITIATED ||
      paymentStatus === PaymentStatus.PENDING ||
      paymentStatus === PaymentStatus.CANCELLED ||
      paymentStatus === PaymentStatus.FAILED
    );
  }

  // 3. Booking is CONFIRMED - payment link disabled after successful payment
  if (bookingStatus === BookingStatus.CONFIRMED) {
    return paymentStatus !== PaymentStatus.SUCCESS;
  }

  return false;
};

/**
 * Check if status fields should be hidden for CANCELLED bookings
 * Hide status and payment_status when booking is CANCELLED, unless payment status is SUCCESS, FAILED, REFUNDED, or CANCELLED
 */
export const shouldHideStatusForCancelled = (
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): boolean => {
  if (bookingStatus === BookingStatus.CANCELLED) {
    // Show status if payment is completed, failed, refunded, or cancelled
    return !(
      paymentStatus === PaymentStatus.SUCCESS ||
      paymentStatus === PaymentStatus.FAILED ||
      paymentStatus === PaymentStatus.REFUNDED ||
      paymentStatus === PaymentStatus.CANCELLED
    );
  }
  return false;
};

/**
 * Check if booking can be cancelled
 * Can cancel when:
 * - Status is NOT CANCELLED
 * - Status is NOT COMPLETED
 * - Status is NOT CONFIRMED
 * - Payment status is NOT SUCCESS
 */
export const canCancelBooking = (
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): boolean => {
  // Cannot cancel if already cancelled
  if (bookingStatus === BookingStatus.CANCELLED) {
    return false;
  }

  // Cannot cancel if rejected by academy
  if (bookingStatus === BookingStatus.REJECTED) {
    return false;
  }

  // Cannot cancel if completed
  if (bookingStatus === BookingStatus.COMPLETED) {
    return false;
  }

  // Cannot cancel if confirmed
  if (bookingStatus === BookingStatus.CONFIRMED) {
    return false;
  }

  // Cannot cancel if payment is successful
  if (paymentStatus === PaymentStatus.SUCCESS) {
    return false;
  }

  // Can cancel for: SLOT_BOOKED, APPROVED, PAYMENT_PENDING, PENDING
  return true;
};

/**
 * Check if invoice can be downloaded for a booking
 * Invoice can only be downloaded if payment is successful
 */
export const canDownloadInvoice = (
  _bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): boolean => {
  // Invoice can only be downloaded if payment is successful
  return paymentStatus === PaymentStatus.SUCCESS;
};
