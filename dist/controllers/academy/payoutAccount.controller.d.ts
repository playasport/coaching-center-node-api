import { Request, Response } from 'express';
/**
 * Get payout account for the authenticated academy user
 */
export declare const getPayoutAccount: (req: Request, res: Response) => Promise<void>;
/**
 * Create payout account for the authenticated academy user
 */
export declare const createPayoutAccount: (req: Request, res: Response) => Promise<void>;
/**
 * Update bank details for payout account
 */
export declare const updateBankDetails: (req: Request, res: Response) => Promise<void>;
/**
 * Sync account status from Razorpay
 */
export declare const syncAccountStatus: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=payoutAccount.controller.d.ts.map