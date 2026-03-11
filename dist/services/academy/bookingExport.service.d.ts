import { BookingStatus, PaymentStatus } from '../../models/booking.model';
export interface AcademyBookingExportFilters {
    centerId?: string;
    batchId?: string;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    type?: 'all' | 'confirmed' | 'pending' | 'cancelled' | 'rejected';
}
/**
 * Export bookings to Excel
 */
export declare const exportToExcel: (userId: string, filters?: AcademyBookingExportFilters) => Promise<Buffer>;
/**
 * Export bookings to CSV
 */
export declare const exportToCSV: (userId: string, filters?: AcademyBookingExportFilters) => Promise<string>;
/**
 * Export bookings to PDF
 */
export declare const exportToPDF: (userId: string, filters?: AcademyBookingExportFilters) => Promise<Buffer>;
//# sourceMappingURL=bookingExport.service.d.ts.map