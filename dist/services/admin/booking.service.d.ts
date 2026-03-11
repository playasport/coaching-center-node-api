import { Booking, PaymentStatus, BookingStatus } from '../../models/booking.model';
export interface GetAdminBookingsParams {
    page?: number;
    limit?: number;
    userId?: string;
    centerId?: string;
    batchId?: string;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminBookingListItem {
    booking_id: string;
    id: string;
    user_name: string;
    student_name: string;
    batch_name: string;
    center_name: string;
    sport_name: string;
    amount: number;
    payment_status: string;
    payment_method: string | null;
    invoice_id: string | null;
    status: string;
    created_at: Date;
}
export interface AdminPaginatedBookingsResult {
    bookings: AdminBookingListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface BookingStats {
    total: number;
    byStatus: Record<string, number>;
    byPaymentStatus: Record<string, number>;
    totalAmount: number;
    amountByPaymentStatus: Record<string, number>;
    byPaymentMethod: Record<string, number>;
}
/**
 * Get all bookings for admin with filters and pagination
 */
export declare const getAllBookings: (params?: GetAdminBookingsParams) => Promise<AdminPaginatedBookingsResult>;
/**
 * Get booking by ID for admin
 */
export declare const getBookingById: (id: string) => Promise<Booking | null>;
/**
 * Update booking status by admin
 */
export declare const updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<Booking | null>;
/**
 * Soft delete booking by admin
 */
export declare const deleteBooking: (id: string) => Promise<void>;
/**
 * Get booking statistics for admin dashboard
 */
export declare const getBookingStats: (params?: {
    startDate?: string;
    endDate?: string;
}) => Promise<BookingStats>;
//# sourceMappingURL=booking.service.d.ts.map