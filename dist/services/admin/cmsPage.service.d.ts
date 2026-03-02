import { CmsPage, CmsPagePlatform } from '../../models/cmsPage.model';
export interface GetAdminCmsPagesParams {
    page?: number;
    limit?: number;
    slug?: string;
    platform?: CmsPagePlatform;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminCmsPageListItem {
    id: string;
    slug: string;
    title: string;
    content: string;
    platform: CmsPagePlatform;
    isActive: boolean;
    version: number;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CmsPagesListResult {
    pages: AdminCmsPageListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CreateCmsPageInput {
    slug: string;
    title: string;
    content: string;
    platform?: CmsPagePlatform;
    isActive?: boolean;
    version?: number;
}
export interface UpdateCmsPageInput {
    slug?: string;
    title?: string;
    content?: string;
    platform?: CmsPagePlatform;
    isActive?: boolean;
    version?: number;
}
/**
 * Get all CMS pages for admin with filters and pagination
 */
export declare const getAllCmsPages: (params?: GetAdminCmsPagesParams) => Promise<CmsPagesListResult>;
/**
 * Get CMS page by ID for admin
 */
export declare const getCmsPageById: (id: string) => Promise<CmsPage | null>;
/**
 * Get CMS page by slug
 */
export declare const getCmsPageBySlug: (slug: string) => Promise<CmsPage | null>;
/**
 * Create new CMS page
 */
export declare const createCmsPage: (data: CreateCmsPageInput, adminId?: string) => Promise<CmsPage>;
/**
 * Update CMS page
 */
export declare const updateCmsPage: (id: string, data: UpdateCmsPageInput, adminId?: string) => Promise<CmsPage | null>;
/**
 * Delete CMS page (soft delete)
 */
export declare const deleteCmsPage: (id: string, adminId?: string) => Promise<boolean>;
//# sourceMappingURL=cmsPage.service.d.ts.map