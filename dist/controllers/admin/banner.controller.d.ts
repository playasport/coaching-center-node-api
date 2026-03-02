import { Request, Response, NextFunction } from 'express';
/**
 * Get all banners for admin
 */
export declare const getAllBanners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get banner by ID for admin
 */
export declare const getBannerById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create new banner
 */
export declare const createBanner: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update banner by admin
 */
export declare const updateBanner: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete banner by admin
 */
export declare const deleteBanner: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update banner status
 */
export declare const updateBannerStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reorder banners (update priorities)
 */
export declare const reorderBanners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=banner.controller.d.ts.map