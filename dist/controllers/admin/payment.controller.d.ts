import { Request, Response, NextFunction } from 'express';
/**
 * Get all payments for admin
 */
export declare const getAllPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get payment by ID for admin
 */
export declare const getPaymentById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get payment statistics for admin dashboard
 */
export declare const getPaymentStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=payment.controller.d.ts.map