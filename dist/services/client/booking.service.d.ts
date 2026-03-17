import { PaymentStatus, BookingStatus } from '../../models/booking.model';
import type { BookingSummaryInput, VerifyPaymentInput, DeleteOrderInput, BookSlotInput } from '../../validations/booking.validation';
import { generateBookingId, calculateAge } from './booking.helpers.utils';
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
export { calculateAge };
/**
 * Get booking summary before creating order
 */
export declare const getBookingSummary: (data: BookingSummaryInput, userId: string) => Promise<BookingSummaryResponse>;
/**
 * Book slot - Create booking request (new flow)
 * This creates a booking with SLOT_BOOKED status, occupies slots, and sends notifications
 */
export declare const bookSlot: (data: BookSlotInput, userId: string) => Promise<BookSlotResponse>;
/**
 * Create payment order after academy approval
 * This is called after academy approves the booking request
 */
export declare const createPaymentOrder: (bookingId: string, userId: string) => Promise<PaymentOrderResponse>;
/** Response for public pay-by-token page (no auth). Same shape as list item + token_expires_at, razorpay_key_id. */
export interface PublicPayBookingResponse {
    id: string;
    booking_id: string;
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
    participants: Array<{
        id: string;
        firstName: string;
        lastName: string;
        age?: number | null;
        profilePhoto?: string | null;
    }>;
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
    amount: number;
    currency: string;
    status: BookingStatus;
    status_message: string;
    payment_status: PaymentStatus | string;
    payment_enabled: boolean;
    can_download_invoice: boolean;
    rejection_reason?: string | null;
    cancellation_reason?: string | null;
    token_expires_at: Date | null;
    razorpay_key_id: string;
}
/**
 * Get booking by payment token for public pay page (no auth).
 * Returns booking details and payment_enabled so frontend can show Pay button or already paid/cancelled/expired state.
 */
export declare const getBookingByPaymentToken: (token: string) => Promise<PublicPayBookingResponse>;
/**
 * Create Razorpay order by payment token (public, no auth).
 * Use when user clicks Pay on the public pay page. Webhook will verify payment.
 */
export declare const createOrderByPaymentToken: (token: string) => Promise<PaymentOrderResponse>;
/**
 * Verify Razorpay payment and update booking status
 */
export declare const verifyPayment: (data: VerifyPaymentInput, userId: string) => Promise<VerifiedPaymentResponse>;
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
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
        age?: number | null;
        profilePhoto?: string | null;
    }>;
    amount: number;
    currency: string;
    status: BookingStatus;
    status_message: string;
    payment_status: PaymentStatus | string;
    can_download_invoice: boolean;
    payment_enabled: boolean;
    rejection_reason?: string | null;
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
export declare const getUserBookings: (userId: string, params?: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
}) => Promise<UserBookingsResult>;
export interface BookingDetailsResponse {
    id: string;
    booking_id: string;
    status: BookingStatus;
    amount: number;
    currency: string;
    payment: {
        razorpay_order_id?: string | null;
        status: PaymentStatus | string;
        payment_method?: string | null;
        paid_at?: Date | null;
        failure_reason?: string | null;
    };
    payment_enabled: boolean;
    can_cancel: boolean;
    can_download_invoice: boolean;
    rejection_reason?: string | null;
    cancellation_reason?: string | null;
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
            longitude?: number | null;
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
        middleName?: string | null;
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
export declare const getBookingDetails: (bookingId: string, userId: string) => Promise<BookingDetailsResponse>;
/**
 * Download booking invoice as PDF (user-side)
 */
export declare const downloadBookingInvoice: (bookingId: string, userId: string) => Promise<Buffer>;
/**
 * Cancel payment order (only updates payment status, does not cancel booking)
 * Used when user initiates payment but cancels it before completing
 */
export declare const deleteOrder: (data: DeleteOrderInput, userId: string) => Promise<CancelledBookingResponse>;
/**
 * Cancel booking by user with reason
 * Prevents cancellation after payment success
 */
export declare const cancelBooking: (bookingId: string, reason: string, userId: string) => Promise<CancelBookingResponse>;
/** Default reason when system auto-cancels due to payment not completed in time */
export declare const PAYMENT_EXPIRED_CANCELLATION_REASON = "Payment not completed within the allowed time. Your booking has been automatically cancelled.";
/**
 * Cancel an approved booking by system (e.g. payment link expired). Sends same notifications as user cancellation.
 * Used by the booking payment expiry cron job.
 */
export declare const cancelBookingBySystem: (bookingId: string, reason?: string) => Promise<void>;
//# sourceMappingURL=booking.service.d.ts.map