import { Booking, PaymentStatus, BookingStatus } from '../models/booking.model';
import type { BookingSummaryInput, CreateOrderInput, VerifyPaymentInput, DeleteOrderInput } from '../validations/booking.validation';
/**
 * Generate unique booking ID (format: BK-YYYY-NNNN)
 * Example: BK-2024-0001, BK-2024-0002, etc.
 */
export declare const generateBookingId: () => Promise<string>;
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
export type RazorpayOrderResponse = import('./payment/interfaces/IPaymentGateway').PaymentOrderResponse;
/**
 * Calculate age from date of birth
 * Exported for use in other services
 */
export declare const calculateAge: (dob: Date, currentDate: Date) => number;
/**
 * Get booking summary before creating order
 */
export declare const getBookingSummary: (data: BookingSummaryInput, userId: string) => Promise<BookingSummary>;
/**
 * Create Razorpay order and booking record
 */
export declare const createOrder: (data: CreateOrderInput, userId: string) => Promise<{
    booking: Booking;
    razorpayOrder: RazorpayOrderResponse;
}>;
/**
 * Verify Razorpay payment and update booking status
 */
export declare const verifyPayment: (data: VerifyPaymentInput, userId: string) => Promise<Booking>;
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
export declare const getUserBookings: (userId: string, params?: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
}) => Promise<UserBookingsResult>;
/**
 * Delete/Cancel order and mark payment status as failed
 */
export declare const deleteOrder: (data: DeleteOrderInput, userId: string) => Promise<Booking>;
//# sourceMappingURL=booking.service.d.ts.map