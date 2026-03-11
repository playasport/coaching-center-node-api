"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canDownloadInvoice = exports.canCancelBooking = exports.shouldHideStatusForCancelled = exports.isPaymentLinkEnabled = exports.getBookingStatusMessage = exports.mapParticipantGenderToEnum = exports.calculateAge = exports.roundToTwoDecimals = exports.generateBookingId = void 0;
const booking_model_1 = require("../../models/booking.model");
const booking_model_2 = require("../../models/booking.model");
const gender_enum_1 = require("../../enums/gender.enum");
/**
 * Generate unique booking ID (format: PS-YYYY-NNNN)
 * Example: PS-2024-0001, PS-2024-0002, etc.
 */
const generateBookingId = async () => {
    const year = new Date().getFullYear();
    const prefix = `PS-${year}-`;
    // Find the highest booking_id for this year using prefix match (more efficient than regex)
    // Using $gte and $lt for better index utilization
    const nextYearPrefix = `PS-${year + 1}-`;
    const lastBooking = await booking_model_1.BookingModel.findOne({
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
exports.generateBookingId = generateBookingId;
/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value) => {
    return Math.round(value * 100) / 100;
};
exports.roundToTwoDecimals = roundToTwoDecimals;
/**
 * Calculate age from date of birth
 * Exported for use in other services
 */
const calculateAge = (dob, currentDate) => {
    const birthDate = new Date(dob);
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};
exports.calculateAge = calculateAge;
/**
 * Map participant gender to Gender enum (now gender is already a string, so just return it)
 * Participant gender is now stored as string: 'male', 'female', 'other'
 */
const mapParticipantGenderToEnum = (gender) => {
    if (!gender)
        return null;
    // Gender is already a string enum value, just validate and return
    if (Object.values(gender_enum_1.Gender).includes(gender)) {
        return gender;
    }
    return null;
};
exports.mapParticipantGenderToEnum = mapParticipantGenderToEnum;
/**
 * Get user-friendly status message based on booking status and payment status
 */
const getBookingStatusMessage = (bookingStatus, paymentStatus) => {
    // Handle cancelled bookings first
    if (bookingStatus === booking_model_2.BookingStatus.CANCELLED) {
        return 'Your booking has been cancelled.';
    }
    // Handle completed bookings
    if (bookingStatus === booking_model_2.BookingStatus.COMPLETED) {
        return 'Your booking has been completed successfully.';
    }
    // Handle rejected bookings
    if (bookingStatus === booking_model_2.BookingStatus.REJECTED) {
        return 'Your booking request has been rejected by the academy.';
    }
    // Handle confirmed bookings with successful payment
    if (bookingStatus === booking_model_2.BookingStatus.CONFIRMED && paymentStatus === booking_model_2.PaymentStatus.SUCCESS) {
        return 'Booking confirmed! Your payment was successful.';
    }
    // Handle approved bookings
    if (bookingStatus === booking_model_2.BookingStatus.APPROVED) {
        if (paymentStatus === booking_model_2.PaymentStatus.NOT_INITIATED) {
            return 'Your booking has been approved. Please proceed with payment to confirm your booking.';
        }
        if (paymentStatus === booking_model_2.PaymentStatus.INITIATED) {
            return 'Payment initiated. Please complete the payment to confirm your booking.';
        }
        if (paymentStatus === booking_model_2.PaymentStatus.PENDING || paymentStatus === booking_model_2.PaymentStatus.PROCESSING) {
            return 'Payment is being processed. Please wait for confirmation.';
        }
        if (paymentStatus === booking_model_2.PaymentStatus.FAILED) {
            return 'Payment failed. Please try again or contact support.';
        }
    }
    // Handle slot booked status (waiting for academy approval)
    if (bookingStatus === booking_model_2.BookingStatus.SLOT_BOOKED || bookingStatus === booking_model_2.BookingStatus.REQUESTED) {
        if (paymentStatus === booking_model_2.PaymentStatus.NOT_INITIATED) {
            return 'Your booking request has been sent. Waiting for academy approval.';
        }
    }
    // Handle payment pending (legacy status)
    if (bookingStatus === booking_model_2.BookingStatus.PAYMENT_PENDING || bookingStatus === booking_model_2.BookingStatus.PENDING) {
        if (paymentStatus === booking_model_2.PaymentStatus.INITIATED) {
            return 'Payment initiated. Please complete the payment.';
        }
        if (paymentStatus === booking_model_2.PaymentStatus.PENDING || paymentStatus === booking_model_2.PaymentStatus.PROCESSING) {
            return 'Payment is being processed. Please wait for confirmation.';
        }
        if (paymentStatus === booking_model_2.PaymentStatus.SUCCESS) {
            return 'Payment successful! Your booking is confirmed.';
        }
        if (paymentStatus === booking_model_2.PaymentStatus.FAILED) {
            return 'Payment failed. Please try again.';
        }
        return 'Payment is pending. Please complete the payment.';
    }
    // Handle payment statuses
    if (paymentStatus === booking_model_2.PaymentStatus.REFUNDED) {
        return 'Your payment has been refunded.';
    }
    if (paymentStatus === booking_model_2.PaymentStatus.CANCELLED) {
        return 'Payment was cancelled.';
    }
    // Default fallback
    return 'Booking is being processed.';
};
exports.getBookingStatusMessage = getBookingStatusMessage;
/**
 * Check if payment link should be enabled based on booking and payment status
 * Includes CANCELLED and FAILED so user can retry payment
 */
const isPaymentLinkEnabled = (bookingStatus, paymentStatus) => {
    const canRetryPayment = paymentStatus === booking_model_2.PaymentStatus.NOT_INITIATED ||
        paymentStatus === booking_model_2.PaymentStatus.INITIATED ||
        paymentStatus === booking_model_2.PaymentStatus.CANCELLED || // User cancelled - allow retry
        paymentStatus === booking_model_2.PaymentStatus.FAILED; // Payment failed - allow retry
    // 1. Booking is APPROVED - enable payment when not yet paid
    if (bookingStatus === booking_model_2.BookingStatus.APPROVED) {
        return canRetryPayment;
    }
    // 2. Booking is PAYMENT_PENDING (legacy) and payment is INITIATED, PENDING, CANCELLED, or FAILED
    if (bookingStatus === booking_model_2.BookingStatus.PAYMENT_PENDING || bookingStatus === booking_model_2.BookingStatus.PENDING) {
        return (paymentStatus === booking_model_2.PaymentStatus.INITIATED ||
            paymentStatus === booking_model_2.PaymentStatus.PENDING ||
            paymentStatus === booking_model_2.PaymentStatus.CANCELLED ||
            paymentStatus === booking_model_2.PaymentStatus.FAILED);
    }
    // 3. Booking is CONFIRMED - payment link disabled after successful payment
    if (bookingStatus === booking_model_2.BookingStatus.CONFIRMED) {
        return paymentStatus !== booking_model_2.PaymentStatus.SUCCESS;
    }
    return false;
};
exports.isPaymentLinkEnabled = isPaymentLinkEnabled;
/**
 * Check if status fields should be hidden for CANCELLED bookings
 * Hide status and payment_status when booking is CANCELLED, unless payment status is SUCCESS, FAILED, REFUNDED, or CANCELLED
 */
const shouldHideStatusForCancelled = (bookingStatus, paymentStatus) => {
    if (bookingStatus === booking_model_2.BookingStatus.CANCELLED) {
        // Show status if payment is completed, failed, refunded, or cancelled
        return !(paymentStatus === booking_model_2.PaymentStatus.SUCCESS ||
            paymentStatus === booking_model_2.PaymentStatus.FAILED ||
            paymentStatus === booking_model_2.PaymentStatus.REFUNDED ||
            paymentStatus === booking_model_2.PaymentStatus.CANCELLED);
    }
    return false;
};
exports.shouldHideStatusForCancelled = shouldHideStatusForCancelled;
/**
 * Check if booking can be cancelled
 * Can cancel when:
 * - Status is NOT CANCELLED
 * - Status is NOT COMPLETED
 * - Status is NOT CONFIRMED
 * - Payment status is NOT SUCCESS
 */
const canCancelBooking = (bookingStatus, paymentStatus) => {
    // Cannot cancel if already cancelled
    if (bookingStatus === booking_model_2.BookingStatus.CANCELLED) {
        return false;
    }
    // Cannot cancel if rejected by academy
    if (bookingStatus === booking_model_2.BookingStatus.REJECTED) {
        return false;
    }
    // Cannot cancel if completed
    if (bookingStatus === booking_model_2.BookingStatus.COMPLETED) {
        return false;
    }
    // Cannot cancel if confirmed
    if (bookingStatus === booking_model_2.BookingStatus.CONFIRMED) {
        return false;
    }
    // Cannot cancel if payment is successful
    if (paymentStatus === booking_model_2.PaymentStatus.SUCCESS) {
        return false;
    }
    // Can cancel for: SLOT_BOOKED, APPROVED, PAYMENT_PENDING, PENDING
    return true;
};
exports.canCancelBooking = canCancelBooking;
/**
 * Check if invoice can be downloaded for a booking
 * Invoice can only be downloaded if payment is successful
 */
const canDownloadInvoice = (_bookingStatus, paymentStatus) => {
    // Invoice can only be downloaded if payment is successful
    return paymentStatus === booking_model_2.PaymentStatus.SUCCESS;
};
exports.canDownloadInvoice = canDownloadInvoice;
//# sourceMappingURL=booking.helpers.utils.js.map