import { Request, Response, NextFunction } from 'express';
/**
 * Get bookings for academy
 */
export declare const getBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get booking by ID
 */
export declare const getBookingById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Approve booking request
 */
export declare const approveBookingRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reject booking request
 */
export declare const rejectBookingRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export bookings for academy
 */
export declare const exportBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map