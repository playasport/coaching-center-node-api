import { Request, Response, NextFunction } from 'express';
/**
 * Get all transactions for admin
 */
export declare const getAllTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get transaction by ID for admin
 */
export declare const getTransactionById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get transaction statistics for admin dashboard
 */
export declare const getTransactionStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export transactions
 */
export declare const exportTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=transaction.controller.d.ts.map