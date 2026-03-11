import { Request, Response, NextFunction } from 'express';
/**
 * Get payouts for academy (list with basic data)
 */
export declare const getPayouts: (req: Request, res: Response) => Promise<void>;
/**
 * Get payout details by ID for academy
 */
export declare const getPayoutById: (req: Request, res: Response) => Promise<void>;
/**
 * Get payout statistics for academy
 */
export declare const getPayoutStats: (req: Request, res: Response) => Promise<void>;
/**
 * Download payout invoice as PDF
 */
export declare const downloadPayoutInvoice: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=payout.controller.d.ts.map