import { Request, Response, NextFunction } from 'express';
/**
 * Get booking summary
 */
export declare const getSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify Razorpay payment
 */
export declare const verifyPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get user bookings list
 */
export declare const getUserBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete/Cancel order
 */
export declare const deleteOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Book slot - Create booking request (new flow)
 */
export declare const bookSlot: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create payment order after academy approval
 */
export declare const createPaymentOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Cancel booking by user with reason
 */
export declare const cancelBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking details by ID
 */
export declare const getBookingDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Download booking invoice as PDF
 */
export declare const downloadInvoice: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map