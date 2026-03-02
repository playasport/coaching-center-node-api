import { BookingStatus, PaymentStatus } from '../../models/booking.model';
import { Gender } from '../../enums/gender.enum';
/**
 * Generate unique booking ID (format: PS-YYYY-NNNN)
 * Example: PS-2024-0001, PS-2024-0002, etc.
 */
export declare const generateBookingId: () => Promise<string>;
/**
 * Round number to 2 decimal places
 */
export declare const roundToTwoDecimals: (value: number) => number;
/**
 * Calculate age from date of birth
 * Exported for use in other services
 */
export declare const calculateAge: (dob: Date, currentDate: Date) => number;
/**
 * Map participant gender to Gender enum (now gender is already a string, so just return it)
 * Participant gender is now stored as string: 'male', 'female', 'other'
 */
export declare const mapParticipantGenderToEnum: (gender: string | null | undefined) => Gender | null;
/**
 * Get user-friendly status message based on booking status and payment status
 */
export declare const getBookingStatusMessage: (bookingStatus: BookingStatus, paymentStatus: PaymentStatus) => string;
/**
 * Check if payment link should be enabled based on booking and payment status
 * Includes CANCELLED and FAILED so user can retry payment
 */
export declare const isPaymentLinkEnabled: (bookingStatus: BookingStatus, paymentStatus: PaymentStatus) => boolean;
/**
 * Check if status fields should be hidden for CANCELLED bookings
 * Hide status and payment_status when booking is CANCELLED, unless payment status is SUCCESS, FAILED, REFUNDED, or CANCELLED
 */
export declare const shouldHideStatusForCancelled: (bookingStatus: BookingStatus, paymentStatus: PaymentStatus) => boolean;
/**
 * Check if booking can be cancelled
 * Can cancel when:
 * - Status is NOT CANCELLED
 * - Status is NOT COMPLETED
 * - Status is NOT CONFIRMED
 * - Payment status is NOT SUCCESS
 */
export declare const canCancelBooking: (bookingStatus: BookingStatus, paymentStatus: PaymentStatus) => boolean;
/**
 * Check if invoice can be downloaded for a booking
 * Invoice can only be downloaded if payment is successful
 */
export declare const canDownloadInvoice: (_bookingStatus: BookingStatus, paymentStatus: PaymentStatus) => boolean;
//# sourceMappingURL=booking.helpers.utils.d.ts.map