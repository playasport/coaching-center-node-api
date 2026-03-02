import { Request, Response, NextFunction } from 'express';
/**
 * Get all facilities for admin
 */
export declare const getAllFacilities: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get facility by ID for admin
 */
export declare const getFacilityById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create new facility
 */
export declare const createFacility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update facility by admin
 */
export declare const updateFacility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete facility (soft delete)
 */
export declare const deleteFacility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Restore soft-deleted facility
 */
export declare const restoreFacility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=facility.controller.d.ts.map