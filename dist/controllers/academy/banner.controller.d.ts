import { Request, Response, NextFunction } from 'express';
/**
 * Get banners for coaching center
 * Returns banners that are either general or targeted to this specific center
 */
export declare const getCenterBanners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all banners for coaching center (all positions)
 */
export declare const getAllCenterBanners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=banner.controller.d.ts.map