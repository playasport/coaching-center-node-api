import { Booking, PaymentStatus, BookingStatus } from '../models/booking.model';
export interface GetAcademyBookingsParams {
    page?: number;
    limit?: number;
    centerId?: string;
    batchId?: string;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
}
export interface BookingListItem {
    booking_id: string;
    id: string;
    user_name: string;
    student_name: string;
    batch_name: string;
    center_name: string;
    amount: number;
    payment_status: string;
    payment_method: string | null;
    invoice_id: string | null;
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
 * Get bookings for academy (coaching centers owned by user)
 */
export declare const getAcademyBookings: (userId: string, params?: GetAcademyBookingsParams) => Promise<PaginatedBookingsResult>;
/**
 * Get booking by ID for academy
 */
export declare const getAcademyBookingById: (bookingId: string, userId: string) => Promise<Booking>;
/**
 * Update booking status for academy
 */
export declare const updateAcademyBookingStatus: (bookingId: string, status: BookingStatus, userId: string) => Promise<Booking>;
//# sourceMappingURL=academyBooking.service.d.ts.map