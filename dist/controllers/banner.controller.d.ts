import { Request, Response, NextFunction } from 'express';
/**
 * Get active banners by position (public endpoint)
 */
export declare const getBannersByPosition: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Track banner view
 */
export declare const trackBannerView: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Track banner click
 */
export declare const trackBannerClick: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=banner.controller.d.ts.map