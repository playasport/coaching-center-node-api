import { Types } from 'mongoose';
import { StreamHighlight, HighlightStatus, VideoProcessingStatus } from '../../models/streamHighlight.model';
export interface GetAdminHighlightsParams {
    page?: number;
    limit?: number;
    status?: HighlightStatus;
    videoProcessingStatus?: VideoProcessingStatus;
    coachingCenterId?: string;
    userId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminHighlightListItem {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    videoUrl: string;
    duration: number;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    status: string;
    userId: Types.ObjectId;
    coachingCenterId: Types.ObjectId | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface AdminPaginatedHighlightsResult {
    highlights: AdminHighlightListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CreateHighlightInput {
    title: string;
    description?: string | null;
    videoUrl: string;
    thumbnailUrl?: string | null;
    userId: string;
    coachingCenterId?: string | null;
    duration?: number;
    metadata?: Record<string, any> | null;
}
export interface UpdateHighlightInput {
    title?: string;
    description?: string | null;
    videoUrl?: string;
    thumbnailUrl?: string | null;
    userId?: string;
    coachingCenterId?: string | null;
    status?: HighlightStatus;
    duration?: number;
    metadata?: Record<string, any> | null;
}
/**
 * Get all highlights for admin with filters and pagination
 */
export declare const getAllHighlights: (params?: GetAdminHighlightsParams) => Promise<AdminPaginatedHighlightsResult>;
/**
 * Get highlight by ID for admin
 */
export declare const getHighlightById: (id: string) => Promise<StreamHighlight | null>;
/**
 * Create new highlight
 */
export declare const createHighlight: (data: CreateHighlightInput, adminId: string) => Promise<StreamHighlight>;
/**
 * Update highlight by admin
 */
export declare const updateHighlight: (id: string, data: UpdateHighlightInput, adminId: string) => Promise<StreamHighlight | null>;
/**
 * Update preview video URL for a highlight
 */
export declare const updateHighlightPreview: (id: string, previewUrl: string, adminId: string) => Promise<StreamHighlight | null>;
/**
 * Delete highlight (soft delete)
 */
export declare const deleteHighlight: (id: string, adminId: string) => Promise<boolean>;
/**
 * Reprocess video for a highlight
 * This will process the video again regardless of current processing status
 */
export declare const reprocessHighlightVideo: (id: string, adminId: string) => Promise<{
    message: string;
    highlight: StreamHighlight;
}>;
/**
 * Update highlight status
 */
export declare const updateHighlightStatus: (id: string, status: HighlightStatus, adminId: string) => Promise<StreamHighlight | null>;
//# sourceMappingURL=highlight.service.d.ts.map