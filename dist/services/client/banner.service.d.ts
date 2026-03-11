import { Banner, BannerPosition } from '../../models/banner.model';
/**
 * Get active banners by position (for public/user API)
 * Returns only active banners that are currently scheduled and match the position
 */
export declare const getActiveBannersByPosition: (position: BannerPosition, options?: {
    sportId?: string;
    centerId?: string;
    limit?: number;
    targetAudience?: string;
    academyOnly?: boolean;
}) => Promise<Banner[]>;
/**
 * Track banner view (increment viewCount)
 */
export declare const trackBannerView: (bannerId: string) => Promise<void>;
/**
 * Track banner click (increment clickCount)
 */
export declare const trackBannerClick: (bannerId: string) => Promise<void>;
//# sourceMappingURL=banner.service.d.ts.map