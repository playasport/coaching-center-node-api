import { Booking, PaymentStatus, BookingStatus } from '../../models/booking.model';
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
    student_name: string;
    student_count: number;
    batch_name: string;
    center_name: string;
    amount: number;
    status: BookingStatus;
    status_message: string;
    payment_status: string;
    payout_status: string;
    can_accept_reject: boolean;
    rejection_reason?: string | null;
    cancellation_reason?: string | null;
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
export declare const getAcademyBookings: (userId: string, params?: GetAcademyBookingsParams) => Promise<PaginatedBookingsResult>;
/**
 * Get booking by ID for academy
 */
export declare const getAcademyBookingById: (bookingId: string, userId: string) => Promise<Booking>;
/**
 * Approve booking request (academy confirms the booking)
 */
export declare const approveBookingRequest: (bookingId: string, userId: string) => Promise<AcademyBookingActionResponse>;
/**
 * Reject booking request (academy rejects the booking)
 */
export declare const rejectBookingRequest: (bookingId: string, userId: string, reason: string) => Promise<AcademyBookingActionResponse>;
//# sourceMappingURL=booking.service.d.ts.map