import { Banner, BannerStatus, BannerPosition, BannerTargetAudience } from '../../models/banner.model';
export interface GetAdminBannersParams {
    page?: number;
    limit?: number;
    position?: BannerPosition;
    status?: BannerStatus;
    targetAudience?: BannerTargetAudience;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminBannerListItem {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
    mobileImageUrl: string | null;
    linkUrl: string | null;
    position: string;
    priority: number;
    status: string;
    targetAudience: string;
    isActive: boolean;
    clickCount: number;
    viewCount: number;
    createdAt: Date;
}
export interface AdminPaginatedBannersResult {
    banners: AdminBannerListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CreateBannerInput {
    title: string;
    description?: string | null;
    imageUrl: string;
    mobileImageUrl?: string | null;
    linkUrl?: string | null;
    linkType?: 'internal' | 'external' | null;
    position: BannerPosition;
    priority?: number;
    status?: BannerStatus;
    targetAudience?: BannerTargetAudience;
    isActive?: boolean;
    isOnlyForAcademy?: boolean;
    sportIds?: string[] | null;
    centerIds?: string[] | null;
    metadata?: Record<string, any> | null;
}
export interface UpdateBannerInput {
    title?: string;
    description?: string | null;
    imageUrl?: string;
    mobileImageUrl?: string | null;
    linkUrl?: string | null;
    linkType?: 'internal' | 'external' | null;
    position?: BannerPosition;
    priority?: number;
    status?: BannerStatus;
    targetAudience?: BannerTargetAudience;
    isActive?: boolean;
    isOnlyForAcademy?: boolean;
    sportIds?: string[] | null;
    centerIds?: string[] | null;
    metadata?: Record<string, any> | null;
}
/**
 * Get all banners for admin with filters and pagination
 */
export declare const getAllBanners: (params?: GetAdminBannersParams) => Promise<AdminPaginatedBannersResult>;
/**
 * Get banner by ID for admin
 */
export declare const getBannerById: (id: string) => Promise<Banner | null>;
/**
 * Create new banner
 */
export declare const createBanner: (data: CreateBannerInput, adminId?: string) => Promise<Banner>;
/**
 * Update banner by admin
 */
export declare const updateBanner: (id: string, data: UpdateBannerInput, adminId?: string) => Promise<Banner | null>;
/**
 * Delete banner (soft delete)
 */
export declare const deleteBanner: (id: string) => Promise<void>;
/**
 * Update banner status
 */
export declare const updateBannerStatus: (id: string, status: BannerStatus, adminId?: string) => Promise<Banner | null>;
/**
 * Reorder banners (update priorities)
 */
export declare const reorderBanners: (bannerOrders: Array<{
    id: string;
    priority: number;
}>, adminId?: string) => Promise<void>;
/**
 * Get active banners by position (for public API)
 */
export declare const getActiveBannersByPosition: (position: BannerPosition, options?: {
    sportId?: string;
    centerId?: string;
    limit?: number;
}) => Promise<Banner[]>;
//# sourceMappingURL=banner.service.d.ts.map