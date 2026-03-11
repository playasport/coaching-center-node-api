import { Types } from 'mongoose';
import { Reel, ReelStatus } from '../../models/reel.model';
import { VideoProcessingStatus } from '../../models/streamHighlight.model';
export interface GetAdminReelsParams {
    page?: number;
    limit?: number;
    status?: ReelStatus;
    videoProcessingStatus?: VideoProcessingStatus;
    userId?: string;
    sportId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminReelListItem {
    id: string;
    title: string;
    description: string | null;
    thumbnailPath: string | null;
    originalPath: string;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    status: string;
    videoProcessingStatus: string;
    userId: Types.ObjectId | {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    sportIds: Types.ObjectId[] | Array<{
        _id: Types.ObjectId;
        custom_id: string;
        name: string;
        slug: string | null;
        logo: string | null;
        is_active: boolean;
        is_popular: boolean;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
export interface AdminPaginatedReelsResult {
    reels: AdminReelListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
    };
}
export interface CreateReelInput {
    title: string;
    description?: string | null;
    originalPath: string;
    thumbnailPath?: string | null;
    userId: string;
    sportIds?: string[];
}
export interface UpdateReelInput {
    title?: string;
    description?: string | null;
    originalPath?: string;
    thumbnailPath?: string | null;
    userId?: string;
    status?: ReelStatus;
    sportIds?: string[];
}
/**
 * Get all reels for admin with filters and pagination
 */
export declare const getAllReels: (params?: GetAdminReelsParams) => Promise<AdminPaginatedReelsResult>;
/**
 * Get reel by ID for admin
 */
export declare const getReelById: (id: string) => Promise<Reel | null>;
/**
 * Create reel by admin
 */
export declare const createReel: (data: CreateReelInput, adminId: string) => Promise<Reel>;
/**
 * Update reel by admin
 */
export declare const updateReel: (id: string, data: UpdateReelInput, adminId: string) => Promise<Reel | null>;
/**
 * Delete reel (soft delete)
 */
export declare const deleteReel: (id: string, adminId: string) => Promise<boolean>;
/**
 * Update reel status
 */
export declare const updateReelStatus: (id: string, status: ReelStatus, adminId: string) => Promise<Reel | null>;
/**
 * Reprocess video for a reel
 * This will process the video again regardless of current processing status
 */
export declare const reprocessReelVideo: (id: string, adminId: string) => Promise<{
    message: string;
    reel: Reel;
}>;
/**
 * Update preview video URL for a reel
 */
export declare const updateReelPreview: (id: string, previewUrl: string, adminId: string) => Promise<Reel | null>;
//# sourceMappingURL=reel.service.d.ts.map