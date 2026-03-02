import { Request, Response, NextFunction } from 'express';
/**
 * Create batch (admin)
 */
export declare const createBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all batches (admin view)
 */
export declare const getAllBatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get batch by ID (admin view)
 */
export declare const getBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get batches by user ID (admin view)
 */
export declare const getBatchesByUserId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get batches by center ID (admin view)
 */
export declare const getBatchesByCenterId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update batch (admin)
 */
export declare const updateBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete batch (admin)
 */
export declare const deleteBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Toggle batch status (admin)
 */
export declare const toggleStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Export all batches to Excel (admin)
 */
export declare const exportBatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Import batches from Excel and bulk update (admin)
 */
export declare const importBatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=batch.controller.d.ts.map