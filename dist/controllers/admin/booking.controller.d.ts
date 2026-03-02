import { Request, Response, NextFunction } from 'express';
/**
 * Get all bookings for admin
 */
export declare const getAllBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking by ID for admin
 */
export declare const getBookingById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update booking status by admin
 */
export declare const updateBookingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete booking by admin
 */
export declare const deleteBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking statistics for admin dashboard
 */
export declare const getBookingStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Download booking invoice as PDF
 */
export declare const downloadBookingInvoice: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map