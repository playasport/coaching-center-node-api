import { Request, Response } from 'express';
/**
 * Get all payouts with filters
 */
export declare const getPayouts: (req: Request, res: Response) => Promise<void>;
/**
 * Get payout by ID
 */
export declare const getPayoutById: (req: Request, res: Response) => Promise<void>;
/**
 * Create transfer for a payout
 */
export declare const createTransfer: (req: Request, res: Response) => Promise<void>;
/**
 * Retry failed transfer
 */
export declare const retryTransfer: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel payout
 */
export declare const cancelPayout: (req: Request, res: Response) => Promise<void>;
/**
 * Get payout statistics
 */
export declare const getPayoutStats: (req: Request, res: Response) => Promise<void>;
/**
 * Create refund for a booking
 */
export declare const createRefund: (req: Request, res: Response) => Promise<void>;
/**
 * Get refund details
 */
export declare const getRefundDetails: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=payout.controller.d.ts.map